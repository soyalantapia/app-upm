import type { NewsItem, Topic } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// Vista de Proyectos de Ley unificada (Cámara + Senado) de Colombia.
// Dataset Socrata 'xs56-s7w6': 1075 filas con campos enriquecidos:
// - número Cámara y Senado en uno solo
// - título largo (cuerpo del proyecto)
// - autores con sus nombres
// - cargo del autor
// - URL a la gaceta oficial del Congreso (PDF)
// - URL a la ficha del proyecto en camara.gov.co
// - estado real ("Ley", "Archivado", etc.)
//
// CORS: ✅ datos.gov.co abre Access-Control-Allow-Origin: *
//
// IMPORTANTE: los nombres de columnas en este dataset están SWAP en algunos campos:
// - `tipo_de_proyecto` contiene los AUTORES (no el tipo)
// - `legislatura` contiene URL a la GACETA (no la legislatura)
// - `enlace_proyecto_de_ley` contiene el CARGO del autor (no el link)
// - `contenido_del_proyecto_de_ley` es un objeto {url: ...} con la ficha del proyecto
// El mapeo abajo respeta los datos reales, no los nombres del schema.

const ENDPOINT = 'https://www.datos.gov.co/resource/xs56-s7w6.json'

type VistaRow = {
  _?: string                                  // código Cámara, ej "367/2024C"
  camara?: string                             // código Senado, ej "284/2024S"
  senado?: string                             // título largo del proyecto
  nombre_del_proyecto_de_ley?: string         // nombre corto / etiqueta
  enlace_proyecto_de_ley?: string             // cargo del autor
  tipo_de_proyecto?: string                   // nombres de los autores (CSV)
  legislatura?: string                        // URL gaceta oficial (PDF)
  estado_del_proyecto_de_ley?: string         // "Ley" | "Archivado" | "Pendiente" | etc.
  contenido_del_proyecto_de_ley?: { url?: string } // ficha del proyecto en camara.gov.co
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|biolog|residuo|conservaci|forestal/i.test(t)) return 'ambiente'
  if (/integra|mercosur|cooperaci|amistad|complement/i.test(t)) return 'integracion-regional'
  if (/género|paridad|mujer|equidad|feminin/i.test(t)) return 'genero'
  if (/educac|escolar|universidad|enseñan/i.test(t)) return 'educacion'
  if (/salud|sanitar|hospital|epidem|medicamento/i.test(t)) return 'salud'
  if (/energ|el[ée]ctric|combust|petról|renovab|hidrocarb/i.test(t)) return 'energia'
  if (/segurid|defens|fronter|polic|narcot|extradic/i.test(t)) return 'seguridad'
  if (/comerc|tribut|fiscal|impuesto|presupuest|regalías|inversi[oó]n|crédito/i.test(t)) return 'economia-regional'
  if (/internacional|tratado|convenio|extradic|ratifica/i.test(t)) return 'rrii'
  if (/corredor|infraestructur|vial|transport|portuari|ferrov/i.test(t)) return 'corredores-bioceanicos'
  return 'integracion-regional'
}

function detectRelevance(estado: string, tipo: string): 'alta' | 'media' | 'baja' {
  const e = (estado || '').toLowerCase()
  const t = (tipo || '').toLowerCase()
  if (/^ley\b|sancion/i.test(e)) return 'alta'
  if (/aprobad|tercer/i.test(e)) return 'alta'
  if (/presupuesto|reforma|emergenc|c[oó]digo/i.test(t)) return 'alta'
  if (/segundo|comisi[oó]n|primer debate|publicad|en tr[aá]mite/i.test(e)) return 'media'
  if (/archivad|retirad|fallid|hund/i.test(e)) return 'baja'
  return 'media'
}

// "367/2024C" o "284/2024S" → "367/2024" + cuerpo
function parseCodigo(codigo?: string): { numero: string; anio: string; cuerpo: 'C' | 'S' | '' } {
  if (!codigo) return { numero: '', anio: '', cuerpo: '' }
  const m = codigo.trim().match(/^(\d+)\s*\/\s*(\d{2,4})\s*([CS])?/i)
  if (!m) return { numero: codigo.trim(), anio: '', cuerpo: '' }
  const anio = m[2].length === 2 ? '20' + m[2] : m[2]
  return { numero: m[1], anio, cuerpo: (m[3]?.toUpperCase() as 'C' | 'S') ?? '' }
}

// Limpia "PEDRO PÉREZ,PEDRO PÉREZ,JUAN GÓMEZ" → "Pedro Pérez, Juan Gómez"
function cleanAuthors(raw?: string): string {
  if (!raw || raw === 'ND') return ''
  const seen = new Set<string>()
  const out: string[] = []
  for (const a of raw.split(',')) {
    const name = a.trim()
    if (!name) continue
    const key = name.toUpperCase()
    if (seen.has(key)) continue
    seen.add(key)
    // Title case: "PEDRO PÉREZ" → "Pedro Pérez"
    out.push(
      name
        .toLowerCase()
        .replace(/\b\p{L}/gu, c => c.toUpperCase()),
    )
  }
  return out.slice(0, 8).join(', ')
}

