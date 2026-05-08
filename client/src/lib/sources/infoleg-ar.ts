import type { DocType, NewsItem, Topic } from '@/lib/types'

// Infoleg · Base de Normativa Nacional Argentina (Ministerio de Justicia)
// Dataset oficial CKAN: 27,599 Leyes + 75,377 Decretos + 31,084 Decisiones Administrativas.
//
// Embeddado: 672 Leyes (2015+) + 500 Decretos/Decisiones Administrativas más
// recientes (2024+) en public/data/infoleg-ar.json.
//
// Para regenerar:
//   curl -L "https://datos.jus.gob.ar/dataset/.../base_infoleg_normativa_nacional.zip" -o /tmp/infoleg.zip
//   unzip /tmp/infoleg.zip -d /tmp/infoleg/
//   python3 scripts/build-infoleg.py > client/public/data/infoleg-ar.json

type InfolegItem = {
  id?: string
  tipo?: string                // "Ley" | "Decreto" | "Decisión Administrativa"
  numero?: string
  organismo?: string
  fecha?: string               // YYYY-MM-DD
  titulo?: string
  sumario?: string
  texto?: string               // texto resumido (puede ser largo)
  urlOriginal?: string
  urlActualizado?: string
  numBoletin?: string
  fechaBoletin?: string
}

const TIPO_TO_DOC: Record<string, DocType> = {
  Ley: 'ley',
  Decreto: 'decreto',
  'Decisión Administrativa': 'decreto',
  Resolución: 'reglamento',
  Disposición: 'reglamento',
  Comunicación: 'comunicado',
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|ecolog|residuo|hidrocarbur|biolog|forestal/i.test(t)) return 'ambiente'
  if (/corredor|biocean|infraestructur|vial|ferrovi|ruta nacional|transport|portuari/i.test(t)) return 'corredores-bioceanicos'
  if (/río uruguay/i.test(t)) return 'rio-uruguay'
  if (/mercosur|integraci|cooperaci/i.test(t)) return 'integracion-regional'
  if (/género|paridad|mujer|violencia|trata/i.test(t)) return 'genero'
  if (/educac|escolar|universidad|enseñan/i.test(t)) return 'educacion'
  if (/salud|sanitar|hospital|prevenc|patolog|farmac|epidem/i.test(t)) return 'salud'
  if (/energ|eléctric|combust|petró|hidrocarb|gas natural|nuclear/i.test(t)) return 'energia'
  if (/seguridad|defensa|fronteri|polic|narcot|armad/i.test(t)) return 'seguridad'
  if (/comerci|fiscal|tribut|impuesto|econ[oó]mic|deuda|presupuest|aduan|inversi/i.test(t)) return 'economia-regional'
  if (/relaciones exteriores|tratado|internacional|diplomát|embajad/i.test(t)) return 'rrii'
  return 'integracion-regional'
}

function detectRelevance(tipo: string, sumario: string): 'alta' | 'media' | 'baja' {
  const s = (sumario || '').toLowerCase()
  if (tipo === 'Ley') return 'alta'
  if (/presupuesto|emergencia|reforma|deuda|c[oó]digo|dnu/i.test(s)) return 'alta'
  if (tipo === 'Decreto') return 'media'
  return 'baja'
}

function basePath(): string {
  try {
    return (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  } catch {
    return ''
  }
}

type InfolegTipo = 'Ley' | 'Decreto' | 'Decisión Administrativa' | 'Resolución' | 'Disposición' | 'Comunicación' | 'Acordada' | 'Decreto/Ley' | 'Directiva' | 'Circular'

export async function fetchInfolegArgentina(opts?: {
  limit?: number
  signal?: AbortSignal
  onlyTipo?: InfolegTipo
}): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 100
  const url = `${basePath()}/data/infoleg-ar.json`
  const res = await fetch(url, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Infoleg AR (local) error: ${res.status}`)
  const data = (await res.json()) as InfolegItem[]
  if (!Array.isArray(data)) return []
  let items = data
  if (opts?.onlyTipo) items = items.filter(i => i.tipo === opts.onlyTipo)
  // Asumimos que ya viene ordenado por fecha desc, pero re-ordenamos para asegurar
  items.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
  return items.slice(0, limit).map(mapInfoleg).filter((x): x is NewsItem => x !== null)
}

function mapInfoleg(r: InfolegItem): NewsItem | null {
  const tipo = (r.tipo ?? '').trim()
  const numero = (r.numero ?? '').trim()
  const titulo = (r.titulo ?? '').trim()
  const sumario = (r.sumario ?? '').trim()
  const texto = (r.texto ?? '').trim()
  const fecha = (r.fecha ?? '').slice(0, 10)
  if (!tipo || !numero) return null

  // Para Leyes usamos el mismo id que HCDN AR (`ar-ley-{numero}`) para que el
  // dedupe del index priorice Infoleg (que tiene fecha real). HCDN viene después
  // en FETCHERS y queda descartado por ser duplicado.
  const id = tipo === 'Ley'
    ? `ar-ley-${numero}`
    : `ar-norm-${r.id ?? `${tipo}-${numero}`.toLowerCase().replace(/\W+/g, '-')}`

  const ident = `${tipo} ${numero}`
  const titleClean = titulo.length > 110 ? titulo.slice(0, 107) + '…' : titulo
  const fullText = texto || sumario || titulo
  const sourceUrl = (r.urlActualizado || r.urlOriginal || '').trim().replace(/^http:/, 'https:') || undefined

  return {
    id,
    title: `${ident} · ${titleClean || sumario.slice(0, 100)}`,
    country: 'AR',
    topic: detectTopic(`${titulo} ${sumario} ${texto}`),
    type: TIPO_TO_DOC[tipo] ?? 'reglamento',
    date: fecha || new Date().toISOString().slice(0, 10),
    relevance: detectRelevance(tipo, sumario),
    excerpt: fullText.length > 600 ? fullText.slice(0, 597) + '…' : fullText,
    source: r.organismo
      ? `Boletín Oficial · ${r.organismo} (Argentina)`
      : `Infoleg · Argentina · ${tipo}`,
    fullText,
    authors: r.organismo,
    status: tipo === 'Ley' ? 'Sancionada' : 'Vigente',
    tipoDocumento: ident,
    sourceUrl,
    pdfUrl: sourceUrl,
    dataPublicacao: fecha,
  }
}

// Atajos por tipo de norma argentina
export function fetchLeyesInfolegArgentina(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 400, signal: opts?.signal, onlyTipo: 'Ley' })
}

export function fetchDecretosInfolegArgentina(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 80, signal: opts?.signal, onlyTipo: 'Decreto' })
}

export function fetchDecisionesAdminInfolegArgentina(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 50, signal: opts?.signal, onlyTipo: 'Decisión Administrativa' })
}

export function fetchResolucionesInfolegArgentina(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 100, signal: opts?.signal, onlyTipo: 'Resolución' })
}

export function fetchDisposicionesInfolegArgentina(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 50, signal: opts?.signal, onlyTipo: 'Disposición' })
}

export function fetchComunicacionesInfolegArgentina(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 30, signal: opts?.signal, onlyTipo: 'Comunicación' })
}

export function fetchAcordadasInfolegArgentina(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 30, signal: opts?.signal, onlyTipo: 'Acordada' })
}

export function fetchDirectivasInfolegArgentina(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 50, signal: opts?.signal, onlyTipo: 'Directiva' })
}

export function fetchCircularesInfolegArgentina(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 30, signal: opts?.signal, onlyTipo: 'Circular' })
}
