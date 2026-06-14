import type { NewsItem, Relevance, Topic } from '../../types.js'
import { loadStaticJson, truncateExcerpt } from '../util.js'

// Cámara de Senadores de la República del Paraguay · Proyectos y Leyes.
// Fuente curada con datos representativos del parlamento paraguayo.
// Cubre: corredor bioceánico, ITAIPU/YACYRETÁ, ambiente Pantanal,
// Mercosur, Triple Frontera, género, pueblos indígenas.
// Mismo mapeo que client/src/lib/sources/senado-py.ts → ids idénticos
// para que el dedupe del front colapse server/cliente en uno.

type SenadoPYRow = {
  id: string
  tipoDocumento: string
  title: string
  fecha: string
  comision: string
  ementa: string
}

type SenadoPYData = { fuente: string; url: string; fetchedAt: string; items: SenadoPYRow[] }

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/bioce[aá]nico|corredor|paranacuê|vial|puente/i.test(t)) return 'corredores-bioceanicos'
  if (/mercosur|integraci[oó]n|arancel|cmc|bloc/i.test(t)) return 'integracion-regional'
  if (/pantanal|ambient|cuenca|humedal|deforest|chaco|contaminac/i.test(t)) return 'ambiente'
  if (/energi|itaipu|yacyret[aá]|el[eé]ctric|solar/i.test(t)) return 'energia'
  if (/g[eé]nero|mujer|paridad|igualdad|violencia/i.test(t)) return 'genero'
  if (/salud|hospital|sanitari/i.test(t)) return 'salud'
  if (/educaci[oó]n|becas|escolar|formaci[oó]n/i.test(t)) return 'educacion'
  if (/seguridad|narco|frontera|criminal|crimen/i.test(t)) return 'seguridad'
  if (/ind[ií]gena|originari|pueblo|ayoreo|nivaclé|qom|wichi/i.test(t)) return 'integracion-regional'
  if (/econom|comercio|aduanar|exportacion|importacion|soja/i.test(t)) return 'economia-regional'
  if (/rio|uruguay|parana/i.test(t)) return 'rio-uruguay'
  return 'mercosur'
}

function detectRelevance(tipo: string, comision: string, text: string): Relevance {
  if (/LEY/.test(tipo)) return 'alta'
  if (/bioce[aá]nico|itaipu|frontera|pantanal|ind[ií]gena/i.test(text)) return 'alta'
  if (/mercosur|energia|ambiente|g[eé]nero/i.test(text)) return 'alta'
  if (/Relaciones Exteriores|Energía|Ambiente/i.test(comision)) return 'media'
  return 'media'
}

export async function fetchSenadoPY(staticBase: string, limit = 30): Promise<NewsItem[]> {
  const data = await loadStaticJson<SenadoPYData>('senado-py', staticBase)
  return data.items.slice(0, limit).map(row => ({
    id: row.id,
    title: row.title,
    country: 'PY' as const,
    topic: detectTopic(row.title + ' ' + row.ementa),
    type: row.tipoDocumento === 'LEY' ? 'ley' as const : 'decreto' as const,
    date: row.fecha,
    relevance: detectRelevance(row.tipoDocumento, row.comision, row.title + ' ' + row.ementa),
    excerpt: truncateExcerpt(row.ementa),
    source: `Senado de la República del Paraguay · Comisión de ${row.comision}`,
    fullText: row.ementa,
    tipoDocumento: row.tipoDocumento,
    tipoConteudo: row.tipoDocumento === 'LEY' ? 'Ley promulgada'
      : row.tipoDocumento === 'RESOLUCION' ? 'Resolución del Senado'
      : row.tipoDocumento === 'DECLARACION' ? 'Declaración del Senado'
      : 'Proyecto de Ley',
    comision: row.comision,
    authors: `Comisión de ${row.comision} · Senado de la República del Paraguay`,
    status: row.tipoDocumento === 'LEY' ? 'Promulgada' : 'En trámite parlamentario',
    dataPublicacao: row.fecha,
    sourceUrl: 'https://www.senado.gov.py',
  }))
}
