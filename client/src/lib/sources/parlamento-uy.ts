import type { NewsItem, Topic, Tramitacion } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// Parlamento del Uruguay · Asuntos Entrados (proyectos al Parlamento)
// Endpoint oficial: parlamento.gub.uy/.../asuntos-entrados/json
//
// CORS: ❌ no abre Access-Control-Allow-Origin → vamos vía proxy.
// Schema:
//   Ast_FechaDeEntradaAlCuerpo: "YYYY-MM-DD"
//   Ast_Codigo: "<a href='...ficha-asunto/{id}'>{id}</a>"  (HTML, hay que parsearlo)
//   Cpt: " CSS   : 549 / 2026"  (tipo : numero / año)
//   Ast_Titulo: título completo del proyecto
//   Cpo_Codigo: "Cámara de Senadores" | "Cámara de Representantes"

const ENDPOINT = 'https://parlamento.gub.uy/camarasycomisiones/senadores/transparencia/datos-abiertos/asuntos-entrados/json?Cpo_Codigo=All'

type AsuntoUY = {
  Ast_FechaDeEntradaAlCuerpo?: string
  Ast_Codigo?: string
  Cpt?: string
  Ast_Titulo?: string
  Cpo_Codigo?: string
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|residuo|forestal|hídric|conservaci/i.test(t)) return 'ambiente'
  if (/río uruguay|cuenca del plata/i.test(t)) return 'rio-uruguay'
  if (/mercosur|integraci|cooperaci/i.test(t)) return 'integracion-regional'
  if (/corredor|infraestructur|biocean|carret|ferrov|portuari/i.test(t)) return 'corredores-bioceanicos'
  if (/género|paridad|mujer|trata|violencia/i.test(t)) return 'genero'
  if (/educa|escolar|universidad|enseñan/i.test(t)) return 'educacion'
  if (/salud|sanitar|hospital|epidem/i.test(t)) return 'salud'
  if (/energ|eléctric|petró|combust|renovab/i.test(t)) return 'energia'
  if (/segurid|defens|fronter|polic|narcotr|cárcel/i.test(t)) return 'seguridad'
  if (/comerci|tribut|fiscal|impuesto|presupuest|deuda|inversión/i.test(t)) return 'economia-regional'
  if (/relaciones exteriores|tratado|internacional|diplomát|embajad/i.test(t)) return 'rrii'
  return 'integracion-regional'
}

function detectRelevance(titulo: string, tipoCpt: string): 'alta' | 'media' | 'baja' {
  const t = (titulo + ' ' + tipoCpt).toLowerCase()
  if (/presupuesto|emergencia|reforma|deuda|c[oó]digo|rendici[oó]n de cuentas/i.test(t)) return 'alta'
  if (/declaraci[oó]n|homenaje|conmemora|reconocimiento/i.test(t)) return 'baja'
  if (/proyecto de ley/i.test(t)) return 'media'
  return 'media'
}

// "<a href='...ficha-asunto/172576'>172576</a>" → { id: "172576", url: "..." }
function parseCodigo(html?: string): { id: string; url: string } {
  if (!html) return { id: '', url: '' }
  const idMatch = html.match(/ficha-asunto\/(\d+)/)
  const urlMatch = html.match(/href=["']([^"']+)["']/)
  return {
    id: idMatch?.[1] ?? '',
    url: urlMatch?.[1] ?? '',
  }
}

// " CSS   : 549 / 2026" → { tipo: "CSS", numero: "549", anio: "2026" }
function parseCpt(cpt?: string): { tipo: string; numero: string; anio: string } {
  if (!cpt) return { tipo: '', numero: '', anio: '' }
  const trimmed = cpt.trim()
  const m = trimmed.match(/^([A-Z]+)\s*:\s*(\d+)\s*\/\s*(\d{4})/)
  if (!m) return { tipo: trimmed, numero: '', anio: '' }
  return { tipo: m[1], numero: m[2], anio: m[3] }
}

const TIPO_FULL: Record<string, string> = {
  CSS: 'Carpeta del Senado',
  CRR: 'Carpeta de Representantes',
  PRY: 'Proyecto',
  RES: 'Resolución',
  MIN: 'Minuta',
}

export async function fetchParlamentoUY(opts?: {
  limit?: number
  signal?: AbortSignal
}): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 25
  const res = await fetchWithCorsFallback(ENDPOINT, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Parlamento UY error: ${res.status}`)
  const data = (await res.json()) as AsuntoUY[]
  if (!Array.isArray(data)) return []
  // El endpoint devuelve los más recientes primero · limit y mapeamos.
  return data
    .slice(0, limit * 2)
    .map(mapAsunto)
    .filter((x): x is NewsItem => x !== null)
    .slice(0, limit)
}

function mapAsunto(r: AsuntoUY): NewsItem | null {
  const titulo = (r.Ast_Titulo ?? '').trim()
  if (!titulo) return null
  const fecha = (r.Ast_FechaDeEntradaAlCuerpo ?? '').slice(0, 10)
  const { id: codigo, url } = parseCodigo(r.Ast_Codigo)
  const { tipo, numero, anio } = parseCpt(r.Cpt)
  const cuerpo = r.Cpo_Codigo ?? 'Parlamento'
  const tipoLabel = TIPO_FULL[tipo] || tipo
  const ident = numero && anio ? `${tipoLabel} ${numero}/${anio}` : tipoLabel
  // Detectar tipo de doc · por defecto 'ley' si dice PROYECTO DE LEY en título
  const isProyectoLey = /\(PROYECTO DE LEY\)/i.test(titulo) || tipoLabel.toLowerCase().includes('proyecto')
  // URL https para evitar mixed content (la API devuelve http://)
  const sourceUrl = url ? url.replace(/^http:/, 'https:') : undefined
  return {
    id: `uy-${codigo || titulo.slice(0, 20).toLowerCase().replace(/\W+/g, '-')}`,
    title: `${ident} · ${titulo.length > 110 ? titulo.slice(0, 107) + '…' : titulo}`,
    country: 'UY',
    topic: detectTopic(titulo),
    type: isProyectoLey ? 'ley' : 'comunicado',
    date: fecha || new Date().toISOString().slice(0, 10),
    relevance: detectRelevance(titulo, tipo),
    excerpt: titulo.length > 600 ? titulo.slice(0, 597) + '…' : titulo,
    source: `Parlamento del Uruguay · ${cuerpo}`,
    fullText: titulo,
    tipoDocumento: ident,
    tipoConteudo: cuerpo,
    sourceUrl,
    pdfUrl: sourceUrl,
    dataPublicacao: fecha || undefined,
    apiDetailUrl: codigo ? `https://parlamento.gub.uy/documentosyleyes/ficha-asunto/${codigo}` : undefined,
  }
}

