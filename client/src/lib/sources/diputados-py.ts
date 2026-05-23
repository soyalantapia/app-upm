import type { NewsItem, Relevance, Topic } from '@/lib/types'

// Cámara de Diputados de la República del Paraguay · Proyectos y Leyes.
// Complementa al Senado PY. Cubre: ITAIPU royalties, primer empleo,
// presupuesto 2026, educación bilingüe, corredor bioceánico, energías renovables.

type DiputadosPYRow = {
  id: string
  tipoDocumento: string
  title: string
  fecha: string
  comision: string
  ementa: string
}

type DiputadosPYData = { fuente: string; url: string; fetchedAt: string; items: DiputadosPYRow[] }

const PUBLIC_BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '')
const DATA_URL = `${PUBLIC_BASE}/data/diputados-py.json`

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/bioce[aá]nico|corredor|puente|chaco|infraestrut/i.test(t)) return 'corredores-bioceanicos'
  if (/mercosur|integraci[oó]n|arancel|cancill/i.test(t)) return 'integracion-regional'
  if (/itaipu|yacyret[aá]|energi|solar|e[oó]lic|renovable/i.test(t)) return 'energia'
  if (/ambient|sustent|carbono|deforest|cuenca/i.test(t)) return 'ambiente'
  if (/g[eé]nero|mujer|paridad|familia/i.test(t)) return 'genero'
  if (/salud|hospital|medic|sanitari/i.test(t)) return 'salud'
  if (/educac|biling|guaran[ií]|ni[ñn]ez|infancia|adolescencia/i.test(t)) return 'educacion'
  if (/econom|presupuest|haciend|inversión|empleo|fiscal/i.test(t)) return 'economia-regional'
  if (/seguridad|judicial|penal|policial|narco/i.test(t)) return 'seguridad'
  if (/rio|paraguay|pilcomayo|apa|parana/i.test(t)) return 'rio-uruguay'
  return 'mercosur'
}

function detectRelevance(tipo: string, text: string): Relevance {
  if (/LEY/.test(tipo)) return 'alta'
  if (/itaipu|presupuest|bioce[aá]nico|guaraní|energi/i.test(text)) return 'alta'
  return 'media'
}

export async function fetchDiputadosPY(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 50
  const res = await fetch(DATA_URL, { signal: opts?.signal })
  if (!res.ok) throw new Error(`Diputados PY data error: ${res.status}`)
  const data = (await res.json()) as DiputadosPYData
  return data.items.slice(0, limit).map(row => ({
    id: row.id,
    title: row.title,
    country: 'PY' as const,
    topic: detectTopic(row.title + ' ' + row.ementa),
    type: row.tipoDocumento === 'LEY' ? 'ley' as const : 'decreto' as const,
    date: row.fecha,
    relevance: detectRelevance(row.tipoDocumento, row.title + ' ' + row.ementa),
    excerpt: row.ementa.length > 600 ? row.ementa.slice(0, 597) + '…' : row.ementa,
    source: `Cámara de Diputados del Paraguay · Comisión de ${row.comision}`,
    fullText: row.ementa,
    tipoDocumento: row.tipoDocumento,
    tipoConteudo: row.tipoDocumento === 'LEY' ? 'Ley promulgada'
      : row.tipoDocumento === 'RESOLUCION' ? 'Resolución Cámara Diputados'
      : row.tipoDocumento === 'DECLARACION' ? 'Declaración Cámara Diputados'
      : 'Proyecto de Ley',
    comision: row.comision,
    authors: `Comisión de ${row.comision} · Cámara de Diputados del Paraguay`,
    status: row.tipoDocumento === 'LEY' ? 'Promulgada' : 'En trámite parlamentario',
    dataPublicacao: row.fecha,
    sourceUrl: 'https://www.diputados.gov.py',
  }))
}
