import type { DocType, NewsItem, Topic } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// Normativa Nacional · Presidencia de la República de Colombia (DAPRE).
// Dataset Socrata '88h2-dykw': 11,486 documentos oficiales con PDF.
//   - 10,105 DECRETOS
//   - 797 LEYES
//   - 296 RESOLUCIONES
//   - 95 DIRECTIVAS
//   - 27 ACTOS LEGISLATIVOS
//   - 89 RESOLUCIONES DE NOMBRAMIENTOS
//   - 57 CIRCULARES
//
// Cada item trae:
//   - titulo: ej "Ley 594 del 14 de julio de 2000"
//   - descripcion: descripción completa
//   - tipo: LEYES | DECRETOS | RESOLUCIONES | etc.
//   - fecha: ISO con hora
//   - url: link al PDF en dapre.presidencia.gov.co
//
// CORS: ✅ datos.gov.co abre Access-Control-Allow-Origin: *

const ENDPOINT = 'https://www.datos.gov.co/resource/88h2-dykw.json'

type NormaRow = {
  titulo?: string
  descripcion?: string
  tipo?: string                // "LEYES" | "DECRETOS" | "RESOLUCIONES" | "ACTOS LEGISLATIVOS" | etc.
  fecha?: string               // ISO con hora
  url?: string                 // PDF oficial
}

const TIPO_TO_DOC: Record<string, DocType> = {
  LEYES: 'ley',
  DECRETOS: 'decreto',
  RESOLUCIONES: 'reglamento',
  DIRECTIVAS: 'comunicado',
  CIRCULARES: 'comunicado',
  'ACTOS LEGISLATIVOS': 'reglamento',
  CONPES: 'informe',
  'CONSTITUCIÓN POLÍTICA': 'ley',
  'AGENDA REGULATORIA': 'informe',
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|ecosist|biolog|residuo|forestal|conservaci/i.test(t)) return 'ambiente'
  if (/integra|mercosur|cooperaci|amistad|complement/i.test(t)) return 'integracion-regional'
  if (/género|paridad|mujer|equidad|feminin|violencia/i.test(t)) return 'genero'
  if (/educac|escolar|universidad|enseñan|científ/i.test(t)) return 'educacion'
  if (/salud|sanitar|hospital|epidem|vacuna|farmac/i.test(t)) return 'salud'
  if (/energ|el[ée]ctric|combust|petról|hidrocarb|gas natural|renovab/i.test(t)) return 'energia'
  if (/segurid|defens|fronter|polic|narcot|extradic|conflicto armado|orden público/i.test(t)) return 'seguridad'
  if (/comerc|tribut|fiscal|impuesto|presupuest|regalía|inversi[oó]n|cr[eé]dito|aduan/i.test(t)) return 'economia-regional'
  if (/internacional|tratado|convenio|extradic|ratifica|relaciones exteriores/i.test(t)) return 'rrii'
  if (/corredor|infraestructur|vial|transport|portuari|ferrov|aeropuert/i.test(t)) return 'corredores-bioceanicos'
  return 'integracion-regional'
}

function detectRelevance(tipo: string, descripcion: string): 'alta' | 'media' | 'baja' {
  const t = (tipo || '').toUpperCase()
  const d = (descripcion || '').toLowerCase()
  if (t === 'CONSTITUCIÓN POLÍTICA' || t === 'ACTOS LEGISLATIVOS') return 'alta'
  if (/presupuesto|emergencia|reforma|deuda|paz|reparaci[oó]n integral/i.test(d)) return 'alta'
  if (t === 'LEYES') return 'alta'
  if (t === 'DECRETOS') return 'media'
  if (/declaraci[oó]n|homenaje|conmemora/i.test(d)) return 'baja'
  return 'media'
}

export async function fetchPresidenciaColombia(opts?: {
  limit?: number
  signal?: AbortSignal
  tipos?: string[]                     // por defecto todos los relevantes
}): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 50
  const tipos = opts?.tipos ?? ['LEYES','DECRETOS','ACTOS LEGISLATIVOS','RESOLUCIONES','CONSTITUCIÓN POLÍTICA']
  const tiposClause = tipos.map(t => `'${t}'`).join(',')
  const params = new URLSearchParams({
    $limit: String(limit),
    $where: `tipo IN (${tiposClause}) AND fecha IS NOT NULL`,
    $order: 'fecha DESC',
  })
  const res = await fetchWithCorsFallback(`${ENDPOINT}?${params.toString()}`, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Presidencia CO API error: ${res.status}`)
  const data = (await res.json()) as NormaRow[]
  if (!Array.isArray(data)) return []
  return data.map(mapNorma).filter((x): x is NewsItem => x !== null)
}

// Atajo para traer solo leyes (con actos legislativos y constitución).
export function fetchLeyesPresidenciaColombia(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchPresidenciaColombia({
    limit: opts?.limit ?? 100,
    signal: opts?.signal,
    tipos: ['LEYES', 'ACTOS LEGISLATIVOS', 'CONSTITUCIÓN POLÍTICA'],
  })
}

// Atajo para traer solo decretos y resoluciones recientes.
export function fetchDecretosPresidenciaColombia(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchPresidenciaColombia({
    limit: opts?.limit ?? 40,
    signal: opts?.signal,
    tipos: ['DECRETOS', 'RESOLUCIONES'],
  })
}

function mapNorma(r: NormaRow): NewsItem | null {
  const titulo = (r.titulo ?? '').trim()
  if (!titulo) return null
  const descripcion = (r.descripcion ?? '').trim()
  const tipo = (r.tipo ?? '').trim().toUpperCase()
  const fecha = (r.fecha ?? '').slice(0, 10)
  const pdfUrl = (r.url ?? '').trim()

  // ID estable: tipo + slug del título
  const slug = titulo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const tipoSlug = tipo.toLowerCase().replace(/\s+/g, '-')
  const id = `co-pres-${tipoSlug}-${slug}`

  const titleClean = titulo.length > 110 ? titulo.slice(0, 107) + '…' : titulo
  const tipoEs = tipo === 'LEYES' ? 'Ley'
    : tipo === 'DECRETOS' ? 'Decreto'
    : tipo === 'RESOLUCIONES' ? 'Resolución'
    : tipo === 'ACTOS LEGISLATIVOS' ? 'Acto Legislativo'
    : tipo === 'CONSTITUCIÓN POLÍTICA' ? 'Constitución'
    : 'Norma'
  return {
    id,
    title: `${tipoEs} · ${titleClean}`,
    country: 'CO',
    topic: detectTopic(descripcion + ' ' + titulo),
    type: TIPO_TO_DOC[tipo] ?? 'reglamento',
    date: fecha || new Date().toISOString().slice(0, 10),
    relevance: detectRelevance(tipo, descripcion),
    excerpt: descripcion.length > 600 ? descripcion.slice(0, 597) + '…' : (descripcion || titulo),
    source: `Presidencia de la República de Colombia · ${tipoEs} (DAPRE)`,
    fullText: descripcion || titulo,
    status: 'Vigente',
    tipoDocumento: tipoEs,
    sourceUrl: pdfUrl || undefined,
    pdfUrl: pdfUrl || undefined,
    dataPublicacao: r.fecha,
  }
}
