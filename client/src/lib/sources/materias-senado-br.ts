import type { DocType, NewsItem, Relevance, Topic } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// Senado Federal Brasil · Matérias legislativas em tramitação.
// API: https://legis.senado.leg.br/dadosabertos/materia
// Documentação: https://legis.senado.leg.br/dadosabertos/docs
// CORS: abierto

const BASE = 'https://legis.senado.leg.br/dadosabertos'

type MateriaRow = {
  Codigo?: string
  IdentificacaoMateria?: {
    SiglaSubtipoMateria?: string         // PLS, PEC, MPV, etc.
    NumeroMateria?: string
    AnoMateria?: string
    DescricaoSubtipoMateria?: string
  }
  EmentaMateria?: string
  DadosBasicosMateria?: {
    DataApresentacao?: string             // "YYYY-MM-DD"
    NomeCasaIniciadora?: string
  }
  Autoria?: {
    Autor?: { NomeAutor?: string }[] | { NomeAutor?: string }
  }
  SituacaoAtual?: {
    Autuacoes?: {
      Autuacao?: {
        Local?: { NomeLocal?: string }
      }
    }
  }
}

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/meio ambiente|sustent|clima|polui|biolog/i.test(t)) return 'ambiente'
  if (/integra|mercosul|cooperação/i.test(t)) return 'integracion-regional'
  if (/gênero|mulher|paridad|feminin|trata/i.test(t)) return 'genero'
  if (/educação|escolar|ensino|universidad/i.test(t)) return 'educacion'
  if (/saúde|saude|hospital|sanitár|medicament/i.test(t)) return 'salud'
  if (/energia|elétric|petról|gás|combust/i.test(t)) return 'energia'
  if (/internacional|tratado|exterior|diplomáti/i.test(t)) return 'rrii'
  if (/segurança|defesa|polic/i.test(t)) return 'seguridad'
  if (/comércio|tribut|fiscal|imposto|orçament/i.test(t)) return 'economia-regional'
  if (/transport|rodovi|ferrovi|biocean|portuári/i.test(t)) return 'corredores-bioceanicos'
  return 'integracion-regional'
}

function detectRelevance(sigla: string): Relevance {
  if (sigla === 'PEC') return 'alta'
  if (sigla === 'MPV') return 'alta'
  if (sigla === 'PLS' || sigla === 'PLC' || sigla === 'PL') return 'media'
  return 'baja'
}

const SIGLA_TO_TYPE: Record<string, DocType> = {
  PEC: 'reglamento',
  MPV: 'decreto',
  PLS: 'ley',
  PLC: 'ley',
  PL: 'ley',
  PDS: 'decreto',
  PRS: 'reglamento',
  REQ: 'comunicado',
}

export async function fetchMateriasSenadoBR(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 30
  // El endpoint /materia/atualizacoes/30 trae materias actualizadas en últimos 30 días
  const url = `${BASE}/materia/atualizacoes/${limit}`
  const res = await fetchWithCorsFallback(url, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Senado BR materias error: ${res.status}`)
  const json = (await res.json()) as {
    AtualizacaoMateria?: { Materias?: { Materia?: MateriaRow[] | MateriaRow } }
  }
  const raw = json.AtualizacaoMateria?.Materias?.Materia
  const items = Array.isArray(raw) ? raw : raw ? [raw] : []
  return items
    .map(row => mapRow(row))
    .filter((x): x is NewsItem => x !== null)
    .slice(0, limit)
}

function mapRow(r: MateriaRow): NewsItem | null {
  const ident = r.IdentificacaoMateria
  if (!ident || !ident.NumeroMateria || !ident.AnoMateria) return null
  const sigla = ident.SiglaSubtipoMateria ?? 'PL'
  const numero = ident.NumeroMateria
  const ano = ident.AnoMateria
  const id = `br-senado-mat-${sigla}-${numero}-${ano}`
  const ementa = (r.EmentaMateria ?? '').trim()
  const tipoDoc = `${sigla} ${numero}/${ano}`
  const tipo = SIGLA_TO_TYPE[sigla] ?? 'ley'
  const tipoLabel = ident.DescricaoSubtipoMateria ?? sigla

  // Autoría
  const autoria = r.Autoria?.Autor
  const autoresArr = Array.isArray(autoria) ? autoria : autoria ? [autoria] : []
  const autores = autoresArr.map(a => a.NomeAutor).filter(Boolean).join(', ')

  // Situación
  const local = r.SituacaoAtual?.Autuacoes?.Autuacao?.Local?.NomeLocal ?? ''

  const fecha = (r.DadosBasicosMateria?.DataApresentacao ?? '').slice(0, 10) || new Date().toISOString().slice(0, 10)

  return {
    id,
    title: `${tipoLabel} ${numero}/${ano} · Senado Federal Brasil`,
    country: 'BR',
    topic: detectTopic(ementa + ' ' + tipoLabel),
    type: tipo,
    date: fecha,
    relevance: detectRelevance(sigla),
    excerpt: ementa.length > 600 ? ementa.slice(0, 597) + '…' : (ementa || `Matéria ${tipoDoc} em tramitação no Senado Federal.`),
    source: `Senado Federal Brasil · ${tipoLabel}`,
    fullText: ementa,
    tipoDocumento: tipoDoc,
    tipoConteudo: tipoLabel,
    authors: autores,
    status: local || 'Em tramitação',
    dataPublicacao: fecha,
    sourceUrl: `https://www25.senado.leg.br/web/atividade/materias/-/materia/${r.Codigo ?? ''}`,
  }
}
