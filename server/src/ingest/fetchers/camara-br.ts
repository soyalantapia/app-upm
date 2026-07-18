import type { NewsItem } from '../../types.js'
import { detectTopic } from '../topic.js'
import { fetchJson, truncateExcerpt } from '../util.js'

// Portado del worker (camaraBR) — API abierta de la Câmara dos Deputados.
type Proposicao = { id: number; siglaTipo: string; numero: number; ano: number; ementa: string }

// Las proposiciones de la Câmara son mayormente PROYECTOS y artefactos de
// TRAMITACIÓN (requerimentos, pareceres, substitutivos, documentos), NO leyes
// sancionadas: etiquetar todo como 'ley' (como hacía antes) tergiversaba el
// corpus ante legisladores. Solo los proyectos sustantivos quedan como ley/
// reglamento/decreto; lo procesal/documental va a comunicado/informe. Desconocida
// → 'informe' (NUNCA 'ley'). Mapeo alineado con el fetcher cliente.
const SIGLA_TO_TYPE: Record<string, NewsItem['type']> = {
  PL: 'ley', PLP: 'ley', PLN: 'ley', PLV: 'ley',
  PEC: 'reglamento', PRC: 'reglamento',
  MP: 'decreto', MPV: 'decreto', PDL: 'decreto', PDC: 'decreto',
  REQ: 'comunicado', RIC: 'comunicado', INC: 'comunicado', PFC: 'comunicado', RCP: 'comunicado',
  PRL: 'informe', PAR: 'informe', SBT: 'informe', SBR: 'informe', ERD: 'informe',
  EMC: 'informe', EMR: 'informe', EMP: 'informe', PES: 'informe', DOC: 'informe',
  RDF: 'informe', TCU: 'informe', MSC: 'informe',
}

// Nombre legible de cada sigla, para títulos claros (no el críptico "REQ 39/2026").
const SIGLA_FULL: Record<string, string> = {
  PL: 'Projeto de Lei', PLP: 'Projeto de Lei Complementar', PLN: 'Projeto de Lei',
  PLV: 'Projeto de Lei de Conversão', PEC: 'Proposta de Emenda à Constituição',
  PRC: 'Projeto de Resolução', MP: 'Medida Provisória', MPV: 'Medida Provisória',
  PDL: 'Projeto de Decreto Legislativo', PDC: 'Projeto de Decreto Legislativo',
  REQ: 'Requerimento', RIC: 'Requerimento de Informação', INC: 'Indicação',
  PFC: 'Proposta de Fiscalização e Controle', RCP: 'Requerimento (CPI)',
  PRL: 'Parecer do Relator', PAR: 'Parecer', SBT: 'Substitutivo', SBR: 'Subemenda',
  ERD: 'Emenda de Redação', EMC: 'Emenda', EMR: 'Emenda de Relator', EMP: 'Emenda de Plenário',
  DOC: 'Documento', RDF: 'Recurso', TCU: 'Tomada de Contas (TCU)', MSC: 'Mensagem',
}

// Solo proyectos de ley/reforma sustantivos son 'alta'; lo procesal, 'baja'.
function relevanceFor(sigla: string): NewsItem['relevance'] {
  if (sigla === 'PEC' || sigla === 'MP' || sigla === 'MPV') return 'alta'
  if (sigla === 'PL' || sigla === 'PLP' || sigla === 'PLN' || sigla === 'PLV' || sigla === 'PDL') return 'media'
  return 'baja'
}

export async function fetchCamaraBR(): Promise<NewsItem[]> {
  const j = await fetchJson<{ dados: Proposicao[] }>(
    'https://dadosabertos.camara.leg.br/api/v2/proposicoes?itens=30&ordem=DESC&ordenarPor=id',
  )
  const today = new Date().toISOString().slice(0, 10)
  return j.dados.map(p => {
    const full = SIGLA_FULL[p.siglaTipo] ?? p.siglaTipo
    const ano = p.ano && p.ano > 1900 ? p.ano : new Date().getFullYear()
    const ementa = (p.ementa ?? '').trim().replace(/\s+/g, ' ')
    const docLabel = `${full} ${p.numero}/${ano}`
    // Título = la ementa (única por proposición). Antes usábamos
    // `${sigla} ${numero}/${ano}`, que colapsaba cientos de pareceres/
    // substitutivos al mismo título (ej. "Parecer do Relator 1/2026" ×97).
    // La sigla/número queda en tipoDocumento.
    return {
      id: 'br-camara-' + p.id,
      title: ementa ? (ementa.length > 110 ? ementa.slice(0, 107) + '…' : ementa) : `${docLabel} · Brasil`,
      country: 'BR' as const,
      topic: detectTopic(p.ementa + ' ' + p.siglaTipo),
      type: SIGLA_TO_TYPE[p.siglaTipo] ?? 'informe',
      date: today,
      relevance: relevanceFor(p.siglaTipo),
      excerpt: truncateExcerpt(p.ementa ?? '', 280),
      tipoDocumento: docLabel,
      source: `Câmara dos Deputados — Brasil (${p.siglaTipo})`,
      sourceUrl: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${p.id}`,
      apiDetailUrl: `https://dadosabertos.camara.leg.br/api/v2/proposicoes/${p.id}`,
    }
  })
}
