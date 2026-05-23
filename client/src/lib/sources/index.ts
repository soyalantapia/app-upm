import type { CountryCode, NewsItem, Topic } from '@/lib/types'
import { fetchCamaraProposicoes } from './camara-br'
import { fetchSenadoBR } from './senado-br'
import { fetchProyectosColombia, fetchLeyesColombia } from './socrata-co'
import { fetchTratadosColombia } from './tratados-co'
import { fetchParlamentoUY } from './parlamento-uy'
import { fetchVistaProyectosColombia } from './vista-co'
import { fetchVotacionesColombia } from './votaciones-co'
import { fetchLeyesUruguay } from './leyes-uy'
import { fetchLeyesPresidenciaColombia, fetchDecretosPresidenciaColombia } from './presidencia-co'
import {
  fetchLeyesInfolegArgentina,
  fetchDecretosInfolegArgentina,
  fetchDecisionesAdminInfolegArgentina,
  fetchResolucionesInfolegArgentina,
  fetchDisposicionesInfolegArgentina,
  fetchComunicacionesInfolegArgentina,
  fetchAcordadasInfolegArgentina,
  fetchDirectivasInfolegArgentina,
  fetchCircularesInfolegArgentina,
  fetchMercosurComercioAR,
  fetchBCRAArgentina,
  fetchSaludArgentina,
  fetchEconomiaArgentina,
  fetchSeguridadArgentina,
  fetchEnergiaArgentina,
  fetchComunicacionesARorg,
} from './infoleg-ar'
import { fetchExpedientesHCDN } from './expedientes-hcdn'
import { fetchSenadoAR } from './senado-ar'
import { fetchImpoUY } from './impo-uy'
import { fetchMateriasSenadoBR } from './materias-senado-br'
import { fetchConveniosAR } from './convenios-ar'
import { fetchCnvAR } from './cnv-ar'
import { fetchParlasur } from './parlasur'
import { fetchDefensoriaAR } from './defensoria-ar'
import { fetchTcuBR } from './tcu-br'
import { fetchCorteConstitucionalColombia } from './corte-constitucional-co'
import { fetchSentenciasCorteCO } from './sentencias-corte-co'
import { fetchVotacoesCamaraBR } from './votacoes-br'
import { fetchVotacoesSenadoBR } from './votacoes-senado-br'
import { fetchEventosCamaraBR } from './eventos-br'
import { fetchSenadoPY } from './senado-py'
import { fetchDiputadosPY } from './diputados-py'
import { fetchAsambleaBO } from './asamblea-bo'
import { fetchCongresoCL } from './congreso-cl'

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
// Importante: si el cache guardó un feed VACÍO (0 items, p. ej. todas las fuentes
// fallaron por CORS o red intermitente), tratamos como si no hubiera cache para
// que la próxima llamada gatille un refetch en lugar de mostrar la app vacía.
export function readCacheStatus(): { feed: AggregatedFeed; fresh: boolean } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cached
    const age = Date.now() - parsed._ts
    if (age > CACHE_TTL_MS) return null
    // Evitar cache "envenenado" con 0 items · forzar refetch en próxima carga
    if (!parsed.items || parsed.items.length === 0) return null
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
    // Guardar siempre los progresivos (>= 1 item). Si tenemos 0 items pero ya
    // había cache previa con datos, NO sobrescribir · preferimos datos viejos
    // antes que pantalla vacía.
    if (!c.items || c.items.length === 0) {
      const existing = window.localStorage.getItem(CACHE_KEY)
      if (existing) {
        try {
          const prev = JSON.parse(existing) as Cached
          if (prev.items && prev.items.length > 0) return
        } catch { /* fall through to write */ }
      }
    }
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
  { id: 'votacoes-camara-br', label: 'Câmara BR · Votaciones recientes', country: 'BR', fn: ({ signal }) => fetchVotacoesCamaraBR({ limit: 20, signal }) },
  { id: 'votacoes-senado-br', label: 'Senado Federal BR · Votaciones nominales', country: 'BR', fn: ({ signal }) => fetchVotacoesSenadoBR({ limit: 20, signal }) },
  { id: 'eventos-camara-br', label: 'Câmara BR · Agenda y eventos', country: 'BR', fn: ({ signal }) => fetchEventosCamaraBR({ limit: 25, signal }) },
  // Argentina · Infoleg (Min. Justicia) con desglose por tipo de norma.
  { id: 'leyes-infoleg-ar', label: 'Argentina · Leyes Nacionales (BO)', country: 'AR', fn: ({ signal }) => fetchLeyesInfolegArgentina({ limit: 400, signal }) },
  { id: 'decretos-infoleg-ar', label: 'Argentina · Decretos del PEN', country: 'AR', fn: ({ signal }) => fetchDecretosInfolegArgentina({ limit: 80, signal }) },
  { id: 'decisiones-admin-ar', label: 'Argentina · Decisiones Administrativas (Jefatura)', country: 'AR', fn: ({ signal }) => fetchDecisionesAdminInfolegArgentina({ limit: 50, signal }) },
  { id: 'resoluciones-ar', label: 'Argentina · Resoluciones ministeriales', country: 'AR', fn: ({ signal }) => fetchResolucionesInfolegArgentina({ limit: 100, signal }) },
  { id: 'disposiciones-ar', label: 'Argentina · Disposiciones', country: 'AR', fn: ({ signal }) => fetchDisposicionesInfolegArgentina({ limit: 50, signal }) },
  { id: 'comunicaciones-ar', label: 'Argentina · Comunicaciones del PEN', country: 'AR', fn: ({ signal }) => fetchComunicacionesInfolegArgentina({ limit: 30, signal }) },
  { id: 'acordadas-ar', label: 'Argentina · Acordadas (Corte Suprema)', country: 'AR', fn: ({ signal }) => fetchAcordadasInfolegArgentina({ limit: 30, signal }) },
  { id: 'directivas-ar', label: 'Argentina · Directivas', country: 'AR', fn: ({ signal }) => fetchDirectivasInfolegArgentina({ limit: 50, signal }) },
  { id: 'circulares-ar', label: 'Argentina · Circulares (BCRA, AFIP)', country: 'AR', fn: ({ signal }) => fetchCircularesInfolegArgentina({ limit: 30, signal }) },
  { id: 'expedientes-hcdn-ar', label: 'Cámara de Diputados AR · Expedientes históricos', country: 'AR', fn: ({ signal }) => fetchExpedientesHCDN({ limit: 80, signal }) },
  { id: 'senado-ar', label: 'Honorable Senado de la Nación · Argentina', country: 'AR', fn: ({ signal }) => fetchSenadoAR({ limit: 30, signal }) },
  { id: 'impo-uy', label: 'IMPO Uruguay · Decretos del Poder Ejecutivo', country: 'UY', fn: ({ signal }) => fetchImpoUY({ limit: 30, signal }) },
  { id: 'materias-senado-br', label: 'Senado Federal Brasil · Matérias legislativas', country: 'BR', fn: ({ signal }) => fetchMateriasSenadoBR({ limit: 30, signal }) },
  { id: 'convenios-ar', label: 'Ministerio de Trabajo AR · Convenios Colectivos', country: 'AR', fn: ({ signal }) => fetchConveniosAR({ limit: 30, signal }) },
  { id: 'cnv-ar', label: 'Comisión Nacional de Valores · Argentina', country: 'AR', fn: ({ signal }) => fetchCnvAR({ limit: 30, signal }) },
  { id: 'parlasur', label: 'Parlamento del Mercosur (Parlasur) · Actos supranacionales', country: 'AR', fn: ({ signal }) => fetchParlasur({ limit: 30, signal }) },
  { id: 'defensoria-ar', label: 'Defensoría del Pueblo · Argentina', country: 'AR', fn: ({ signal }) => fetchDefensoriaAR({ limit: 30, signal }) },
  { id: 'tcu-br', label: 'Tribunal de Contas da União · Brasil', country: 'BR', fn: ({ signal }) => fetchTcuBR({ limit: 30, signal }) },
  // Fuentes AR por organismo · todas tiran del mismo JSON Infoleg con filtro por emisor
  { id: 'mercosur-comercio-ar', label: 'Argentina · Comisión de Comercio del MERCOSUR', country: 'AR', fn: ({ signal }) => fetchMercosurComercioAR({ limit: 60, signal }) },
  { id: 'bcra-ar', label: 'Argentina · Banco Central (BCRA)', country: 'AR', fn: ({ signal }) => fetchBCRAArgentina({ limit: 40, signal }) },
  { id: 'salud-ar', label: 'Argentina · Salud (Min. Salud + ANMAT)', country: 'AR', fn: ({ signal }) => fetchSaludArgentina({ limit: 30, signal }) },
  { id: 'economia-ar', label: 'Argentina · Economía y Recaudación (ARCA/AFIP)', country: 'AR', fn: ({ signal }) => fetchEconomiaArgentina({ limit: 30, signal }) },
  { id: 'seguridad-ar', label: 'Argentina · Seguridad e Interior', country: 'AR', fn: ({ signal }) => fetchSeguridadArgentina({ limit: 25, signal }) },
  { id: 'energia-ar', label: 'Argentina · Energía (Sec. Energía + ENRE/ENARGAS)', country: 'AR', fn: ({ signal }) => fetchEnergiaArgentina({ limit: 25, signal }) },
  { id: 'enacom-ar', label: 'Argentina · ENACOM Comunicaciones', country: 'AR', fn: ({ signal }) => fetchComunicacionesARorg({ limit: 20, signal }) },
  { id: 'senado-co', label: 'Senado Colombia', country: 'CO', fn: ({ signal }) => fetchProyectosColombia({ limit: 25, signal }) },
  { id: 'leyes-co', label: 'Leyes Sancionadas Colombia', country: 'CO', fn: ({ signal }) => fetchLeyesColombia({ limit: 100, signal }) },
  { id: 'tratados-co', label: 'Cancillería Colombia · Tratados', country: 'CO', fn: ({ signal }) => fetchTratadosColombia({ limit: 25, signal }) },
  { id: 'vista-co', label: 'Senado y Cámara CO · Texto íntegro', country: 'CO', fn: ({ signal }) => fetchVistaProyectosColombia({ limit: 50, signal }) },
  { id: 'votaciones-co', label: 'Senado CO · Votaciones nominales', country: 'CO', fn: ({ signal }) => fetchVotacionesColombia({ limit: 15, signal }) },
  { id: 'leyes-presidencia-co', label: 'Presidencia CO · Leyes y Actos Legislativos', country: 'CO', fn: ({ signal }) => fetchLeyesPresidenciaColombia({ limit: 100, signal }) },
  { id: 'decretos-presidencia-co', label: 'Presidencia CO · Decretos y Resoluciones', country: 'CO', fn: ({ signal }) => fetchDecretosPresidenciaColombia({ limit: 40, signal }) },
  { id: 'corte-const-co', label: 'Corte Constitucional CO · Exhortos al Congreso', country: 'CO', fn: ({ signal }) => fetchCorteConstitucionalColombia({ limit: 30, signal }) },
  { id: 'sentencias-corte-co', label: 'Corte Constitucional CO · Sentencias recientes', country: 'CO', fn: ({ signal }) => fetchSentenciasCorteCO({ limit: 50, signal }) },
  { id: 'parlamento-uy', label: 'Parlamento del Uruguay', country: 'UY', fn: ({ signal }) => fetchParlamentoUY({ limit: 25, signal }) },
  { id: 'leyes-uy', label: 'Leyes Promulgadas Uruguay', country: 'UY', fn: ({ signal }) => fetchLeyesUruguay({ limit: 80, signal }) },
  // Paraguay · Cámara de Senadores + Diputados
  { id: 'senado-py', label: 'Senado de la República del Paraguay', country: 'PY', fn: ({ signal }) => fetchSenadoPY({ limit: 30, signal }) },
  { id: 'diputados-py', label: 'Cámara de Diputados del Paraguay', country: 'PY', fn: ({ signal }) => fetchDiputadosPY({ limit: 30, signal }) },
  // Bolivia · Asamblea Legislativa Plurinacional
  { id: 'asamblea-bo', label: 'Asamblea Legislativa Plurinacional de Bolivia', country: 'BO', fn: ({ signal }) => fetchAsambleaBO({ limit: 30, signal }) },
  // Chile · Biblioteca del Congreso Nacional
  { id: 'congreso-cl', label: 'Congreso Nacional de Chile (BCN)', country: 'CL', fn: ({ signal }) => fetchCongresoCL({ limit: 30, signal }) },
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
  let resolved = 0

  const buildFeed = (status: SourceStatus): AggregatedFeed => {
    // Solo datos en vivo. Si todo falla, queda vacío y el componente
    // muestra un EmptyState; nunca mezclamos mock data.
    const items = rank(dedupe(allItems), opts?.prefs)
    return {
      items,
      status,
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
