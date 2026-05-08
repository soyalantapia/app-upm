import type { CountryCode, NewsItem, Topic } from '@/lib/types'
import { NEWS as MOCK_NEWS } from '@/lib/data'
import { fetchCamaraProposicoes } from './camara-br'
import { fetchSenadoBR } from './senado-br'
import { fetchHcdnArgentina } from './hcdn-ar'
import { fetchProyectosColombia, fetchLeyesColombia } from './socrata-co'
import { fetchTratadosColombia } from './tratados-co'
import { fetchParlamentoUY } from './parlamento-uy'

export type SourceStatus = 'live' | 'mock' | 'mixed'

export type SourceReport = {
  id: string
  label: string
  country: CountryCode
  ok: boolean
  count: number
  error?: string
}

export type AggregatedFeed = {
  items: NewsItem[]
  status: SourceStatus
  fetchedAt: string
  sources: SourceReport[]
  byCountry: Record<CountryCode, number>
}

const CACHE_KEY = 'upm.live-feed.v2'
// Cache TTL alto porque las APIs legislativas se mueven lento.
// Con stale-while-revalidate igual hacemos fetch en background si pasaron > 5min.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000  // 24 h (hard expiry, eviction)
const CACHE_FRESH_MS = 5 * 60 * 1000      // 5 min (considerado "fresco" para no revalidar)

type Cached = AggregatedFeed & { _ts: number }

// Devuelve { feed, fresh } donde fresh=true si el cache está dentro de CACHE_FRESH_MS.
// Si superó CACHE_TTL_MS, devuelve null (eviction).
export function readCacheStatus(): { feed: AggregatedFeed; fresh: boolean } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cached
    const age = Date.now() - parsed._ts
    if (age > CACHE_TTL_MS) return null
    return { feed: parsed, fresh: age < CACHE_FRESH_MS }
  } catch {
    return null
  }
}

function readCache(): AggregatedFeed | null {
  return readCacheStatus()?.feed ?? null
}

function writeCache(c: AggregatedFeed) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...c, _ts: Date.now() }))
  } catch {
    // ignore
  }
}

function dedupe(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>()
  const result: NewsItem[] = []
  for (const it of items) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    result.push(it)
  }
  return result
}

// Scoring: combina relevance (alta=3, media=2, baja=1) + match con prefs del user.
// Devuelve items ordenados por score desc.
function rank(items: NewsItem[], prefs?: { countries?: CountryCode[]; topics?: Topic[] }): NewsItem[] {
  const relWeight = { alta: 3, media: 2, baja: 1 }
  const userCountries = new Set(prefs?.countries ?? [])
  const userTopics = new Set(prefs?.topics ?? [])
  return [...items].sort((a, b) => {
    const aBoost = (userCountries.has(a.country) ? 1 : 0) + (userTopics.has(a.topic) ? 1 : 0)
    const bBoost = (userCountries.has(b.country) ? 1 : 0) + (userTopics.has(b.topic) ? 1 : 0)
    const aScore = relWeight[a.relevance] + aBoost * 2
    const bScore = relWeight[b.relevance] + bBoost * 2
    if (aScore !== bScore) return bScore - aScore
    return b.date.localeCompare(a.date)
  })
}

type Fetcher = {
  id: string
  label: string
  country: CountryCode
  fn: (opts: { signal?: AbortSignal }) => Promise<NewsItem[]>
}

const FETCHERS: Fetcher[] = [
  { id: 'senado-br', label: 'Senado Federal Brasil', country: 'BR', fn: ({ signal }) => fetchSenadoBR({ limit: 30, signal }) },
  { id: 'camara-br', label: 'Câmara dos Deputados', country: 'BR', fn: ({ signal }) => fetchCamaraProposicoes({ limit: 30, signal }) },
  { id: 'hcdn-ar', label: 'HCDN Argentina', country: 'AR', fn: ({ signal }) => fetchHcdnArgentina({ limit: 20, signal }) },
  { id: 'senado-co', label: 'Senado Colombia', country: 'CO', fn: ({ signal }) => fetchProyectosColombia({ limit: 25, signal }) },
  { id: 'leyes-co', label: 'Leyes Sancionadas Colombia', country: 'CO', fn: ({ signal }) => fetchLeyesColombia({ limit: 30, signal }) },
  { id: 'tratados-co', label: 'Cancillería Colombia · Tratados', country: 'CO', fn: ({ signal }) => fetchTratadosColombia({ limit: 25, signal }) },
  { id: 'parlamento-uy', label: 'Parlamento del Uruguay', country: 'UY', fn: ({ signal }) => fetchParlamentoUY({ limit: 25, signal }) },
]

