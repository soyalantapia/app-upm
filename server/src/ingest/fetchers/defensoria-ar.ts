import type { NewsItem, Relevance, Topic } from '../../types.js'
import { loadStaticJson, truncateExcerpt } from '../util.js'

// Defensoría del Pueblo AR · Resoluciones y actuaciones.
// 10 actuaciones curadas de áreas clave: salud, ambiente, derechos humanos,
// pueblos originarios, niñez, personas mayores, servicios públicos.
// Mismo mapeo que client/src/lib/sources/defensoria-ar.ts → ids idénticos
// (row.id tal cual) para que el dedupe del front colapse server/cliente en uno.

type DPNRow = {
  id: string
  tipoDocumento: string
  title: string
  fecha: string
  area: string
  ementa: string
}

type DPNData = { fuente: string; url: string; fetchedAt: string; items: DPNRow[] }

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/ambient|contaminaci|cuenca|sustent/i.test(t)) return 'ambiente'
  if (/salud|sanitari|mental|hospital|medic|pami/i.test(t)) return 'salud'
  if (/educac|escolar|ense[ñn]/i.test(t)) return 'educacion'
  if (/g[ée]nero|mujer|violencia/i.test(t)) return 'genero'
  if (/ind[íi]gena|originarios|wichi|mapuche/i.test(t)) return 'integracion-regional'
  if (/seguridad|polic|comisari|detenid|institucional/i.test(t)) return 'seguridad'
  if (/energ|tarifa|el[ée]ctric|gas/i.test(t)) return 'energia'
  if (/discapacidad|inclusi[óo]n|adultos mayores|ni[ñn]ez|infanc/i.test(t)) return 'salud'
  if (/informaci[óo]n p[úu]blica|civiles|pol[íi]ticos/i.test(t)) return 'integracion-regional'
  return 'integracion-regional'
}

function detectRelevance(area: string): Relevance {
  if (/salud|ambient|derechos humanos|libertad/i.test(area)) return 'alta'
  return 'media'
}

export async function fetchDefensoriaAR(staticBase: string, limit = 30): Promise<NewsItem[]> {
  const data = await loadStaticJson<DPNData>('defensoria-ar', staticBase)
  return data.items.slice(0, limit).map(row => ({
    id: row.id,
    title: row.title,
    country: 'AR' as const,
    topic: detectTopic(row.title + ' ' + row.ementa + ' ' + row.area),
    type: 'informe' as const,
    date: row.fecha,
    relevance: detectRelevance(row.area),
    excerpt: truncateExcerpt(row.ementa),
    source: `Defensoría del Pueblo · Argentina (${row.area})`,
    fullText: row.ementa,
    tipoDocumento: row.tipoDocumento,
    tipoConteudo: 'Resolución Defensoría',
    authors: 'Defensoría del Pueblo de la Nación',
    status: 'Vigente',
    dataPublicacao: row.fecha,
    sourceUrl: 'https://www.dpn.gob.ar',
  }))
}
