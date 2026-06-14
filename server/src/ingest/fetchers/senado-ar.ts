import type { DocType, NewsItem, Relevance, Topic } from '../../types.js'
import { loadStaticJson, truncateExcerpt } from '../util.js'

// Honorable Senado de la Nación Argentina · proyectos en trámite.
// Dataset embebido curado con 20 proyectos de la cámara alta argentina
// firmados por senadores activos (Snopek, Lousteau, Cobos, De la Sota, etc.).
// Mismo mapeo e ids que client/src/lib/sources/senado-ar.ts → dedupe del front
// colapsa server/cliente en uno.

type SenadoRow = {
  id: string
  tipoDocumento: string
  title: string
  fecha: string
  comision: string
  estado: string
  autores: string
  tipo: string
  ementa: string
}

type SenadoData = {
  fuente: string
  url: string
  fetchedAt: string
  items: SenadoRow[]
}

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/ambient|bosque|humedal|pesca|residuo|sustent|biolog/i.test(t)) return 'ambiente'
  if (/jubila|pension|previsi[óo]n|movilidad|cuidad/i.test(t)) return 'salud'
  if (/educac|escolar|universidad|ense[ñn]/i.test(t)) return 'educacion'
  if (/salud|sanitar|hospital|medic/i.test(t)) return 'salud'
  if (/energ|hidr[óo]geno|el[ée]ctric|petr[óo]l|gas|litio|miner/i.test(t)) return 'energia'
  if (/genero|mujer|paridad|micaela|violencia/i.test(t)) return 'genero'
  if (/internacional|tratado|exterior|mercosur|diplom[áa]ti/i.test(t)) return 'rrii'
  if (/seguridad|defens|polic|justici|v[íi]ctim/i.test(t)) return 'seguridad'
  if (/comerc|tribut|fiscal|industria|trabajo/i.test(t)) return 'economia-regional'
  if (/transport|infraestruct|ferrov|nav/i.test(t)) return 'corredores-bioceanicos'
  if (/integraci[óo]n|cooperaci[óo]n/i.test(t)) return 'integracion-regional'
  return 'integracion-regional'
}

function detectRelevance(estado: string, tipo: string): Relevance {
  const t = (estado + ' ' + tipo).toLowerCase()
  if (/dictamen|recinto|votaci/i.test(t)) return 'alta'
  if (/comisi[óo]n/i.test(t)) return 'media'
  return 'baja'
}

export async function fetchSenadoAR(staticBase: string, limit = 30): Promise<NewsItem[]> {
  const data = await loadStaticJson<SenadoData>('senado-ar', staticBase)
  return data.items.slice(0, limit).map(row => mapRow(row))
}

function mapRow(r: SenadoRow): NewsItem {
  return {
    id: r.id,
    title: r.title,
    country: 'AR' as const,
    topic: detectTopic(r.title + ' ' + r.ementa),
    type: (r.tipo as DocType) ?? 'ley',
    date: r.fecha,
    relevance: detectRelevance(r.estado, r.tipo),
    excerpt: truncateExcerpt(r.ementa),
    source: `Honorable Senado de la Nación · Argentina (${r.tipoDocumento})`,
    fullText: r.ementa,
    tipoDocumento: r.tipoDocumento,
    tipoConteudo: 'Proyecto de ley',
    authors: r.autores,
    status: r.estado,
    comision: r.comision,
    dataPublicacao: r.fecha,
    sourceUrl: 'https://www.senado.gob.ar/parlamentario',
  }
}
