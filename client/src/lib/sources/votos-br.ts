// Votos individuales (nominales) por votación de la Câmara BR.
// API: /votacoes/{id}/votos · CORS abierto.
// Cada voto tiene: deputado.id, deputado.nome, partido, UF, tipoVoto.

import { fetchWithCorsFallback } from './cors-fetch'

const BASE = 'https://dadosabertos.camara.leg.br/api/v2'

export type VotoBR = {
  deputadoId: number
  deputadoNome: string
  partido: string
  uf: string
  tipoVoto: 'Sim' | 'Não' | 'Abstenção' | 'Obstrução' | 'Art. 17' | string
  foto?: string
}

type VotoApiRow = {
  tipoVoto?: string
  dataRegistroVoto?: string
  deputado_?: {
    id?: number
    nome?: string
    siglaPartido?: string
    siglaUf?: string
    urlFoto?: string
  }
}

export async function fetchVotosForVotacao(votacaoId: string, signal?: AbortSignal): Promise<VotoBR[]> {
  try {
    const res = await fetchWithCorsFallback(`${BASE}/votacoes/${votacaoId}/votos`, {
      signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const json = (await res.json()) as { dados?: VotoApiRow[] }
    return (json.dados ?? [])
      .map(v => mapVoto(v))
      .filter((x): x is VotoBR => x !== null)
  } catch {
    return []
  }
}

function mapVoto(v: VotoApiRow): VotoBR | null {
  const dep = v.deputado_
  if (!dep || !dep.id || !dep.nome) return null
  return {
    deputadoId: dep.id,
    deputadoNome: dep.nome,
    partido: dep.siglaPartido ?? '',
    uf: dep.siglaUf ?? '',
    tipoVoto: (v.tipoVoto as VotoBR['tipoVoto']) ?? 'Abstenção',
    foto: dep.urlFoto,
  }
}

export type VotoSummary = {
  sim: number
  nao: number
  abstencao: number
  obstrucao: number
  outro: number
  total: number
  byParty: Map<string, { sim: number; nao: number; abstencao: number }>
  byUf: Map<string, { sim: number; nao: number }>
}

export function summarizeVotos(votos: VotoBR[]): VotoSummary {
  const summary: VotoSummary = {
    sim: 0, nao: 0, abstencao: 0, obstrucao: 0, outro: 0, total: votos.length,
    byParty: new Map(),
    byUf: new Map(),
  }
  for (const v of votos) {
    switch (v.tipoVoto) {
      case 'Sim': summary.sim++; break
      case 'Não': summary.nao++; break
      case 'Abstenção': summary.abstencao++; break
      case 'Obstrução': summary.obstrucao++; break
      default: summary.outro++; break
    }
    // Por partido
    if (v.partido) {
      const cur = summary.byParty.get(v.partido) ?? { sim: 0, nao: 0, abstencao: 0 }
      if (v.tipoVoto === 'Sim') cur.sim++
      else if (v.tipoVoto === 'Não') cur.nao++
      else cur.abstencao++
      summary.byParty.set(v.partido, cur)
    }
    // Por UF
    if (v.uf) {
      const cur = summary.byUf.get(v.uf) ?? { sim: 0, nao: 0 }
      if (v.tipoVoto === 'Sim') cur.sim++
      else if (v.tipoVoto === 'Não') cur.nao++
      summary.byUf.set(v.uf, cur)
    }
  }
  return summary
}
