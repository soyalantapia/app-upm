import type { NewsItem, Relevance, Topic } from '../../types.js'
import { loadStaticJson, truncateExcerpt } from '../util.js'

// Cámara de Diputados AR · Expedientes históricos (períodos 129 a 137).
// Dataset CKAN datos.hcdn.gob.ar: 1,849 expedientes legislativos del
// Congreso Nacional desde 2002 hasta 2019, curados en
// client/public/data/hcdn-exp.json.
//
// Portado de client/src/lib/sources/expedientes-hcdn.ts → mismo mapeo e ids
// idénticos (ar-exp-<expediente>) para que el dedupe del front colapse
// server/cliente en uno.

type Expediente = {
  expediente?: string // ej "1195-D-2019"
  numero?: string
  origen?: string // "D" Diputados, "S" Senado, "PE" Poder Ejecutivo, "JGM" Jefatura
  anio?: string
  titulo?: string
}

const ORIGEN_LABEL: Record<string, string> = {
  D: 'Cámara de Diputados',
  S: 'Senado de la Nación',
  PE: 'Poder Ejecutivo',
  JGM: 'Jefatura de Gabinete',
  OV: 'Otros',
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|ecolog|residuo|hidrocarbur|biolog|forestal/i.test(t)) return 'ambiente'
  if (/corredor|biocean|infraestructur|vial|ferrovi|ruta|transport|portuari/i.test(t)) return 'corredores-bioceanicos'
  if (/río uruguay/i.test(t)) return 'rio-uruguay'
  if (/mercosur|integraci|cooperaci/i.test(t)) return 'integracion-regional'
  if (/género|paridad|mujer|violencia|trata/i.test(t)) return 'genero'
  if (/educac|escolar|universidad|enseñan/i.test(t)) return 'educacion'
  if (/salud|sanitar|hospital|prevenc|patolog|farmac/i.test(t)) return 'salud'
  if (/energ|eléctric|combust|petró|gas natural|nuclear/i.test(t)) return 'energia'
  if (/seguridad|defensa|fronteri|polic|narcot/i.test(t)) return 'seguridad'
  if (/comerci|fiscal|tribut|impuesto|deuda|presupuest|aduan|inversi|economi/i.test(t)) return 'economia-regional'
  if (/relaciones exteriores|tratado|internacional|diplomát|embajad/i.test(t)) return 'rrii'
  return 'integracion-regional'
}

function detectRelevance(titulo: string): Relevance {
  const t = (titulo || '').toLowerCase()
  if (/presupuesto|emergenc|reforma|deuda|c[oó]digo|emergencia/i.test(t)) return 'alta'
  if (/declar[aá]ci[oó]n|homenaje|conmemora/i.test(t)) return 'baja'
  return 'media'
}

export async function fetchExpedientesHCDN(staticBase: string, limit = 80): Promise<NewsItem[]> {
  const data = await loadStaticJson<Expediente[]>('hcdn-exp', staticBase)
  if (!Array.isArray(data)) return []
  // Ya viene ordenado por año desc; tomamos los primeros
  return data.slice(0, limit).map(mapExpediente).filter((x): x is NewsItem => x !== null)
}

function mapExpediente(r: Expediente): NewsItem | null {
  const exp = (r.expediente ?? '').trim()
  const titulo = (r.titulo ?? '').trim()
  if (!exp || !titulo) return null
  const anio = (r.anio ?? '').trim()
  const origen = (r.origen ?? '').trim()
  const origenLabel = ORIGEN_LABEL[origen] ?? origen ?? 'Congreso'
  // Sin fecha exacta, usamos enero del año declarado
  const fecha = anio ? `${anio}-01-01` : new Date().toISOString().slice(0, 10)
  const titleClean = titulo.length > 110 ? titulo.slice(0, 107) + '…' : titulo

  return {
    id: `ar-exp-${exp.replace(/[^a-zA-Z0-9]/g, '-')}`,
    title: `Expediente ${exp} · ${titleClean}`,
    country: 'AR',
    topic: detectTopic(titulo),
    type: 'comunicado',
    date: fecha,
    relevance: detectRelevance(titulo),
    excerpt: truncateExcerpt(titulo),
    source: `Cámara de Diputados AR · Expediente · ${origenLabel}`,
    fullText: titulo,
    status: `Expediente ${exp}`,
    tipoDocumento: `Expediente ${exp}`,
    tipoConteudo: origenLabel,
    dataPublicacao: fecha,
    keywords: [origenLabel, anio].filter(Boolean),
  }
}
