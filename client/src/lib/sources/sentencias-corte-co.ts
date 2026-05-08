import type { NewsItem, Topic } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// Sentencias completas de la Corte Constitucional de Colombia.
// Dataset Socrata 'v2k4-2t8s': 29,271 sentencias con metadata completa
// (proceso, expediente, magistrado, sala, tipo, fecha).
//
// CORS: ✅ datos.gov.co abre Access-Control-Allow-Origin: *
//
// Diferencia con corte-constitucional-co.ts: ese trae solo 191 sentencias
// con exhortos al Congreso y texto completo del exhorto. Este trae todo el
// universo de sentencias de la Corte (tutelas, control de constitucionalidad,
// unificación) con metadata pero sin texto.

const ENDPOINT = 'https://www.datos.gov.co/resource/v2k4-2t8s.json'

type SentenciaCompletaRow = {
  proceso?: string                  // "Tutela", "Demanda de inconstitucionalidad"
  expediente_tipo?: string          // "T", "D", "SU"
  expediente_numero?: string
  magistrado_a?: string
  sala?: string                     // "Salas de Revisión", "Sala Plena"
  sentencia_tipo?: string           // "T", "C", "SU"
  sentencia?: string                // "T-070/26"
  fecha_sentencia?: string          // ISO con hora
  sv_spv?: string                   // salvamentos de voto
  av_apv?: string                   // aclaraciones de voto
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|biolog|residuo/i.test(t)) return 'ambiente'
  if (/género|paridad|mujer|equidad|trata|violencia/i.test(t)) return 'genero'
  if (/educac|escolar|universidad|enseñan/i.test(t)) return 'educacion'
  if (/salud|sanitar|hospital|epps|huelga.*salud/i.test(t)) return 'salud'
  if (/energ|el[ée]ctric|combust|petról/i.test(t)) return 'energia'
  if (/segurid|defens|conflicto armado|polic|orden público|tutela/i.test(t)) return 'seguridad'
  if (/comerc|tribut|fiscal|impuesto|presupuest|regalía/i.test(t)) return 'economia-regional'
  if (/internacional|tratado|extradic|relaciones exteriores/i.test(t)) return 'rrii'
  return 'integracion-regional'
}

// Construye la URL al texto en corteconstitucional.gov.co.
// Formato: https://www.corteconstitucional.gov.co/relatoria/{año}/{sentencia con guión}.htm
// "T-070/26" -> "T-070-26.htm" en /relatoria/2026/
function buildSentenciaUrl(sentencia: string, fecha: string): string | undefined {
  const m = sentencia.match(/^([A-Z]+)-(\d+)\/(\d+)$/)
  if (!m) return undefined
  const [, tipo, numero, anio2] = m
  const anioFull = anio2.length === 2 ? (parseInt(anio2) > 50 ? '19' + anio2 : '20' + anio2) : anio2
  const folder = (fecha ?? '').slice(0, 4) || anioFull
  return `https://www.corteconstitucional.gov.co/relatoria/${folder}/${tipo}-${numero}-${anio2}.htm`
}

export async function fetchSentenciasCorteCO(opts?: {
  limit?: number
  signal?: AbortSignal
}): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 50
  const params = new URLSearchParams({
    $limit: String(limit),
    $order: 'fecha_sentencia DESC',
  })
  const res = await fetchWithCorsFallback(`${ENDPOINT}?${params.toString()}`, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Sentencias Corte CO error: ${res.status}`)
  const data = (await res.json()) as SentenciaCompletaRow[]
  if (!Array.isArray(data)) return []
  return data.map(mapSentencia).filter((x): x is NewsItem => x !== null)
}

function mapSentencia(r: SentenciaCompletaRow): NewsItem | null {
  const sentencia = (r.sentencia ?? '').trim()
  const proceso = (r.proceso ?? '').trim()
  if (!sentencia || !proceso) return null
  const fecha = (r.fecha_sentencia ?? '').slice(0, 10)
  const tipoSent = (r.sentencia_tipo ?? '').trim()
  const tipoLabel = tipoSent === 'C' ? 'Control de constitucionalidad'
    : tipoSent === 'T' ? 'Tutela'
    : tipoSent === 'SU' ? 'Sentencia unificadora'
    : 'Sentencia'
  const sala = (r.sala ?? '').trim()
  const magistrado = (r.magistrado_a ?? '').trim()
  const exp = (r.expediente_numero ?? '').trim()

  const slug = sentencia.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const id = `co-corte-full-${slug}`
  const titulo = `${proceso} · Magistrado ${magistrado || 's.d.'}`
  const url = buildSentenciaUrl(sentencia, fecha)

  const excerptParts = [
    proceso,
    sala ? `Sala: ${sala}` : '',
    magistrado ? `Magistrado/a: ${magistrado}` : '',
    exp ? `Expediente: ${exp}` : '',
    r.sv_spv && r.sv_spv !== 's.d.' ? `Salvamentos: ${r.sv_spv}` : '',
    r.av_apv && r.av_apv !== 's.d.' ? `Aclaraciones: ${r.av_apv}` : '',
  ].filter(Boolean).join(' · ')

  return {
    id,
    title: `Sentencia ${sentencia} · ${titulo}`,
    country: 'CO',
    topic: detectTopic(`${proceso} ${sala}`),
    type: 'informe',
    date: fecha || new Date().toISOString().slice(0, 10),
    relevance: tipoSent === 'SU' || tipoSent === 'C' ? 'alta' : 'media',
    excerpt: excerptParts.length > 600 ? excerptParts.slice(0, 597) + '…' : excerptParts,
    source: `Corte Constitucional de Colombia · ${tipoLabel} · ${sala || 'Sala'}`,
    fullText: excerptParts,
    authors: magistrado || undefined,
    status: tipoLabel,
    tipoDocumento: `Sentencia ${sentencia}`,
    sourceUrl: url,
    pdfUrl: url,
    dataPublicacao: r.fecha_sentencia,
    keywords: [tipoLabel, sala, proceso].filter(Boolean),
  }
}
