import type { NewsItem, Topic } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// Votaciones nominales del Senado de la República de Colombia.
// Dataset Socrata 'ucmr-52df' (16,733 filas, una por cada voto individual).
// Lo agrupamos por proyecto+fecha para mostrar como ítems en el feed.
//
// CORS: ✅ datos.gov.co abre Access-Control-Allow-Origin: *
//
// Schema:
//   fecha: "YYYY-MM-DD"
//   fullname: nombre del senador (ej "Avella Esquivel Aída Yolanda")
//   proyecto: descripción del proyecto votado
//   vote: "Si" | "No" | "Abst" | "NV" (no votó)

const ENDPOINT = 'https://www.datos.gov.co/resource/ucmr-52df.json'

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

export async function fetchVotacionesColombia(opts?: {
  limit?: number
  signal?: AbortSignal
}): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 15
  // Pedir conteo agrupado: una fila por proyecto+fecha con total de votos.
  const params = new URLSearchParams({
    $select: 'fecha,proyecto,count(*) as total',
    $group: 'fecha,proyecto',
    $order: 'fecha DESC',
    $limit: String(limit),
  })
  const res = await fetchWithCorsFallback(`${ENDPOINT}?${params.toString()}`, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Votaciones CO API error: ${res.status}`)
  const data = (await res.json()) as VotacionGrupo[]
  if (!Array.isArray(data)) return []

  // Para enriquecer cada votación con el desglose Si/No/Abst, hacemos un fetch
  // adicional agrupado por vote. Pero esto serían N fetches extra. Por ahora
  // mostramos solo total y dejamos el detalle para cuando el usuario abre el item.
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
    excerpt: excerpt.length > 600 ? excerpt.slice(0, 597) + '…' : excerpt,
    source: 'Senado de Colombia · Votaciones nominales',
    fullText: proyectoLimpio,
    status: `Votación con ${total} participantes`,
    tipoDocumento: ident,
    keywords: ['Votación nominal', `${total} votos`],
    dataPublicacao: fecha,
    sourceUrl: `https://www.datos.gov.co/Funci-n-p-blica/VOTACIONES-SESIONES-PLENARIA-SENADO-DE-LA-REPUBLIC/ucmr-52df`,
  }
}

// Enrich on-demand: traer el desglose por voto (Si/No/Abst) y la lista de senadores.
export async function enrichVotacionColombia(
  item: NewsItem,
  signal?: AbortSignal,
): Promise<NewsItem> {
  // Recuperar fecha y proyecto del item
  const fechaMatch = item.id.match(/^co-votacion-(\d{4}-\d{2}-\d{2})/)
  if (!fechaMatch || !item.fullText) return item
  const fecha = fechaMatch[1]
  const proyecto = item.fullText.slice(0, 200)
  try {
    // Pedir todos los votos de ese proyecto en esa fecha
    const params = new URLSearchParams({
      $where: `fecha = '${fecha}T00:00:00.000' AND starts_with(proyecto, '${proyecto.replace(/'/g, "''").slice(0, 80)}')`,
      $select: 'fullname,vote',
      $limit: '200',
    })
    const res = await fetchWithCorsFallback(`${ENDPOINT}?${params.toString()}`, {
      signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return item
    const rows = (await res.json()) as { fullname?: string; vote?: string }[]
    if (!Array.isArray(rows) || rows.length === 0) return item
    const counts = { Si: 0, No: 0, Abst: 0, NV: 0, otros: 0 }
    for (const r of rows) {
      const v = (r.vote ?? '').trim()
      if (v === 'Si' || v === 'Sí') counts.Si++
      else if (v === 'No') counts.No++
      else if (/abst/i.test(v)) counts.Abst++
      else if (/nv|no vot/i.test(v)) counts.NV++
      else counts.otros++
    }
    const desglose = [
      `${counts.Si} a favor`,
      `${counts.No} en contra`,
      counts.Abst > 0 ? `${counts.Abst} abstenciones` : null,
      counts.NV > 0 ? `${counts.NV} no votaron` : null,
    ]
      .filter(Boolean)
      .join(', ')
    return {
      ...item,
      excerpt: `${rows.length} senadores votaron: ${desglose}. Proyecto: ${proyecto.slice(0, 200)}.`,
      status: `${counts.Si} a favor / ${counts.No} en contra${counts.Abst > 0 ? ` / ${counts.Abst} abstenciones` : ''}`,
      keywords: [`${counts.Si} a favor`, `${counts.No} en contra`, ...(counts.Abst > 0 ? [`${counts.Abst} abstenciones`] : [])],
    }
  } catch {
    return item
  }
}
