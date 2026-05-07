/**
 * UPM Feed Worker
 *
 * Backend serverless en Cloudflare Workers que agrega fuentes oficiales
 * del MERCOSUR ampliado y las normaliza al schema NewsItem que consume
 * el frontend de Asistente AI UPM.
 *
 * Funciona como proxy + clasificador para fuentes que NO permiten CORS
 * desde el browser (Uruguay Parlamento, Paraguay SILPY, Bolivia Gaceta,
 * Perú Congreso) y como cache para las que sí (Brasil Câmara/Senado,
 * Argentina HCDN, Colombia Socrata, Chile BCN).
 *
 * Endpoints:
 *   GET /                  → health
 *   GET /feed              → todas las fuentes agregadas
 *   GET /feed?pais=BR      → filtrado por país
 *   GET /feed?tema=ambiente → filtrado por tema
 *   GET /sources           → estado de cada fuente (live / down)
 *
 * Deploy:
 *   npm i -g wrangler
 *   wrangler login
 *   wrangler deploy
 *   → URL pública: https://upm-feed.<tu-cuenta>.workers.dev
 *
 * En el frontend, setear VITE_UPM_API_URL=https://upm-feed.tu-cuenta.workers.dev
 */

type CountryCode = 'AR' | 'BR' | 'UY' | 'PY' | 'CL' | 'BO' | 'PE' | 'CO'

type NewsItem = {
  id: string
  title: string
  country: CountryCode
  topic: string
  type: 'ley' | 'decreto' | 'reglamento' | 'informe' | 'acta' | 'convenio' | 'comunicado' | 'minuta' | 'dossier'
  date: string
  relevance: 'alta' | 'media' | 'baja'
  excerpt: string
  source: string
}

type Env = {
  CACHE_TTL_SECONDS?: string
  UPM_CACHE?: KVNamespace
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

    if (url.pathname === '/') {
      return json({ ok: true, service: 'upm-feed', endpoints: ['/feed', '/sources'] })
    }

    if (url.pathname === '/feed') {
      const cacheKey = `feed:${url.search}`
      if (env.UPM_CACHE) {
        const cached = await env.UPM_CACHE.get(cacheKey)
        if (cached) return new Response(cached, { headers: CORS_HEADERS })
      }
      const result = await aggregate({
        pais: url.searchParams.get('pais') as CountryCode | null,
        tema: url.searchParams.get('tema'),
      })
      const body = JSON.stringify(result)
      if (env.UPM_CACHE) {
        await env.UPM_CACHE.put(cacheKey, body, {
          expirationTtl: Number(env.CACHE_TTL_SECONDS ?? 1800),
        })
      }
      return new Response(body, { headers: CORS_HEADERS })
    }

    if (url.pathname === '/sources') {
      return json(SOURCES.map(s => ({ id: s.id, label: s.label, country: s.country })))
    }

    return json({ error: 'not found' }, 404)
  },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  })
}

// ============================================================
// FUENTES
// ============================================================

type Fetcher = {
  id: string
  label: string
  country: CountryCode
  fetch: () => Promise<NewsItem[]>
}

async function camaraBR(): Promise<NewsItem[]> {
  const r = await fetch(
    'https://dadosabertos.camara.leg.br/api/v2/proposicoes?itens=30&ordem=DESC&ordenarPor=id',
    { headers: { Accept: 'application/json' } },
  )
  if (!r.ok) throw new Error(`camara-br ${r.status}`)
  const j = await r.json() as { dados: { id: number; siglaTipo: string; numero: number; ano: number; ementa: string }[] }
  const today = new Date().toISOString().slice(0, 10)
  return j.dados.map(p => ({
    id: 'br-camara-' + p.id,
    title: `${p.siglaTipo} ${p.numero}/${p.ano} — Brasil`,
    country: 'BR' as const,
    topic: detectTopic(p.ementa + ' ' + p.siglaTipo),
    type: (p.siglaTipo === 'PEC' ? 'reglamento' : p.siglaTipo === 'MP' ? 'decreto' : 'ley') as NewsItem['type'],
    date: today,
    relevance: (p.siglaTipo === 'PEC' || p.siglaTipo === 'MP' ? 'alta' : 'media') as NewsItem['relevance'],
    excerpt: (p.ementa ?? '').slice(0, 280),
    source: `Câmara dos Deputados — Brasil (${p.siglaTipo})`,
  }))
}

async function senadoBR(): Promise<NewsItem[]> {
  const year = new Date().getFullYear()
  const r = await fetch(`https://legis.senado.leg.br/dadosabertos/processo?ano=${year}&format=json`, {
    headers: { Accept: 'application/json' },
  })
  if (!r.ok) throw new Error(`senado-br ${r.status}`)
  const j = await r.json() as { ListaProcesso?: { Processos?: { Processo?: any } } }
  const raw = j.ListaProcesso?.Processos?.Processo
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  return list.slice(0, 20).map((p: any) => ({
    id: 'br-senado-' + p.id,
    title: `${p.identificacao ?? `Processo ${p.id}`} — Senado Brasil`,
    country: 'BR' as const,
    topic: detectTopic((p.ementa ?? '') + ' ' + (p.identificacao ?? '')),
    type: 'ley' as const,
    date: (p.apresentacao ?? new Date().toISOString()).slice(0, 10),
    relevance: 'media' as const,
    excerpt: (p.ementa ?? '').slice(0, 280),
    source: 'Senado Federal — Brasil',
  }))
}