// Enriquecimiento on-demand: parsea el HTML de la ficha-asunto del Parlamento UY
// y extrae autores, descripción del proyecto, comisión asignada y entrada cronológica.
// Usa fetchWithCorsFallback porque parlamento.gub.uy no abre CORS para el HTML.
export async function enrichParlamentoUYItem(item: NewsItem, signal?: AbortSignal): Promise<NewsItem> {
  if (!item.apiDetailUrl) return item
  try {
    const res = await fetchWithCorsFallback(item.apiDetailUrl, {
      signal,
      headers: { Accept: 'text/html' },
    })
    if (!res.ok) return item
    const html = await res.text()
    return mergeUYDetail(item, html)
  } catch {
    return item
  }
}

// Parser HTML: aplana tags y extrae secciones clave por label.
function flatten(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<[^>]+>/g, '|')
  text = text.replace(/\|+/g, '|')
  text = text.replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  return text
}

// Devuelve el contenido entre `label` y el siguiente label de la lista (o EOF).
function extractBetween(flat: string, label: string, nextLabels: string[]): string {
  const idx = flat.indexOf(label)
  if (idx < 0) return ''
  const start = idx + label.length
  let end = flat.length
  for (const next of nextLabels) {
    const ni = flat.indexOf(next, start)
    if (ni > 0 && ni < end) end = ni
  }
  return flat
    .slice(start, end)
    .replace(/\|/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function mergeUYDetail(item: NewsItem, html: string): NewsItem {
  const flat = flatten(html)
  const labels = ['Origen:', 'Análisis:', 'Asunto:', 'Título:', 'Entradas', 'Comisiones', 'Sesiones', 'Distribuídos', 'Distribuidos']

  const origen = extractBetween(flat, 'Origen:', labels.filter(l => l !== 'Origen:'))
  const analisis = extractBetween(flat, 'Análisis:', labels.filter(l => l !== 'Análisis:'))

  // Autores: el origen viene como "Cámara Senadores - Apellido, Nombre; Apellido2, Nombre2; ..."
  // Split por ` - ` (con espacios) para separar cuerpo de lista, y por `;` para
  // separar firmantes (los nombres tienen "Apellido, Nombre" con coma interna).
  let authors = item.authors
  if (origen) {
    const m = origen.match(/^\s*(.+?)\s+[-–—]\s+(.+)$/)
    const cuerpo = m ? m[1].trim() : ''
    const restoStr = m ? m[2] : origen
    const lista = restoStr
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 1 && s.length < 100 && /\p{L}/u.test(s))
      .slice(0, 14)
    if (lista.length > 0) {
      authors = (cuerpo ? cuerpo + ' · ' : '') + lista.join('; ')
    }
  }

  // Descripción del proyecto: tomar lo de Análisis si tiene contenido sustancial.
  const fullText = analisis.length > 60 ? analisis.slice(0, 1500) : item.fullText

  // Comisión: buscar el patrón "Comisión Cuerpo Carpeta/Año NOMBRE_COMISION CSS|CRR ..."
  // En el flat aparece como: "Comisiones Comisión Cuerpo Carpeta/Año HACIENDA CSS 549/2026 ..."
  let comision: string | undefined
  const comMatch = flat.match(/Comisiones\s+Comisión\s+Cuerpo\s+Carpeta\/Año\s+([A-ZÁÉÍÓÚÑ ]{4,40}?)\s+(?:CSS|CRR|CAG)\b/)
  if (comMatch) {
    comision = comMatch[1].trim()
  }

  // Cronología: extraer la primera fila de "Entradas" (fecha → entrada)
  const tramitaciones: Tramitacion[] = []
  const entradasBlock = extractBetween(flat, 'Entradas', ['Comisiones', 'Sesiones', 'Distribuidos', 'Distribuídos'])
  const entradaMatch = entradasBlock.match(/(\d{2}-\d{2}-\d{4})\s+(CSS|CRR|CAG)\s+(\d+\/\d{4})\s+(.{20,200})/)
  if (entradaMatch) {
    const [, fecha, cuerpo, carpeta, descripcion] = entradaMatch
    // Convertir DD-MM-YYYY → YYYY-MM-DD
    const isoDate = fecha.split('-').reverse().join('-')
    tramitaciones.push({
      fecha: isoDate,
      descripcion: 'Entrada al Parlamento · ' + descripcion.trim().slice(0, 160),
      organo: cuerpo,
      despacho: `Carpeta ${carpeta}`,
    })
  }

  return {
    ...item,
    fullText,
    authors,
    comision,
    tramitaciones: tramitaciones.length > 0 ? tramitaciones : item.tramitaciones,
  }
}
