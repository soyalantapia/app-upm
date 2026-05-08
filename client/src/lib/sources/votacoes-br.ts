import type { NewsItem, Topic } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// Câmara dos Deputados de Brasil · Votaciones recientes.
// API pública: dadosabertos.camara.leg.br/api/v2/votacoes
// CORS: ✅ abierto
//
// Devuelve sesiones de votación con fecha/hora exacta + descripción del
// resultado (aprobado, rechazado, en discusión, etc.) y el proyecto votado.

const BASE = 'https://dadosabertos.camara.leg.br/api/v2'

type VotacaoRow = {
  id?: string                          // "2561269-29"
  uri?: string
  data?: string                        // "2026-05-07"
  dataHoraRegistro?: string            // "2026-05-07T10:50:27"
  siglaOrgao?: string                  // "PLEN", "CCJC", etc.
  uriOrgao?: string
  uriEvento?: string
  proposicaoObjeto?: string | null
  uriProposicaoObjeto?: string | null
  descricao?: string                   // "Aprovada a Redação Final, assinada pelo relator..."
  aprovacao?: number                   // 1 = aprobada, 0 = rechazada
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|polui/i.test(t)) return 'ambiente'
  if (/integra|mercosul|cooperação/i.test(t)) return 'integracion-regional'
  if (/gênero|mulher|paridad|feminin/i.test(t)) return 'genero'
  if (/educação|escolar|ensino/i.test(t)) return 'educacion'
  if (/saúde|saude|hospital/i.test(t)) return 'salud'
  if (/energia|elétric|petról|gás|combust/i.test(t)) return 'energia'
  if (/internacional|tratado|exterior|diplomáti/i.test(t)) return 'rrii'
  if (/segurança|defesa|fronteir|polic/i.test(t)) return 'seguridad'
  if (/comércio|tribut|fiscal|imposto|orçament/i.test(t)) return 'economia-regional'
  if (/transport|rodovi|ferrovi|biocean/i.test(t)) return 'corredores-bioceanicos'
  return 'integracion-regional'
}

export async function fetchVotacoesCamaraBR(opts?: {
  limit?: number
  signal?: AbortSignal
}): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 25
  // Últimos 30 días, ordenadas por fecha desc
  const dataInicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const params = new URLSearchParams({
    dataInicio,
    itens: String(limit),
    ordem: 'DESC',
    ordenarPor: 'dataHoraRegistro',
  })
  const res = await fetchWithCorsFallback(`${BASE}/votacoes?${params.toString()}`, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Câmara votacoes error: ${res.status}`)
  const json = (await res.json()) as { dados?: VotacaoRow[] }
  return (json.dados ?? []).map(mapVotacao).filter((x): x is NewsItem => x !== null)
}

function mapVotacao(r: VotacaoRow): NewsItem | null {
  const id = (r.id ?? '').trim()
  const desc = (r.descricao ?? '').trim()
  if (!id || !desc) return null
  const fecha = (r.dataHoraRegistro ?? r.data ?? '').slice(0, 10)
  const aprobada = r.aprovacao === 1
  const orgao = (r.siglaOrgao ?? '').trim()
  const titleClean = desc.length > 110 ? desc.slice(0, 107) + '…' : desc

  return {
    id: `br-votacao-${id}`,
    title: `Votación ${aprobada ? 'aprobada' : ''} · ${titleClean}`.trim(),
    country: 'BR',
    topic: detectTopic(desc),
    type: 'comunicado',
    date: fecha || new Date().toISOString().slice(0, 10),
    relevance: aprobada ? 'alta' : 'media',
    excerpt: desc.length > 600 ? desc.slice(0, 597) + '…' : desc,
    source: `Câmara dos Deputados · Brasil · Votación ${orgao || 'plenário'}`,
    fullText: desc,
    status: aprobada ? 'Aprobada' : 'Registrada',
    tipoDocumento: `Votação ${id}`,
    tipoConteudo: orgao || 'Votación',
    dataPublicacao: r.dataHoraRegistro,
    sourceUrl: r.uriEvento || r.uriOrgao || undefined,
    keywords: [orgao, aprobada ? 'Aprobada' : 'Sesión'].filter(Boolean),
  }
}
