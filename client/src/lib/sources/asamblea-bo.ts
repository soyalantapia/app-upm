import type { NewsItem, Relevance, Topic } from '@/lib/types'

// Asamblea Legislativa Plurinacional de Bolivia · Leyes y Decretos.
// Cubre: corredor bioceánico, litio, acceso al mar, Amazonia, río Pilcomayo,
// energía renovable, educación plurilingüe, derechos mujeres indígenas.

type AsambleaBORow = {
  id: string
  tipoDocumento: string
  title: string
  fecha: string
  organo: string
  ementa: string
}

type AsambleaBOData = { fuente: string; url: string; fetchedAt: string; items: AsambleaBORow[] }

const PUBLIC_BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '')
const DATA_URL = `${PUBLIC_BASE}/data/asamblea-bo.json`

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/bioce[aá]nico|corredor|infraestrut|gasbol|carretera/i.test(t)) return 'corredores-bioceanicos'
  if (/litio|gas natural|gasobol|petroleo|energi|transici[oó]n/i.test(t)) return 'energia'
  if (/mercosur|integraci[oó]n|cancill|exterior|mar.*acceso/i.test(t)) return 'integracion-regional'
  if (/amaz[oó]n|bosque|deforest|biodiversidad|ecocidio/i.test(t)) return 'ambiente'
  if (/pilcomayo|chaco|r[ií]o|cuenca|agua|saneamiento/i.test(t)) return 'rio-uruguay'
  if (/g[eé]nero|mujer|paridad|violencia.*género|ind[ií]gena.*mujer/i.test(t)) return 'genero'
  if (/educac|pluriling|intracultural|intercultural/i.test(t)) return 'educacion'
  if (/salud|hospital|medic|sanitari/i.test(t)) return 'salud'
  if (/seguridad|narco|frontera/i.test(t)) return 'seguridad'
  if (/ind[ií]gena|originari|plurinacional|naci[oó]n/i.test(t)) return 'integracion-regional'
  if (/econom|exportacion|fondo|presupuest|regal/i.test(t)) return 'economia-regional'
  return 'integracion-regional'
}

function detectRelevance(tipo: string, text: string): Relevance {
  if (/LEY/.test(tipo) && /litio|bioce[aá]nico|gas|amaz[oó]n/i.test(text)) return 'alta'
  if (/LEY/.test(tipo)) return 'alta'
  if (/pilcomayo|litio|gasbol/i.test(text)) return 'alta'
  return 'media'
}

export async function fetchAsambleaBO(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 50
  const res = await fetch(DATA_URL, { signal: opts?.signal })
  if (!res.ok) throw new Error(`Asamblea BO data error: ${res.status}`)
  const data = (await res.json()) as AsambleaBOData
  return data.items.slice(0, limit).map(row => ({
    id: row.id,
    title: row.title,
    country: 'BO' as const,
    topic: detectTopic(row.title + ' ' + row.ementa),
    type: row.tipoDocumento === 'LEY' ? 'ley' as const
      : row.tipoDocumento === 'DECRETO' ? 'decreto' as const
      : 'informe' as const,
    date: row.fecha,
    relevance: detectRelevance(row.tipoDocumento, row.title + ' ' + row.ementa),
    excerpt: row.ementa.length > 600 ? row.ementa.slice(0, 597) + '…' : row.ementa,
    source: `${row.organo} · Bolivia`,
    fullText: row.ementa,
    tipoDocumento: row.tipoDocumento,
    tipoConteudo: row.tipoDocumento === 'LEY' ? 'Ley del Estado Plurinacional'
      : row.tipoDocumento === 'DECRETO' ? 'Decreto Supremo'
      : 'Resolución Cameral',
    authors: row.organo,
    status: row.tipoDocumento === 'LEY' ? 'Promulgada' : 'Vigente',
    dataPublicacao: row.fecha,
    sourceUrl: 'https://www.abo.gob.bo',
  }))
}
