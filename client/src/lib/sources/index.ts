import type { NewsItem } from '@/lib/types'
import { NEWS as MOCK_NEWS } from '@/lib/data'
import { fetchCamaraProposicoes } from './camara-br'
import { fetchProyectosColombia } from './socrata-co'

export type SourceStatus = 'live' | 'mock' | 'mixed'

export type AggregatedFeed = {
  items: NewsItem[]
  status: SourceStatus
  fetchedAt: string
  // Detalle de qué fuentes anduvieron / cayeron
  sources: { id: string; ok: boolean; count: number; error?: string }[]
}

const CACHE_KEY = 'upm.live-feed.v1'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 min

type Cached = { items: NewsItem[]; status: SourceStatus; fetchedAt: string; sources: AggregatedFeed['sources'] }

function readCache(): Cached | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cached & { _ts: number }
    if (Date.now() - parsed._ts > CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(c: Cached) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...c, _ts: Date.now() }))
  } catch {
    // ignore
  }
}

function dedupeAndSort(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>()
  const result: NewsItem[] = []
  for (const it of items) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    result.push(it)
  }
  return result.sort((a, b) => b.date.localeCompare(a.date))
}

export async function fetchLiveFeed(opts?: { force?: boolean; signal?: AbortSignal }): Promise<AggregatedFeed> {
  if (!opts?.force) {
    const cached = readCache()
    if (cached) return cached
  }

  const sources: AggregatedFeed['sources'] = []
  const results: NewsItem[] = []
  let liveCount = 0

  const tasks = await Promise.allSettled([
    fetchCamaraProposicoes({ signal: opts?.signal, limit: 30 }).then(items => ({ id: 'camara-br', items })),
    fetchProyectosColombia({ signal: opts?.signal, limit: 20 }).then(items => ({ id: 'socrata-co', items })),
  ])

  for (const t of tasks) {
    if (t.status === 'fulfilled') {
      sources.push({ id: t.value.id, ok: true, count: t.value.items.length })
      results.push(...t.value.items)
      if (t.value.items.length > 0) liveCount += t.value.items.length
    } else {
      const id = (t.reason && (t.reason as { sourceId?: string }).sourceId) ?? 'unknown'
      sources.push({ id, ok: false, count: 0, error: String(t.reason).slice(0, 200) })
    }
  }

  // Si no vino nada vivo, fallback a mock (con flag).
  let status: SourceStatus = 'live'
  let items = dedupeAndSort(results)
  if (items.length === 0) {
    items = MOCK_NEWS
    status = 'mock'
  } else if (liveCount < 5) {
    // Si vino muy poco, mezclamos con mock para que el feed se vea poblado.
    items = dedupeAndSort([...results, ...MOCK_NEWS])
    status = 'mixed'
  }

  const feed: AggregatedFeed = {
    items,
    status,
    fetchedAt: new Date().toISOString(),
    sources,
  }
  writeCache(feed)
  return feed
}

// Para Leyes específicamente: priorizamos los items con type=ley/decreto/reglamento.
export async function fetchLiveLaws(opts?: { force?: boolean; signal?: AbortSignal }): Promise<AggregatedFeed> {
  const feed = await fetchLiveFeed(opts)
  const filtered = feed.items.filter(i =>
    i.type === 'ley' || i.type === 'decreto' || i.type === 'reglamento' || i.type === 'informe',
  )
  return { ...feed, items: filtered }
}
