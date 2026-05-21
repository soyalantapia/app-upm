import type { DocType, NewsItem, Relevance, Topic } from '@/lib/types'

// Honorable Senado de la Nación Argentina · proyectos en trámite.
// Dataset embebido curado con 20 proyectos de la cámara alta argentina
// firmados por senadores activos (Snopek, Lousteau, Cobos, De la Sota, etc.).
// Cubre el gap que tenía el corpus que solo incluía HCDN.

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

const PUBLIC_BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '')
const DATA_URL = `${PUBLIC_BASE}/data/senado-ar.json`

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

export async function fetchSenadoAR(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 50
  try {
    const res = await fetch(DATA_URL, { signal: opts?.signal })
    if (!res.ok) throw new Error(`Senado AR data error: ${res.status}`)
    const data = (await res.json()) as SenadoData
    return data.items.slice(0, limit).map(row => mapRow(row))
  } catch (e) {
    if ((e as { name?: string }).name === 'AbortError') throw e
    throw new Error(`Senado AR fetch failed: ${String(e).slice(0, 100)}`)
  }
}

function mapRow(r: SenadoRow): NewsItem {
  return {
    id: r.id,
    title: r.title,
    country: 'AR',
    topic: detectTopic(r.title + ' ' + r.ementa),
    type: (r.tipo as DocType) ?? 'ley',
    date: r.fecha,
    relevance: detectRelevance(r.estado, r.tipo),
    excerpt: r.ementa.length > 600 ? r.ementa.slice(0, 597) + '…' : r.ementa,
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
