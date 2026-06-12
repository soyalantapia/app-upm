import type { NewsItem } from '../../types.js'
import { detectTopic } from '../topic.js'
import { fetchJson, truncateExcerpt } from '../util.js'

// Portado del worker (camaraBR) — API abierta de la Câmara dos Deputados.
type Proposicao = { id: number; siglaTipo: string; numero: number; ano: number; ementa: string }

export async function fetchCamaraBR(): Promise<NewsItem[]> {
  const j = await fetchJson<{ dados: Proposicao[] }>(
    'https://dadosabertos.camara.leg.br/api/v2/proposicoes?itens=30&ordem=DESC&ordenarPor=id',
  )
  const today = new Date().toISOString().slice(0, 10)
  return j.dados.map(p => ({
    id: 'br-camara-' + p.id,
    title: `${p.siglaTipo} ${p.numero}/${p.ano} — Brasil`,
    country: 'BR' as const,
    topic: detectTopic(p.ementa + ' ' + p.siglaTipo),
    type: (p.siglaTipo === 'PEC' ? 'reglamento' : p.siglaTipo === 'MP' ? 'decreto' : 'ley') as NewsItem['type'],
    date: today,
    relevance: (p.siglaTipo === 'PEC' || p.siglaTipo === 'MP' ? 'alta' : 'media') as NewsItem['relevance'],
    excerpt: truncateExcerpt(p.ementa ?? '', 280),
    source: `Câmara dos Deputados — Brasil (${p.siglaTipo})`,
    sourceUrl: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${p.id}`,
    apiDetailUrl: `https://dadosabertos.camara.leg.br/api/v2/proposicoes/${p.id}`,
  }))
}