// Si hay un Worker desplegado (variable VITE_UPM_API_URL), preferirlo.
// Tiene cache en KV + más fuentes (UY, PY, BO, PE) + es más rápido edge.
const WORKER_URL = (import.meta.env.VITE_UPM_API_URL ?? '').toString().replace(/\/$/, '')

async function fetchFromWorker(signal?: AbortSignal): Promise<AggregatedFeed | null> {
  if (!WORKER_URL) return null
  try {
    const res = await fetch(`${WORKER_URL}/feed`, { signal })
    if (!res.ok) return null
    const json = (await res.json()) as { items: NewsItem[]; fetchedAt: string; sources: SourceReport[] }
    const byCountry: Record<CountryCode, number> = {} as Record<CountryCode, number>
    for (const s of json.sources) byCountry[s.country] = (byCountry[s.country] ?? 0) + s.count
    return {
      items: json.items,
      status: 'live',
      fetchedAt: json.fetchedAt,
      sources: json.sources,
      byCountry,
    }
  } catch {
    return null
  }
}

export async function fetchLiveFeed(opts?: {
  force?: boolean
  signal?: AbortSignal
  prefs?: { countries?: CountryCode[]; topics?: Topic[] }
  // Emite el feed parcial cada vez que UNA fuente termina (success o error).
  // Permite render progresivo: la primera fuente que responde ya muestra cards.
  onProgress?: (partial: AggregatedFeed) => void
}): Promise<AggregatedFeed> {
  if (!opts?.force) {
    const cached = readCache()
    if (cached) return cached
  }

  // Si hay Worker, intentamos primero. Si responde bien, usamos eso (más fuentes).
  const fromWorker = await fetchFromWorker(opts?.signal)
  if (fromWorker) {
    fromWorker.items = rank(dedupe(fromWorker.items), opts?.prefs)
    writeCache(fromWorker)
    return fromWorker
  }

  // Render progresivo: cada fetcher emite por separado y se actualiza el feed.
  const allItems: NewsItem[] = []
  const sources: SourceReport[] = FETCHERS.map(f => ({
    id: f.id, label: f.label, country: f.country, ok: false, count: 0,
  }))
  const byCountry: Record<CountryCode, number> = {} as Record<CountryCode, number>
  let liveCount = 0
  let resolved = 0

  const buildFeed = (status: SourceStatus): AggregatedFeed => {
    let items = rank(dedupe(allItems), opts?.prefs)
    let finalStatus = status
    if (items.length === 0 && resolved === FETCHERS.length) {
      items = MOCK_NEWS
      finalStatus = 'mock'
    } else if (resolved === FETCHERS.length && liveCount > 0 && liveCount < 8) {
      items = rank(dedupe([...allItems, ...MOCK_NEWS]), opts?.prefs)
      finalStatus = 'mixed'
    }
    return {
      items,
      status: finalStatus,
      fetchedAt: new Date().toISOString(),
      sources: sources.slice(),
      byCountry: { ...byCountry },
    }
  }

  const promises = FETCHERS.map((f, idx) =>
    f.fn({ signal: opts?.signal })
      .then(
        items => ({ ok: true as const, fetcher: f, idx, items }),
        err => ({ ok: false as const, fetcher: f, idx, items: [] as NewsItem[], error: err }),
      )
      .then(r => {
        sources[r.idx] = {
          id: r.fetcher.id,
          label: r.fetcher.label,
          country: r.fetcher.country,
          ok: r.ok,
          count: r.items.length,
          error: r.ok ? undefined : String((r as { error: unknown }).error).slice(0, 200),
        }
        if (r.ok && r.items.length > 0) {
          liveCount += r.items.length
          allItems.push(...r.items)
          byCountry[r.fetcher.country] = (byCountry[r.fetcher.country] ?? 0) + r.items.length
        }
        resolved += 1
        if (opts?.onProgress) {
          // Emitir feed parcial con lo que hay hasta ahora
          opts.onProgress(buildFeed('live'))
        }
        return r
      }),
  )

  await Promise.all(promises)
  const feed = buildFeed('live')
  writeCache(feed)
  return feed
}

export async function fetchLiveLaws(opts?: { force?: boolean; signal?: AbortSignal }): Promise<AggregatedFeed> {
  const feed = await fetchLiveFeed(opts)
  const filtered = feed.items.filter(i =>
    i.type === 'ley' || i.type === 'decreto' || i.type === 'reglamento' || i.type === 'informe',
  )
  return { ...feed, items: filtered }
}
