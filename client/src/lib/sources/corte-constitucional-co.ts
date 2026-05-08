import type { NewsItem, Topic } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// Sentencias de la Corte Constitucional de Colombia con exhortos al Congreso.
// Dataset Socrata 'fbtr-7k2r': 191 sentencias jurídicamente vinculantes que
// instan al Poder Legislativo a regular un tema específico.
//
// CORS: ✅ datos.gov.co abre Access-Control-Allow-Origin: *
//
// Schema:
//   sentencia_tipo: "C" (control de constitucionalidad), "T" (tutela), etc.
//   sentencia: ej "C-473/94"
//   fecha_sentencia: ISO con hora
//   entidad: "CONGRESO DE LA REPUBLICA" (siempre, son los que se exhorta)
//   exhorto: texto del exhorto (largo)
//   enlace: { url } al texto en corteconstitucional.gov.co

const ENDPOINT = 'https://www.datos.gov.co/resource/fbtr-7k2r.json'

type SentenciaRow = {
  sentencia_tipo?: string
  sentencia?: string                  // "C-473/94"
  fecha_sentencia?: string            // ISO con hora
  entidad?: string
  exhorto?: string
  enlace?: { url?: string }
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|biolog|residuo/i.test(t)) return 'ambiente'
  if (/género|paridad|mujer|equidad|trata|violencia/i.test(t)) return 'genero'
  if (/educac|escolar|universidad|enseñan/i.test(t)) return 'educacion'
  if (/salud|sanitar|hospital|epps|huelga.*salud/i.test(t)) return 'salud'
  if (/energ|el[ée]ctric|combust|petról/i.test(t)) return 'energia'
  if (/segurid|defens|conflicto armado|polic|orden público/i.test(t)) return 'seguridad'
  if (/comerc|tribut|fiscal|impuesto|presupuest|regalía/i.test(t)) return 'economia-regional'
  if (/internacional|tratado|extradic|relaciones exteriores/i.test(t)) return 'rrii'
  return 'integracion-regional'
}

export async function fetchCorteConstitucionalColombia(opts?: {
  limit?: number
  signal?: AbortSignal
}): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 30
  const params = new URLSearchParams({
    $limit: String(limit),
    $order: 'fecha_sentencia DESC',
  })
  const res = await fetchWithCorsFallback(`${ENDPOINT}?${params.toString()}`, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Corte Constitucional CO error: ${res.status}`)
  const data = (await res.json()) as SentenciaRow[]
  if (!Array.isArray(data)) return []
  return data.map(mapSentencia).filter((x): x is NewsItem => x !== null)
}

function mapSentencia(r: SentenciaRow): NewsItem | null {
  const sentencia = (r.sentencia ?? '').trim()
  const exhorto = (r.exhorto ?? '').trim()
  if (!sentencia || !exhorto) return null
  const fecha = (r.fecha_sentencia ?? '').slice(0, 10)
  const url = (typeof r.enlace === 'object' ? r.enlace?.url : '') || ''
  const tipoSent = (r.sentencia_tipo ?? '').trim()
  const tipoLabel = tipoSent === 'C' ? 'Control de constitucionalidad'
    : tipoSent === 'T' ? 'Tutela'
    : tipoSent === 'SU' ? 'Sentencia unificadora'
    : 'Sentencia'

  const slug = sentencia.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const id = `co-corte-${slug}`
  const titleClean = exhorto.length > 110 ? exhorto.slice(0, 107) + '…' : exhorto

  return {
    id,
    title: `Sentencia ${sentencia} · ${titleClean}`,
    country: 'CO',
    topic: detectTopic(exhorto),
    type: 'informe',
    date: fecha || new Date().toISOString().slice(0, 10),
    relevance: 'alta',
    excerpt: exhorto.length > 600 ? exhorto.slice(0, 597) + '…' : exhorto,
    source: `Corte Constitucional de Colombia · ${tipoLabel} · Exhorto al Congreso`,
    fullText: exhorto,
    authors: 'Corte Constitucional de Colombia',
    status: 'Vigente · Exhorto al Congreso',
    tipoDocumento: `Sentencia ${sentencia}`,
    sourceUrl: url || undefined,
    pdfUrl: url || undefined,
    dataPublicacao: r.fecha_sentencia,
    keywords: [tipoLabel, 'Exhorto al Congreso', r.entidad ?? ''].filter(Boolean),
  }
}
