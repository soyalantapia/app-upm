import type { NewsItem, Topic } from '../../types.js'
import { fetchJson, truncateExcerpt } from '../util.js'

// Portado de client/src/lib/sources/votaciones-co.ts — mismo mapeo, ids idénticos
// (co-votacion-<fecha>-<num|slug>) para que el dedupe del front colapse
// server/cliente en uno.
//
// Votaciones nominales del Senado de la República de Colombia.
// Dataset Socrata 'ucmr-52df' (16,733 filas, una por cada voto individual).
// Lo agrupamos por proyecto+fecha para mostrar como ítems en el feed.
// Server-side: fetchJson directo a datos.gov.co (sin proxy CORS).
//
// Schema:
//   fecha: "YYYY-MM-DD"
//   fullname: nombre del senador (ej "Avella Esquivel Aída Yolanda")
//   proyecto: descripción del proyecto votado
//   vote: "Si" | "No" | "Abst" | "NV" (no votó)

const ENDPOINT = 'https://www.datos.gov.co/resource/ucmr-52df.json'
const DEFAULT_LIMIT = 15 // mismo { limit: 15 } de la entrada 'votaciones-co' del FETCHERS del cliente

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|biolog/i.test(t)) return 'ambiente'
  if (/integra|mercosur|cooperaci/i.test(t)) return 'integracion-regional'
  if (/género|paridad|mujer/i.test(t)) return 'genero'
  if (/educa|escolar|universidad/i.test(t)) return 'educacion'
  if (/salud|sanitar|hospital/i.test(t)) return 'salud'
  if (/energ|el[ée]ctric|combust|petról/i.test(t)) return 'energia'
  if (/segurid|defens|fronter|polic|narcot/i.test(t)) return 'seguridad'
  if (/comerc|tribut|fiscal|impuesto|presupuest|regalía|inversi[oó]n|cr[eé]dito/i.test(t)) return 'economia-regional'
  if (/internacional|tratado|convenio|extradic/i.test(t)) return 'rrii'
  if (/corredor|infraestruct|vial|transport/i.test(t)) return 'corredores-bioceanicos'
  return 'integracion-regional'
}

type VotacionGrupo = {
  fecha: string
  proyecto: string
  total: string
}

export async function fetchVotacionesColombia(opts?: { limit?: number }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? DEFAULT_LIMIT
  // Pedir conteo agrupado: una fila por proyecto+fecha con total de votos.
  const params = new URLSearchParams({
    $select: 'fecha,proyecto,count(*) as total',
    $group: 'fecha,proyecto',
    $order: 'fecha DESC',
    $limit: String(limit),
  })
  const data = await fetchJson<VotacionGrupo[]>(`${ENDPOINT}?${params.toString()}`)
  if (!Array.isArray(data)) return []

  return data
    .map(mapVotacion)
    .filter((x): x is NewsItem => x !== null)
}

function mapVotacion(g: VotacionGrupo): NewsItem | null {
  const fecha = (g.fecha ?? '').slice(0, 10)
  const proyecto = (g.proyecto ?? '').trim()
  if (!fecha || !proyecto) return null
  const total = parseInt(g.total ?? '0', 10) || 0
  // Limpiar separadores raros del proyecto (vienen con guiones, en-dash, em-dash mezclados)
  const proyectoLimpio = proyecto
    .replace(/\s*[–—]\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim()

  // Extraer número del proyecto si está
  const numMatch = proyectoLimpio.match(/n[uú]mero\s+(\d+)\s+de\s+(\d{4})/i)
  const ident = numMatch ? `Proy. ${numMatch[1]}/${numMatch[2]}` : 'Votación nominal'

  const id = `co-votacion-${fecha}-${(numMatch?.[1] ?? proyecto.slice(0, 20)).replace(/\W+/g, '')}`
  const titleClean = proyectoLimpio.length > 110 ? proyectoLimpio.slice(0, 107) + '…' : proyectoLimpio
  const excerpt = `${total} senadores votaron en sesión plenaria sobre ${proyectoLimpio}. Datos oficiales del registro de votación nominal del Senado de Colombia.`

  return {
    id,
    title: `Votación: ${ident} · ${titleClean}`,
    country: 'CO',
    topic: detectTopic(proyectoLimpio),
    type: 'comunicado',
    date: fecha,
    relevance: total >= 80 ? 'alta' : total >= 50 ? 'media' : 'baja',
    excerpt: truncateExcerpt(excerpt),
    source: 'Senado de Colombia · Votaciones nominales',
    fullText: proyectoLimpio,
    status: `Votación con ${total} participantes`,
    tipoDocumento: ident,
    keywords: ['Votación nominal', `${total} votos`],
    dataPublicacao: fecha,
    sourceUrl: `https://www.datos.gov.co/Funci-n-p-blica/VOTACIONES-SESIONES-PLENARIA-SENADO-DE-LA-REPUBLIC/ucmr-52df`,
  }
}
