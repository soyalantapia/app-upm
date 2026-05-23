import type { NewsItem, Relevance, Topic } from '@/lib/types'

// Biblioteca del Congreso Nacional / Senado de Chile · Leyes y Decretos.
// Cubre: transición energética, litio, corredor bioceánico, Mercosur,
// pueblos indígenas, paridad de género, glaciares.

type CongresoCLRow = {
  id: string
  tipoDocumento: string
  title: string
  fecha: string
  organo: string
  ementa: string
}

type CongresoCLData = { fuente: string; url: string; fetchedAt: string; items: CongresoCLRow[] }

const PUBLIC_BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '')
const DATA_URL = `${PUBLIC_BASE}/data/congreso-cl.json`

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/bioce[aá]nico|corredor|paso jama|mejillones|infraestrut/i.test(t)) return 'corredores-bioceanicos'
  if (/energi|litio|transici[oó]n|renovable|carbono|glaciar/i.test(t)) return 'energia'
  if (/mercosur|integraci[oó]n|cancill|asociaci[oó]n/i.test(t)) return 'integracion-regional'
  if (/ambient|glaciar|agua|cambio clim[aá]tico|cuenca/i.test(t)) return 'ambiente'
  if (/g[eé]nero|paridad|mujer|violencia/i.test(t)) return 'genero'
  if (/salud|hospital|sanitari/i.test(t)) return 'salud'
  if (/educac|intercultural|ind[ií]gena.*educ/i.test(t)) return 'educacion'
  if (/seguridad|narco|crimen/i.test(t)) return 'seguridad'
  if (/ind[ií]gena|mapuche|aimara|rapa nui|atacame[ñn]/i.test(t)) return 'integracion-regional'
  if (/econom|exportacion|fondo|presupuest|zona.*econ/i.test(t)) return 'economia-regional'
  return 'integracion-regional'
}

function detectRelevance(tipo: string, text: string): Relevance {
  if (/LEY/.test(tipo) && /litio|bioce[aá]nico|transici[oó]n|mercosur/i.test(text)) return 'alta'
  if (/LEY/.test(tipo)) return 'alta'
  return 'media'
}

export async function fetchCongresoCL(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 50
  const res = await fetch(DATA_URL, { signal: opts?.signal })
  if (!res.ok) throw new Error(`Congreso CL data error: ${res.status}`)
  const data = (await res.json()) as CongresoCLData
  return data.items.slice(0, limit).map(row => ({
    id: row.id,
    title: row.title,
    country: 'CL' as const,
    topic: detectTopic(row.title + ' ' + row.ementa),
    type: row.tipoDocumento === 'LEY' ? 'ley' as const
      : row.tipoDocumento === 'DECRETO' ? 'decreto' as const
      : 'informe' as const,
    date: row.fecha,
    relevance: detectRelevance(row.tipoDocumento, row.title + ' ' + row.ementa),
    excerpt: row.ementa.length > 600 ? row.ementa.slice(0, 597) + '…' : row.ementa,
    source: `${row.organo} · Congreso Nacional de Chile`,
    fullText: row.ementa,
    tipoDocumento: row.tipoDocumento,
    tipoConteudo: row.tipoDocumento === 'LEY' ? 'Ley de la República'
      : row.tipoDocumento === 'DECRETO' ? 'Decreto Supremo'
      : 'Resolución',
    authors: row.organo,
    status: row.tipoDocumento === 'LEY' ? 'Promulgada' : 'Vigente',
    dataPublicacao: row.fecha,
    sourceUrl: 'https://www.bcn.cl',
  }))
}
