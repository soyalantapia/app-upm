import type { NewsItem, Relevance, Topic } from '@/lib/types'

// Tribunal de Contas da União Brasil · Acórdãos.
// 10 acórdãos del control externo brasileño sobre auditorías a obras
// federales, transparencia, BNDES, FUNDEB, SUS, etc.

type TCURow = {
  id: string
  tipoDocumento: string
  title: string
  fecha: string
  tipo: string
  ementa: string
}

type TCUData = { fuente: string; url: string; fetchedAt: string; items: TCURow[] }

const PUBLIC_BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '')
const DATA_URL = `${PUBLIC_BASE}/data/tcu-br.json`

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/ambient|ibama|amaz|sustent/i.test(t)) return 'ambiente'
  if (/sa[úu]de|sus|covid|hospital/i.test(t)) return 'salud'
  if (/educa[çc][ãa]o|fundeb|escolar/i.test(t)) return 'educacion'
  if (/energ|petrobr|transmiss|aneel/i.test(t)) return 'energia'
  if (/g[êe]nero|mulher/i.test(t)) return 'genero'
  if (/seguridad|seguran[çc]a/i.test(t)) return 'seguridad'
  if (/mercosul|mercosur|integraci[óo]n|bndes/i.test(t)) return 'integracion-regional'
  if (/habitacion|moradia|minha casa/i.test(t)) return 'salud'
  if (/transposi|s[ãa]o francisco|infraestrut|transport/i.test(t)) return 'corredores-bioceanicos'
  if (/previdenc|inss|aposent/i.test(t)) return 'salud'
  return 'economia-regional'
}

export async function fetchTcuBR(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 50
  const res = await fetch(DATA_URL, { signal: opts?.signal })
  if (!res.ok) throw new Error(`TCU BR data error: ${res.status}`)
  const data = (await res.json()) as TCUData
  return data.items.slice(0, limit).map(row => ({
    id: row.id,
    title: row.title,
    country: 'BR' as const,
    topic: detectTopic(row.title + ' ' + row.ementa),
    type: 'informe' as const,
    date: row.fecha,
    relevance: 'alta' as Relevance,
    excerpt: row.ementa.length > 600 ? row.ementa.slice(0, 597) + '…' : row.ementa,
    source: 'Tribunal de Contas da União · Brasil',
    fullText: row.ementa,
    tipoDocumento: row.tipoDocumento,
    tipoConteudo: 'Acórdão TCU',
    authors: 'Plenário do Tribunal de Contas da União',
    status: 'Vigente',
    dataPublicacao: row.fecha,
    sourceUrl: 'https://portal.tcu.gov.br',
  }))
}
