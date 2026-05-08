import type { DocType, NewsItem, Relevance, Topic, Tramitacion } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// API pública de la Câmara dos Deputados de Brasil
// Docs: https://dadosabertos.camara.leg.br/swagger/api.html

const BASE = 'https://dadosabertos.camara.leg.br/api/v2'

type CamaraProposicao = {
  id: number
  uri: string
  siglaTipo: string // PL, PEC, MP, etc.
  codTipo: number
  numero: number
  ano: number
  ementa: string
}

type CamaraResponse = { dados: CamaraProposicao[] }

// Heurística: mapea sigla del tipo brasileño al type genérico de UPM.
const SIGLA_TO_TYPE: Record<string, DocType> = {
  PL: 'ley',
  PLP: 'ley',
  PLN: 'ley',
  PEC: 'reglamento',
  PDL: 'decreto',
  MP: 'decreto',
  PDC: 'decreto',
  REQ: 'comunicado',
  RIC: 'comunicado',
  PRC: 'reglamento',
  PFC: 'comunicado',
  INC: 'comunicado',
}

const SIGLA_FULL: Record<string, string> = {
  PL: 'Projeto de Lei',
  PLP: 'Projeto de Lei Complementar',
  PEC: 'Proposta de Emenda à Constituição',
  PDL: 'Projeto de Decreto Legislativo',
  MP: 'Medida Provisória',
  PRC: 'Projeto de Resolução',
}

// Heurística simple de tema basada en keywords del ementa.
function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/ambiental|ambiente|sustent|clima|meio ambiente|polui/i.test(t)) return 'ambiente'
  if (/corredor|infraestrutur|logístic|rodovi|biocean/i.test(t)) return 'corredores-bioceanicos'
  if (/integra|mercosul|mercosur|cooperação/i.test(t)) return 'integracion-regional'
  if (/gênero|mulher|feminin|paridad/i.test(t)) return 'genero'
  if (/educação|escolar|ensino|educac/i.test(t)) return 'educacion'
  if (/saúde|saude|sanitári|hospital/i.test(t)) return 'salud'
  if (/energia|elétric|petról|gás|combustí/i.test(t)) return 'energia'
  if (/relações exteriores|tratado|internacional|diplomáti/i.test(t)) return 'rrii'
  if (/segurança|público|fronteir/i.test(t)) return 'seguridad'
  if (/comércio|comercial|tribut|fiscal|aduan/i.test(t)) return 'economia-regional'
  return 'integracion-regional'
}

// Heurística de relevancia: PEC y MP son alta; PL y PLP media; resto baja.
function detectRelevance(sigla: string): Relevance {
  if (sigla === 'PEC' || sigla === 'MP') return 'alta'
  if (sigla === 'PL' || sigla === 'PLP' || sigla === 'PDL') return 'media'
  return 'baja'
}

