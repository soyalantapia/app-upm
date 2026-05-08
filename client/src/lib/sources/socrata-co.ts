import type { NewsItem, Topic } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// Datos abiertos del gobierno colombiano vía Socrata API.
// Dataset 'feim-cysj': Proyectos de ley del Senado de la República de Colombia.
// CORS: ✅ Access-Control-Allow-Origin: *
//
// Schema:
// - n_senado: número del proyecto en el Senado
// - n_camara: número en Cámara de Representantes (opcional)
// - titulo: título completo del proyecto
// - autor: lista de autores
// - f_presentado: fecha de presentación (formato variable: ISO o m/d/Y)
// - comision: comisión asignada
// - estado: ARCHIVADO, LEY, PENDIENTE..., etc.

const ENDPOINT = 'https://www.datos.gov.co/resource/feim-cysj.json'

type SenadoCoRow = {
  n_senado?: string
  n_camara?: string
  titulo?: string
  autor?: string
  f_presentado?: string
  comision?: string
  estado?: string
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|conserv|biodivers/i.test(t)) return 'ambiente'
  if (/integra|mercosur|cooperaci|regional/i.test(t)) return 'integracion-regional'
  if (/género|paridad|mujer|equidad|feminin/i.test(t)) return 'genero'
  if (/educac|escolar|universidad/i.test(t)) return 'educacion'
  if (/salud|sanitar|hospital|epps/i.test(t)) return 'salud'
  if (/energ|el[ée]ctric|combust/i.test(t)) return 'energia'
  if (/seguridad|defens|polic|fronteri/i.test(t)) return 'seguridad'
  if (/comerci|tribut|fiscal|impuesto|presupuest/i.test(t)) return 'economia-regional'
  if (/internacional|tratado|extradic/i.test(t)) return 'rrii'
  if (/corredor|infraestructur|vial/i.test(t)) return 'corredores-bioceanicos'
  return 'integracion-regional'
}

function detectRelevance(estado: string): 'alta' | 'media' | 'baja' {
  const e = (estado || '').toLowerCase()
  if (/ley\b/i.test(e)) return 'alta'
  if (/sancion|aprobad|tercer/i.test(e)) return 'alta'
  if (/segundo|comisión|primer debate/i.test(e)) return 'media'
  if (/archivado|retirad|fallida/i.test(e)) return 'baja'
  return 'media'
}

// Normaliza fecha: puede venir como "2022-07-21" o "7/31/2019"
function normalizeDate(d?: string): string {
  if (!d) return new Date().toISOString().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10)
  // Formato m/d/yyyy o m/d/yy
  const parts = d.split('/')
  if (parts.length === 3) {
    const [m, day, y] = parts
    const year = y.length === 2 ? '20' + y : y
    return `${year}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return d.slice(0, 10)
}

// Trae proyectos en trámite (NO sancionados) · para el Radar
export async function fetchProyectosColombia(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 20
  // Solo proyectos con título válido y estado distinto de LEY (los sancionados van a Leyes)
  const params = new URLSearchParams({
    $limit: String(limit),
    $where: "titulo IS NOT NULL AND estado != 'LEY' AND estado IS NOT NULL",
    $order: 'f_presentado DESC',
  })
  const res = await fetchWithCorsFallback(`${ENDPOINT}?${params.toString()}`, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Socrata CO error: ${res.status}`)
  const data = (await res.json()) as SenadoCoRow[]
  if (!Array.isArray(data)) return []
  return data.map(r => mapRow(r, 'proyecto')).filter((x): x is NewsItem => x !== null)
}

// Trae proyectos que YA fueron sancionados como ley · para Leyes
export async function fetchLeyesColombia(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 50
  const params = new URLSearchParams({
    $limit: String(limit),
    $where: "estado = 'LEY' AND titulo IS NOT NULL",
    $order: 'f_presentado DESC',
  })
  const res = await fetchWithCorsFallback(`${ENDPOINT}?${params.toString()}`, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Socrata CO leyes error: ${res.status}`)
  const data = (await res.json()) as SenadoCoRow[]
  if (!Array.isArray(data)) return []
  return data.map(r => mapRow(r, 'ley')).filter((x): x is NewsItem => x !== null)
}

function mapRow(r: SenadoCoRow, kind: 'proyecto' | 'ley'): NewsItem | null {
  const titulo = (r.titulo ?? '').trim().replace(/^"|"$/g, '')
  if (!titulo) return null
  const numero = r.n_senado ?? r.n_camara ?? ''
  const ident = numero ? `Proyecto ${numero}` : 'Proyecto Senado CO'
  const autor = (r.autor ?? '').trim().replace(/^"|"$/g, '')
  const estado = (r.estado ?? '').trim()
  const fecha = normalizeDate(r.f_presentado)
  const isLaw = kind === 'ley'
  const titleClean = titulo.length > 110 ? titulo.slice(0, 107) + '…' : titulo
  return {
    id: (isLaw ? 'co-ley-' : 'co-proyecto-') + (numero || Math.random().toString(36).slice(2, 9)),
    title: isLaw
      ? `${ident} (sancionado) · ${titleClean}`
      : `${ident} · ${titleClean}`,
    country: 'CO',
    topic: detectTopic(titulo),
    type: 'ley',
    date: fecha,
    relevance: detectRelevance(estado),
    excerpt: titulo.length > 600 ? titulo.slice(0, 597) + '…' : titulo,
    source: isLaw
      ? `Senado de la República de Colombia · Sancionada como ley`
      : `Senado de la República de Colombia · ${estado || 'En trámite'}`,
    fullText: titulo,
    authors: autor || undefined,
    status: estado || undefined,
    tipoDocumento: numero ? `Proyecto ${numero}` : undefined,
    comision: r.comision ? `Comisión ${r.comision}` : undefined,
    dataPublicacao: r.f_presentado,
    sourceUrl: buildOfficialUrl(numero, isLaw),
  }
}

// Construye URL oficial para el proyecto/ley. Para proyectos linkeamos al portal
// del Senado de Colombia con búsqueda por número. Para leyes sancionadas
// linkeamos al gestor normativo de Función Pública.
function buildOfficialUrl(numero: string, isLaw: boolean): string | undefined {
  if (!numero) return undefined
  // El número viene como "327/20" · para el portal hay que separar por "/"
  const parts = numero.split('/')
  if (isLaw && parts.length === 2) {
    // Leyes sancionadas: link a búsqueda del Diario Oficial
    return `https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes/${encodeURIComponent(numero)}`
  }
  // Proyectos: portal del Senado con búsqueda
  return `https://www.senado.gov.co/index.php/component/search/?searchword=${encodeURIComponent('Proyecto de Ley ' + numero)}&searchphrase=all`
}
