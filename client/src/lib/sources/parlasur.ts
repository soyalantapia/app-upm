import type { CountryCode, DocType, NewsItem, Relevance, Topic } from '@/lib/types'

// Parlamento del Mercosur (Parlasur) · Recomendaciones y declaraciones supranacionales.
// Dataset embebido con 12 actos recientes del Parlasur que dan dimensión regional al corpus.

type ParlasurRow = {
  id: string
  tipoDocumento: string
  title: string
  fecha: string
  tipo: string
  ementa: string
}

type ParlasurData = { fuente: string; url: string; fetchedAt: string; items: ParlasurRow[] }

const PUBLIC_BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '')
const DATA_URL = `${PUBLIC_BASE}/data/parlasur.json`

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/ambient|agua|h[íi]drico|cuenca|sustent/i.test(t)) return 'ambiente'
  if (/energ[íi]a|el[ée]ctric|litio|petr[óo]l|hidr[óo]geno/i.test(t)) return 'energia'
  if (/educac|investigaci/i.test(t)) return 'educacion'
  if (/salud|sanitar/i.test(t)) return 'salud'
  if (/g[ée]nero|mujer|violencia|paridad/i.test(t)) return 'genero'
  if (/derechos humanos|trata|memoria/i.test(t)) return 'seguridad'
  if (/tribut|fiscal|aduana|comerc|tributaria/i.test(t)) return 'economia-regional'
  if (/corredor|biocean|infraestruct|transport|ferrov/i.test(t)) return 'corredores-bioceanicos'
  return 'integracion-regional'
}

export async function fetchParlasur(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 50
  const res = await fetch(DATA_URL, { signal: opts?.signal })
  if (!res.ok) throw new Error(`Parlasur data error: ${res.status}`)
  const data = (await res.json()) as ParlasurData
  return data.items.slice(0, limit).map(row => ({
    id: row.id,
    title: row.title,
    // Marcamos como AR pero indicamos en source que es supranacional
    country: 'AR' as CountryCode,
    topic: detectTopic(row.title + ' ' + row.ementa),
    type: (row.tipo as DocType) ?? 'comunicado',
    date: row.fecha,
    relevance: 'alta' as Relevance,
    excerpt: row.ementa.length > 600 ? row.ementa.slice(0, 597) + '…' : row.ementa,
    source: 'Parlamento del Mercosur · Acto supranacional',
    fullText: row.ementa,
    tipoDocumento: row.tipoDocumento,
    tipoConteudo: 'Acto del Parlasur',
    authors: 'Parlamento del Mercosur',
    status: 'Vigente',
    dataPublicacao: row.fecha,
    sourceUrl: 'https://www.parlamentomercosur.org',
  }))
}