export async function fetchCamaraProposicoes(opts?: {
  limit?: number
  signal?: AbortSignal
}): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 30
  // Trae las últimas proposiciones ordenadas por fecha de apresentação descendente.
  const params = new URLSearchParams({
    itens: String(limit),
    ordem: 'DESC',
    ordenarPor: 'id',
  })
  const url = `${BASE}/proposicoes?${params.toString()}`

  const res = await fetchWithCorsFallback(url, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Câmara BR API error: ${res.status}`)
  const json = (await res.json()) as CamaraResponse

  return (json.dados ?? []).map(mapProposicao)
}

function mapProposicao(p: CamaraProposicao): NewsItem {
  const tipo = SIGLA_FULL[p.siglaTipo] ?? p.siglaTipo
  const ementa = (p.ementa ?? '').trim()
  const title = `${tipo} ${p.numero}/${p.ano} · Brasil`
  const excerpt = ementa.length > 600 ? ementa.slice(0, 597) + '…' : ementa
  // Fecha aproximada por el año del proyecto. El enrich on-demand reemplaza
  // dataPublicacao con la fecha exacta (dataApresentacao) cuando se abre el
  // detalle. Para el listado en Radar usamos el año del proyecto.
  const fechaAprox = `${p.ano}-01-01`
  return {
    id: 'br-camara-' + p.id,
    title,
    country: 'BR',
    topic: detectTopic(ementa + ' ' + tipo),
    type: SIGLA_TO_TYPE[p.siglaTipo] ?? 'ley',
    date: fechaAprox,
    relevance: detectRelevance(p.siglaTipo),
    excerpt: excerpt || `Proposição ${p.siglaTipo} ${p.numero}/${p.ano} en trámite legislativo.`,
    source: `Câmara dos Deputados · Brasil (${p.siglaTipo})`,
    fullText: ementa,
    tipoDocumento: `${p.siglaTipo} ${p.numero}/${p.ano}`,
    tipoConteudo: tipo,
    apiDetailUrl: `${BASE}/proposicoes/${p.id}`,
  }
}

// Enriquecer un item de Câmara con su detalle completo
type CamaraDetalle = {
  ementa?: string
  ementaDetalhada?: string
  keywords?: string
  urlInteiroTeor?: string
  statusProposicao?: { descricaoSituacao?: string; descricaoTramitacao?: string }
  dataApresentacao?: string
}
type CamaraAutor = { nome?: string; siglaPartido?: string; siglaUf?: string }

type CamaraTramitacao = {
  dataHora?: string
  siglaOrgao?: string
  descricaoTramitacao?: string
  descricaoSituacao?: string
  despacho?: string
}

export async function enrichCamaraItem(item: NewsItem, signal?: AbortSignal): Promise<NewsItem> {
  if (!item.apiDetailUrl) return item
  try {
    const [detRes, autRes, tramRes] = await Promise.all([
      fetchWithCorsFallback(item.apiDetailUrl, { signal, headers: { Accept: 'application/json' } }),
      fetchWithCorsFallback(item.apiDetailUrl + '/autores', { signal, headers: { Accept: 'application/json' } }),
      fetchWithCorsFallback(item.apiDetailUrl + '/tramitacoes', { signal, headers: { Accept: 'application/json' } }),
    ])
    const det = (await detRes.json()) as { dados?: CamaraDetalle }
    const aut = (await autRes.json()) as { dados?: CamaraAutor[] }
    const tram = (await tramRes.json().catch(() => ({}))) as { dados?: CamaraTramitacao[] }
    const dados = det.dados ?? {}
    const autores = (aut.dados ?? [])
      .map(a => `${a.nome ?? ''}${a.siglaPartido ? ` (${a.siglaPartido}${a.siglaUf ? '/' + a.siglaUf : ''})` : ''}`)
      .filter(Boolean)
      .join(', ')
    const fullText = (dados.ementaDetalhada ?? dados.ementa ?? item.fullText ?? '').trim()
    const keywords = (dados.keywords ?? '')
      .split(/[,;]/)
      .map(k => k.trim())
      .filter(Boolean)
    // Tramitacoes vienen del más antiguo al más reciente · invertimos y tomamos las últimas 10
    const tramitaciones: Tramitacion[] = (tram.dados ?? [])
      .slice()
      .reverse()
      .slice(0, 10)
      .map(t => ({
        fecha: (t.dataHora ?? '').slice(0, 16).replace('T', ' '),
        descripcion: (t.descricaoTramitacao || t.descricaoSituacao || t.despacho || 'Tramitação').trim(),
        organo: t.siglaOrgao,
        despacho: t.despacho && t.despacho !== t.descricaoTramitacao ? t.despacho.trim() : undefined,
      }))
      .filter(t => t.descripcion.length > 0)
    return {
      ...item,
      fullText: fullText.length > 0 ? fullText : item.fullText,
      authors: autores || item.authors,
      status: dados.statusProposicao?.descricaoSituacao || dados.statusProposicao?.descricaoTramitacao || item.status,
      keywords: keywords.length > 0 ? keywords : item.keywords,
      sourceUrl: dados.urlInteiroTeor || item.sourceUrl,
      pdfUrl: dados.urlInteiroTeor || item.pdfUrl,
      dataPublicacao: dados.dataApresentacao || item.dataPublicacao,
      tramitaciones: tramitaciones.length > 0 ? tramitaciones : item.tramitaciones,
    }
  } catch {
    return item
  }
}
