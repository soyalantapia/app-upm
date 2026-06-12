import type { NewsItem, Relevance, Topic } from '../../types.js'
import { loadStaticJson, truncateExcerpt } from '../util.js'

// Asamblea Legislativa Plurinacional de Bolivia · Leyes y Decretos.
// Portado de client/src/lib/sources/asamblea-bo.ts — mismo mapeo → ids idénticos
// (row.id del JSON estático) para que el dedupe del front colapse server/cliente.
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

export async function fetchAsambleaBO(staticBase: string, limit = 30): Promise<NewsItem[]> {
  const data = await loadStaticJson<AsambleaBOData>('asamblea-bo', staticBase)
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
    excerpt: truncateExcerpt(row.ementa),
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
