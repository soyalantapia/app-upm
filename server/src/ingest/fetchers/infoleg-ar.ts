import type { DocType, NewsItem, Topic } from '../../types.js'
import { loadStaticJson, truncateExcerpt } from '../util.js'

// Infoleg · Base de Normativa Nacional Argentina (Ministerio de Justicia).
// Portado de client/src/lib/sources/infoleg-ar.ts — mismo mapeo a NewsItem e
// ids idénticos (ar-ley-<num> / ar-norm-<id>) para que el dedupe del front
// colapse server/cliente en uno.
//
// Lee el JSON estático curado client/public/data/infoleg-ar.json
// (672 Leyes 2015+ + 500 Decretos/Decisiones Administrativas 2024+).

type InfolegItem = {
  id?: string
  tipo?: string                // "Ley" | "Decreto" | "Decisión Administrativa"
  numero?: string
  organismo?: string
  fecha?: string               // YYYY-MM-DD
  titulo?: string
  sumario?: string
  texto?: string               // texto resumido (titulo_sumario del CSV)
  textoCompleto?: string       // texto íntegro pre-descargado de infoleg.gob.ar
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

type InfolegTipo = 'Ley' | 'Decreto' | 'Decisión Administrativa' | 'Resolución' | 'Disposición' | 'Comunicación' | 'Acordada' | 'Decreto/Ley' | 'Directiva' | 'Circular'

export async function fetchInfolegArgentina(staticBase: string, opts?: {
  limit?: number
  onlyTipo?: InfolegTipo
  organismoMatch?: RegExp                  // filtrar por organismo emisor
}): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 100
  const data = await loadStaticJson<InfolegItem[]>('infoleg-ar', staticBase)
  if (!Array.isArray(data)) return []
  let items = data
  if (opts?.onlyTipo) items = items.filter(i => i.tipo === opts.onlyTipo)
  if (opts?.organismoMatch) items = items.filter(i => opts.organismoMatch!.test(i.organismo ?? ''))
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
  // Preferimos el texto íntegro pre-descargado (textoCompleto) sobre el resumen.
  // 1034 de los 1467 items tienen textoCompleto desde infoleg.gob.ar.
  const fullText = (r.textoCompleto && r.textoCompleto.length > 200)
    ? r.textoCompleto
    : (texto || sumario || titulo)
  const sourceUrl = (r.urlActualizado || r.urlOriginal || '').trim().replace(/^http:/, 'https:') || undefined
  // urlOriginal apunta a infoleg.gob.ar/infolegInternet/anexos/.../norma.htm
  // que sirve el HTML completo de la norma con considerandos y articulado.
  // Lo usamos como apiDetailUrl para enriquecer on-demand al abrir el detalle.
  const urlOriginal = (r.urlOriginal ?? '').trim().replace(/^http:/, 'https:')

  return {
    id,
    title: `${ident} · ${titleClean || sumario.slice(0, 100)}`,
    country: 'AR',
    topic: detectTopic(`${titulo} ${sumario} ${texto}`),
    type: TIPO_TO_DOC[tipo] ?? 'reglamento',
    date: fecha || new Date().toISOString().slice(0, 10),
    relevance: detectRelevance(tipo, sumario),
    excerpt: truncateExcerpt(fullText),
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
    apiDetailUrl: urlOriginal || undefined,
  }
}

// Atajos por tipo de norma argentina · mismos límites que el FETCHERS del cliente
export async function fetchLeyesInfolegArgentina(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 400, onlyTipo: 'Ley' })
}

export async function fetchDecretosInfolegArgentina(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 80, onlyTipo: 'Decreto' })
}

export async function fetchDecisionesAdminInfolegArgentina(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 50, onlyTipo: 'Decisión Administrativa' })
}

export async function fetchResolucionesInfolegArgentina(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 100, onlyTipo: 'Resolución' })
}

export async function fetchDisposicionesInfolegArgentina(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 50, onlyTipo: 'Disposición' })
}

export async function fetchComunicacionesInfolegArgentina(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 30, onlyTipo: 'Comunicación' })
}

export async function fetchAcordadasInfolegArgentina(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 30, onlyTipo: 'Acordada' })
}

export async function fetchDirectivasInfolegArgentina(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 50, onlyTipo: 'Directiva' })
}

export async function fetchCircularesInfolegArgentina(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 30, onlyTipo: 'Circular' })
}

// Fetchers por organismo emisor argentino · útil para destacar fuentes específicas
export async function fetchMercosurComercioAR(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 60, organismoMatch: /COMERCIO DEL MERCOSUR/i })
}

export async function fetchBCRAArgentina(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 40, organismoMatch: /BANCO CENTRAL/i })
}

export async function fetchSaludArgentina(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 30, organismoMatch: /MINISTERIO DE SALUD|ADM\.NAC\.DE MEDICAMENTOS/i })
}

export async function fetchEconomiaArgentina(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 30, organismoMatch: /MINISTERIO DE ECONOMIA|AGENCIA DE RECAUDACION/i })
}

export async function fetchSeguridadArgentina(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 25, organismoMatch: /MINISTERIO DE SEGURIDAD|MINISTERIO DEL INTERIOR/i })
}

export async function fetchEnergiaArgentina(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 25, organismoMatch: /SECRETARIA DE ENERGIA|ENTE NACIONAL REGULADOR DEL GAS|ENTE NACIONAL REGULADOR DE LA ELECTRICIDAD/i })
}

export async function fetchComunicacionesARorg(staticBase: string): Promise<NewsItem[]> {
  return fetchInfolegArgentina(staticBase, { limit: 20, organismoMatch: /ENTE NACIONAL DE COMUNICACIONES/i })
}
