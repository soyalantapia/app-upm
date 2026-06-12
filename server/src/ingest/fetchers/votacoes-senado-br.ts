import type { NewsItem, Topic } from '../../types.js'
import { fetchJson, truncateExcerpt } from '../util.js'

// Senado Federal de Brasil · Votaciones nominales.
// Portado de client/src/lib/sources/votacoes-senado-br.ts → ids idénticos
// (br-senado-vot-<id>) para que el dedupe del front colapse server/cliente en uno.
// API pública: legis.senado.leg.br/dadosabertos/votacao — server-side sin proxy CORS.
//
// Schema:
//   identificacao: "PLP 14/2026"
//   ementa: descripción del proyecto votado (largo)
//   descricaoVotacao: texto que describe la votación
//   dataSessao: timestamp ISO
//   casaSessao: "SF" (Senado Federal)
//   idProcesso, codigoMateria, codigoSessao, etc.

const ENDPOINT = 'https://legis.senado.leg.br/dadosabertos/votacao'

type VotacaoSenadoRow = {
  ano?: number
  casaSessao?: string
  codigoMateria?: number
  codigoSessao?: number
  codigoSessaoVotacao?: number
  dataSessao?: string                 // "2026-04-14T00:00:00"
  descricaoVotacao?: string
  ementa?: string
  idProcesso?: number
  identificacao?: string              // "PLP 14/2026"
  informeLegislativo?: { data?: string; nomeColegiado?: string; idEvento?: number }
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|polui|biolog/i.test(t)) return 'ambiente'
  if (/integra|mercosul|cooperação/i.test(t)) return 'integracion-regional'
  if (/gênero|mulher|paridad|feminin/i.test(t)) return 'genero'
  if (/educação|escolar|ensino|universidad/i.test(t)) return 'educacion'
  if (/saúde|saude|hospital|sanitár|medicament/i.test(t)) return 'salud'
  if (/energia|elétric|petról|gás|combust|renov/i.test(t)) return 'energia'
  if (/internacional|tratado|exterior|diplomáti|embaix/i.test(t)) return 'rrii'
  if (/segurança|defesa|fronteir|polic/i.test(t)) return 'seguridad'
  if (/comércio|tribut|fiscal|imposto|orçament|receita|crédito/i.test(t)) return 'economia-regional'
  if (/transport|rodovi|ferrovi|biocean|portuári/i.test(t)) return 'corredores-bioceanicos'
  return 'integracion-regional'
}

export async function fetchVotacoesSenadoBR(opts?: { limit?: number }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 20
  const params = new URLSearchParams({
    ano: String(new Date().getFullYear()),
    limit: String(limit),
  })
  const data = await fetchJson<VotacaoSenadoRow[]>(`${ENDPOINT}?${params.toString()}`)
  if (!Array.isArray(data)) return []
  // Ordenar por dataSessao DESC (la API a veces no ordena)
  data.sort((a, b) => (b.dataSessao ?? '').localeCompare(a.dataSessao ?? ''))
  return data.slice(0, limit).map(mapVotacaoSenado).filter((x): x is NewsItem => x !== null)
}

function mapVotacaoSenado(r: VotacaoSenadoRow): NewsItem | null {
  const ident = (r.identificacao ?? '').trim()
  const desc = (r.descricaoVotacao ?? '').trim()
  if (!ident || !desc) return null
  const ementa = (r.ementa ?? '').trim()
  const fecha = (r.dataSessao ?? '').slice(0, 10)
  const colegiado = r.informeLegislativo?.nomeColegiado ?? 'Plenário'
  const idVot = r.codigoSessaoVotacao ?? r.codigoSessao ?? r.idProcesso

  const titleClean = ementa.length > 110 ? ementa.slice(0, 107) + '…' : (ementa || desc)
  const fullText = ementa || desc

  return {
    id: `br-senado-vot-${idVot}`,
    title: `Votación ${ident} · ${titleClean}`,
    country: 'BR',
    topic: detectTopic(`${ementa} ${desc}`),
    type: 'comunicado',
    date: fecha || new Date().toISOString().slice(0, 10),
    relevance: /aprovad|sanc/i.test(desc) ? 'alta' : 'media',
    excerpt: truncateExcerpt(fullText) || desc,
    source: `Senado Federal · Brasil · Votación nominal (${colegiado})`,
    fullText,
    status: desc,
    tipoDocumento: ident,
    tipoConteudo: colegiado,
    dataPublicacao: r.dataSessao,
    sourceUrl: r.idProcesso
      ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${r.codigoMateria ?? r.idProcesso}`
      : undefined,
    keywords: [ident, colegiado, /aprovad/i.test(desc) ? 'Aprobada' : 'Votada'].filter(Boolean),
  }
}
