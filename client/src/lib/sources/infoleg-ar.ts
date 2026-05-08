import type { DocType, NewsItem, Topic } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

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
  organismoMatch?: RegExp                  // filtrar por organismo emisor
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
    apiDetailUrl: urlOriginal || undefined,
  }
}

// Enrich on-demand: hace fetch al HTML de infoleg.gob.ar y extrae el texto
// completo de la norma (considerandos, articulado, firmante).
// Reemplaza el `fullText` resumido por la versión completa.
export async function enrichInfolegItem(item: NewsItem, signal?: AbortSignal): Promise<NewsItem> {
  if (!item.apiDetailUrl) return item
  try {
    const res = await fetchWithCorsFallback(item.apiDetailUrl, { signal, headers: { Accept: 'text/html' } })
    if (!res.ok) return item
    // El HTML de infoleg viene en latin-1 con codificación legacy.
    const buf = await res.arrayBuffer()
    let html = new TextDecoder('utf-8').decode(buf)
    // Si vemos chars raros, re-decodificar como latin-1 (Windows-1252)
    if (/Ã³|Ã­|Ã¡|Â°/.test(html.slice(0, 500))) {
      html = new TextDecoder('windows-1252').decode(buf)
    }
    const fullText = extractInfolegText(html)
    if (!fullText || fullText.length < 200) return item
    // Detectar firmante en las últimas 8 líneas (suele ser el firmante de la norma)
    const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean)
    const tail = lines.slice(-10).join(' ')
    const firmanteMatch = tail.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})\s*(?:NOTA|$)/)
    const firmante = firmanteMatch ? firmanteMatch[1] : undefined

    return {
      ...item,
      fullText,
      excerpt: fullText.length > 600 ? fullText.slice(0, 597) + '…' : fullText,
      authors: firmante ? `${item.authors ?? ''} · Firmante: ${firmante}`.replace(/^ · /, '') : item.authors,
    }
  } catch {
    return item
  }
}

// Convierte el HTML de infoleg.gob.ar a texto plano legible.
function extractInfolegText(html: string): string {
  let text = html
  // Quitar scripts y styles
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '')
  // Body solamente
  const m = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (m) text = m[1]
  // Convertir <br>, <p>, <div> a saltos de línea
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/?(p|div|tr|li)[^>]*>/gi, '\n')
  // Remover el resto de tags
  text = text.replace(/<[^>]+>/g, '')
  // Decodificar entidades HTML básicas
  const entities: Record<string, string> = {
    '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&apos;': "'",
    '&lt;': '<', '&gt;': '>',
    '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú',
    '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú',
    '&ntilde;': 'ñ', '&Ntilde;': 'Ñ', '&uuml;': 'ü', '&Uuml;': 'Ü',
    '&ordf;': 'ª', '&ordm;': 'º', '&iexcl;': '¡', '&iquest;': '¿',
    '&deg;': '°', '&middot;': '·',
  }
  for (const [k, v] of Object.entries(entities)) {
    text = text.split(k).join(v)
  }
  // Numeric entities: &#243; → ó, &#8220; → "
  text = text.replace(/&#(\d+);/g, (_, n) => {
    try { return String.fromCharCode(parseInt(n, 10)) } catch { return '' }
  })
  text = text.replace(/&#x([0-9a-f]+);/gi, (_, h) => {
    try { return String.fromCharCode(parseInt(h, 16)) } catch { return '' }
  })
  // Normalizar espacios y saltos
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n[ \t]+/g, '\n')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
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

// Fetchers por organismo emisor argentino · útil para destacar fuentes específicas
export function fetchMercosurComercioAR(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 60, signal: opts?.signal, organismoMatch: /COMERCIO DEL MERCOSUR/i })
}

export function fetchBCRAArgentina(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 40, signal: opts?.signal, organismoMatch: /BANCO CENTRAL/i })
}

export function fetchSaludArgentina(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 30, signal: opts?.signal, organismoMatch: /MINISTERIO DE SALUD|ADM\.NAC\.DE MEDICAMENTOS/i })
}

export function fetchEconomiaArgentina(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 30, signal: opts?.signal, organismoMatch: /MINISTERIO DE ECONOMIA|AGENCIA DE RECAUDACION/i })
}

export function fetchSeguridadArgentina(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 25, signal: opts?.signal, organismoMatch: /MINISTERIO DE SEGURIDAD|MINISTERIO DEL INTERIOR/i })
}

export function fetchEnergiaArgentina(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 25, signal: opts?.signal, organismoMatch: /SECRETARIA DE ENERGIA|ENTE NACIONAL REGULADOR DEL GAS|ENTE NACIONAL REGULADOR DE LA ELECTRICIDAD/i })
}

export function fetchComunicacionesARorg(opts?: { limit?: number; signal?: AbortSignal }) {
  return fetchInfolegArgentina({ limit: opts?.limit ?? 20, signal: opts?.signal, organismoMatch: /ENTE NACIONAL DE COMUNICACIONES/i })
}
