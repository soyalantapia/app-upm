import type { NewsItem, Relevance, Topic } from '../../types.js'
import { loadStaticJson, truncateExcerpt } from '../util.js'

// Ministerio de Trabajo Argentina · Convenios Colectivos de Trabajo homologados.
// Portado de client/src/lib/sources/convenios-ar.ts — mismo mapeo → ids idénticos
// (row.id del JSON) para que el dedupe del front colapse server/cliente en uno.
// Dataset estático curado: client/public/data/convenios-ar.json (15 convenios).

type CCTRow = {
  id: string
  tipoDocumento: string
  title: string
  fecha: string
  sindicato: string
  camara: string
  ementa: string
}

type CCTData = {
  fuente: string
  url: string
  fetchedAt: string
  items: CCTRow[]
}

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/educac|docente|universidad|investigaci/i.test(t)) return 'educacion'
  if (/salud|sanitar|hospital|medic/i.test(t)) return 'salud'
  if (/energ|el[ée]ctric|minero|min[ée]ric/i.test(t)) return 'energia'
  if (/g[ée]nero|mujer|paridad|licencia.*parental|violencia/i.test(t)) return 'genero'
  if (/comerc|tribut|fiscal|industria|bancario|financ/i.test(t)) return 'economia-regional'
  if (/transport|log[íi]stica|camioner|automotor|tranv|urbano/i.test(t)) return 'corredores-bioceanicos'
  if (/ambient|sustent/i.test(t)) return 'ambiente'
  return 'economia-regional'
}

function detectRelevance(title: string, sindicato: string): Relevance {
  const t = (title + ' ' + sindicato).toLowerCase()
  if (/paritar|piso salarial|cl[áa]usula gatillo|federal|nacional/i.test(t)) return 'alta'
  return 'media'
}

export async function fetchConveniosAR(staticBase: string, limit = 30): Promise<NewsItem[]> {
  const data = await loadStaticJson<CCTData>('convenios-ar', staticBase)
  return data.items.slice(0, limit).map(row => ({
    id: row.id,
    title: row.title,
    country: 'AR' as const,
    topic: detectTopic(row.title + ' ' + row.ementa),
    type: 'convenio' as const,
    date: row.fecha,
    relevance: detectRelevance(row.title, row.sindicato),
    excerpt: truncateExcerpt(row.ementa),
    source: `Ministerio de Trabajo AR · ${row.sindicato}`,
    fullText: row.ementa + '\n\nContraparte: ' + row.camara,
    tipoDocumento: row.tipoDocumento,
    tipoConteudo: 'Convenio Colectivo de Trabajo',
    authors: row.sindicato + ' / ' + row.camara,
    status: 'Homologado',
    dataPublicacao: row.fecha,
    sourceUrl: 'https://www.argentina.gob.ar/trabajo/convenios-colectivos',
  }))
}
