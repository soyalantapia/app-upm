import type { CountryCode, NewsItem, Topic } from '@/lib/types'
import { NEWS as MOCK_NEWS } from '@/lib/data'
import { fetchCamaraProposicoes } from './camara-br'
import { fetchSenadoBR } from './senado-br'
import { fetchHcdnArgentina } from './hcdn-ar'
import { fetchProyectosColombia } from './socrata-co'

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
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 min

type Cached = AggregatedFeed & { _ts: number }

function readCache(): AggregatedFeed | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cached
    if (Date.now() - parsed._ts > CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
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
  { id: 'camara-br', label: 'Câmara dos Deputados', country: 'BR', fn: ({ signal }) => fetchCamaraProposicoes({ limit: 30, signal }) },
  { id: 'senado-br', label: 'Senado Federal', country: 'BR', fn: ({ signal }) => fetchSenadoBR({ limit: 20, signal }) },
  { id: 'hcdn-ar', label: 'HCDN Argentina', country: 'AR', fn: ({ signal }) => fetchHcdnArgentina({ limit: 15, signal }) },
  { id: 'socrata-co', label: 'Senado Colombia', country: 'CO', fn: ({ signal }) => fetchProyectosColombia({ limit: 20, signal }) },
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

  const promises = FETCHERS.map(f =>
    f.fn({ signal: opts?.signal }).then(
      items => ({ ok: true as const, fetcher: f, items }),
      err => ({ ok: false as const, fetcher: f, items: [] as NewsItem[], error: err }),
    ),
  )

  const settled = await Promise.all(promises)
  const allItems: NewsItem[] = []
  const sources: SourceReport[] = []
  const byCountry: Record<CountryCode, number> = {} as Record<CountryCode, number>
  let liveCount = 0

  for (const r of settled) {
    sources.push({
      id: r.fetcher.id,
      label: r.fetcher.label,
      country: r.fetcher.country,
      ok: r.ok,
      count: r.items.length,
      error: r.ok ? undefined : String((r as { error: unknown }).error).slice(0, 200),
    })
    if (r.ok && r.items.length > 0) {
      liveCount += r.items.length
      allItems.push(...r.items)
      byCountry[r.fetcher.country] = (byCountry[r.fetcher.country] ?? 0) + r.items.length
    }
  }

  let status: SourceStatus = 'live'
  let items = rank(dedupe(allItems), opts?.prefs)
  if (items.length === 0) {
    items = MOCK_NEWS
    status = 'mock'
  } else if (liveCount < 8) {
    items = rank(dedupe([...allItems, ...MOCK_NEWS]), opts?.prefs)
    status = 'mixed'
  }

  const feed: AggregatedFeed = {
    items,
    status,
    fetchedAt: new Date().toISOString(),
    sources,
    byCountry,
  }
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