export async function fetchVistaProyectosColombia(opts?: {
  limit?: number
  signal?: AbortSignal
}): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 20
  // Pedimos 4x para tener margen tras dedup de números repetidos.
  const fetchN = limit * 4
  const params = new URLSearchParams({
    $limit: String(fetchN),
    // ordenar por timestamp del row para tener los más recientemente cargados arriba.
    $order: ':created_at DESC',
  })
  const res = await fetchWithCorsFallback(`${ENDPOINT}?${params.toString()}`, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Vista CO API error: ${res.status}`)
  const data = (await res.json()) as VistaRow[]
  if (!Array.isArray(data)) return []

  // Dedupe por código de Cámara (campo `_`) — el dataset trae filas duplicadas
  // por proyecto cuando hay más de un autor.
  const byCode = new Map<string, VistaRow>()
  for (const row of data) {
    const key = (row._ ?? row.camara ?? '').trim()
    if (!key) continue
    if (!byCode.has(key)) byCode.set(key, row)
  }

  return Array.from(byCode.values())
    .slice(0, limit)
    .map(mapVista)
    .filter((x): x is NewsItem => x !== null)
}

function mapVista(r: VistaRow): NewsItem | null {
  const codCamara = (r._ ?? '').trim()       // "367/2024C"
  const codSenado = (r.camara ?? '').trim()  // "284/2024S"
  const titulo = (r.senado ?? '').trim()     // título largo
  const nombreCorto = (r.nombre_del_proyecto_de_ley ?? '').trim()
  if (!titulo && !nombreCorto) return null

  const cargoAutor = (r.enlace_proyecto_de_ley ?? '').trim()
  const autoresRaw = r.tipo_de_proyecto ?? ''
  const autores = cleanAuthors(autoresRaw)
  const estado = (r.estado_del_proyecto_de_ley ?? '').trim()
  const gacetaUrl = (r.legislatura ?? '').trim().startsWith('http') ? r.legislatura : undefined
  const contenido = r.contenido_del_proyecto_de_ley
  const fichaUrl = contenido && typeof contenido === 'object' ? (contenido.url ?? '').trim() : ''

  const { numero, anio } = parseCodigo(codCamara || codSenado)
  const ident = numero && anio ? `Proyecto ${numero}/${anio}` : (codCamara || codSenado || 'Proyecto Senado CO')
  const id = `co-vista-${(codCamara || codSenado).replace(/\s+/g, '').replace(/\//g, '-')}`
  const isLaw = /^ley\b/i.test(estado) || /sancionad/i.test(estado)

  const titleClean = titulo.length > 110 ? titulo.slice(0, 107) + '…' : titulo
  const title = isLaw
    ? `${ident} (sancionado) — ${titleClean || nombreCorto}`
    : `${ident} — ${titleClean || nombreCorto}`

  // Excerpt rico: nombre corto + autoría + estado
  const excerptParts: string[] = []
  if (nombreCorto && nombreCorto.toLowerCase() !== titulo.toLowerCase().slice(0, nombreCorto.length)) {
    excerptParts.push(nombreCorto)
  }
  if (titulo) excerptParts.push(titulo)
  const excerpt = excerptParts.join(' — ')
  const excerptCut = excerpt.length > 600 ? excerpt.slice(0, 597) + '…' : excerpt

  // Autoría compuesta: cargos + nombres
  const authorsFull = [cargoAutor, autores].filter(Boolean).join(' · ') || undefined

  return {
    id,
    title,
    country: 'CO',
    topic: detectTopic(titulo + ' ' + nombreCorto),
    type: 'ley',
    date: anio ? `${anio}-01-01` : new Date().toISOString().slice(0, 10),
    relevance: detectRelevance(estado, titulo + ' ' + nombreCorto),
    excerpt: excerptCut || nombreCorto || titulo,
    source: isLaw
      ? `Senado / Cámara de Colombia · Sancionado como ley`
      : `Senado / Cámara de Colombia · ${estado || 'En trámite'}`,
    fullText: titulo,
    authors: authorsFull,
    status: estado || undefined,
    tipoDocumento: codCamara || codSenado,
    tipoConteudo: codSenado && codCamara ? `${codCamara} · ${codSenado}` : undefined,
    sourceUrl: fichaUrl || gacetaUrl,
    pdfUrl: gacetaUrl,
    keywords: [
      ...(estado ? [estado] : []),
      ...(codSenado ? [`Senado ${codSenado}`] : []),
    ].slice(0, 6),
  }
}
