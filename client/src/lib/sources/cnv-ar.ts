import type { NewsItem, Relevance, Topic } from '@/lib/types'

// CNV Argentina · Resoluciones del mercado de capitales.
// Dataset embebido con 15 resoluciones recientes sobre criptoactivos,
// bonos ESG, PYMES, IA en trading, ciberseguridad, etc.

type CnvRow = {
  id: string
  tipoDocumento: string
  title: string
  fecha: string
  tipo: string
  ementa: string
}

type CnvData = { fuente: string; url: string; fetchedAt: string; items: CnvRow[] }

const PUBLIC_BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '')
const DATA_URL = `${PUBLIC_BASE}/data/cnv-ar.json`

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/cripto|token|blockchain/i.test(t)) return 'integracion-regional'
  if (/sostenib|esg|verde|sustent/i.test(t)) return 'ambiente'
  if (/g[ée]nero|paridad|mujer/i.test(t)) return 'genero'
  if (/mercosur|mercosul|integraci[óo]n/i.test(t)) return 'integracion-regional'
  return 'economia-regional'
}

function detectRelevance(title: string): Relevance {
  if (/reglament|nuev[ao]\s+r[ée]gimen|marco regulatorio/i.test(title)) return 'alta'
  return 'media'
}

export async function fetchCnvAR(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 50
  const res = await fetch(DATA_URL, { signal: opts?.signal })
  if (!res.ok) throw new Error(`CNV AR data error: ${res.status}`)
  const data = (await res.json()) as CnvData
  return data.items.slice(0, limit).map(row => ({
    id: row.id,
    title: row.title,
    country: 'AR' as const,
    topic: detectTopic(row.title + ' ' + row.ementa),
    type: 'reglamento' as const,
    date: row.fecha,
    relevance: detectRelevance(row.title),
    excerpt: row.ementa.length > 600 ? row.ementa.slice(0, 597) + '…' : row.ementa,
    source: 'Comisión Nacional de Valores · Argentina',
    fullText: row.ementa,
    tipoDocumento: row.tipoDocumento,
    tipoConteudo: 'Resolución CNV',
    authors: 'Directorio de la Comisión Nacional de Valores',
    status: 'Vigente',
    dataPublicacao: row.fecha,
    sourceUrl: 'https://www.argentina.gob.ar/cnv/normativa',
  }))
}
