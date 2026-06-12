import type { NewsItem, Relevance, Topic } from '../../types.js'
import { fetchJson, truncateExcerpt } from '../util.js'

// Parlamento del Uruguay · Asuntos Entrados (proyectos al Parlamento).
// Portado de client/src/lib/sources/parlamento-uy.ts → ids idénticos (uy-<codigo>)
// para que el dedupe del front colapse server/cliente en uno.
// Server-side: fetchJson directo al endpoint oficial (sin proxy CORS).
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

function detectRelevance(titulo: string, tipoCpt: string): Relevance {
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

export async function fetchParlamentoUY(opts?: { limit?: number }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 25
  const data = await fetchJson<AsuntoUY[]>(ENDPOINT)
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
    excerpt: truncateExcerpt(titulo),
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