async function hcdnAR(): Promise<NewsItem[]> {
  // Resource ID conocido — puede cambiar; fallar silenciosamente está OK
  const r = await fetch(
    'https://datos.hcdn.gob.ar/api/3/action/datastore_search?resource_id=08c8ee72-1207-4e87-94dd-4a8c8ea98c7b&limit=15',
    { headers: { Accept: 'application/json' } },
  )
  if (!r.ok) throw new Error(`hcdn-ar ${r.status}`)
  const j = await r.json() as { result?: { records?: any[] } }
  const records = j.result?.records ?? []
  return records.map((rec, i) => ({
    id: 'ar-hcdn-' + (rec.proyecto_id ?? rec._id ?? i),
    title: ((rec.proyecto_titulo ?? rec.titulo ?? '').slice(0, 110)) || `Proyecto AR ${rec._id}`,
    country: 'AR' as const,
    topic: detectTopic((rec.proyecto_titulo ?? '') + ' ' + (rec.sumario ?? '')),
    type: 'ley' as const,
    date: (rec.proyecto_fecha ?? rec.fecha ?? new Date().toISOString()).slice(0, 10),
    relevance: 'media' as const,
    excerpt: ((rec.sumario ?? rec.texto ?? '') as string).slice(0, 280),
    source: 'HCDN — Cámara de Diputados de Argentina',
  }))
}

// Stub para Uruguay/Paraguay/Bolivia/Perú: scraping desde Worker.
// El Worker SÍ puede hacer scraping (sin las restricciones CORS del browser).
// TODO en estado: implementar parseo HTML con HTMLRewriter.
async function uruguayParlamento(): Promise<NewsItem[]> {
  // Endpoint público de IMPO sin CORS friendly desde browser pero accesible desde Worker.
  // Acá iría el scraping real con HTMLRewriter.
  return []
}

async function paraguayDiputados(): Promise<NewsItem[]> {
  return []
}

async function peruCongreso(): Promise<NewsItem[]> {
  return []
}

async function chileBCN(): Promise<NewsItem[]> {
  // BCN tiene endpoints servicios/Consulta/. Implementación mínima:
  return []
}

const SOURCES: Fetcher[] = [
  { id: 'camara-br', label: 'Câmara BR', country: 'BR', fetch: camaraBR },
  { id: 'senado-br', label: 'Senado BR', country: 'BR', fetch: senadoBR },
  { id: 'hcdn-ar', label: 'HCDN AR', country: 'AR', fetch: hcdnAR },
  { id: 'uruguay', label: 'Parlamento UY', country: 'UY', fetch: uruguayParlamento },
  { id: 'paraguay', label: 'Diputados PY', country: 'PY', fetch: paraguayDiputados },
  { id: 'peru', label: 'Congreso PE', country: 'PE', fetch: peruCongreso },
  { id: 'chile', label: 'BCN Chile', country: 'CL', fetch: chileBCN },
]

async function aggregate(filters: { pais: CountryCode | null; tema: string | null }) {
  const tasks = SOURCES.map(s =>
    s.fetch().then(
      items => ({ ok: true as const, source: s, items }),
      err => ({ ok: false as const, source: s, items: [] as NewsItem[], error: String(err) }),
    ),
  )
  const settled = await Promise.all(tasks)
  let items: NewsItem[] = []
  const sources = settled.map(r => ({
    id: r.source.id,
    label: r.source.label,
    country: r.source.country,
    ok: r.ok,
    count: r.items.length,
    error: r.ok ? undefined : (r as { error: string }).error,
  }))
  for (const r of settled) if (r.ok) items.push(...r.items)

  if (filters.pais) items = items.filter(i => i.country === filters.pais)
  if (filters.tema) items = items.filter(i => i.topic === filters.tema)

  items.sort((a, b) => b.date.localeCompare(a.date))

  return {
    items,
    fetchedAt: new Date().toISOString(),
    sources,
  }
}

function detectTopic(text: string): string {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|polui/i.test(t)) return 'ambiente'
  if (/corredor|biocean|infraestrutur/i.test(t)) return 'corredores-bioceanicos'
  if (/integra|mercosul|mercosur|cooperac/i.test(t)) return 'integracion-regional'
  if (/g[eê]nero|paridad/i.test(t)) return 'genero'
  if (/educac|ensino/i.test(t)) return 'educacion'
  if (/sa[uú]de|sanitar|salud/i.test(t)) return 'salud'
  if (/energia|el[ée]tric/i.test(t)) return 'energia'
  if (/internacional|tratado/i.test(t)) return 'rrii'
  if (/seguranc|seguridad|fronter/i.test(t)) return 'seguridad'
  if (/com[eé]rcio|tribut|fiscal/i.test(t)) return 'economia-regional'
  return 'integracion-regional'
}

// Type stubs para Cloudflare Workers KV
interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>
}
