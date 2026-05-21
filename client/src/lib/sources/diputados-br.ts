// Câmara dos Deputados de Brasil · diputados en ejercicio.
// API pública: dadosabertos.camara.leg.br/api/v2/deputados
// CORS abierto · sin paginación necesaria para los ~513 actuales.

import { fetchWithCorsFallback } from './cors-fetch'

const BASE = 'https://dadosabertos.camara.leg.br/api/v2'

type DeputadoListRow = {
  id: number
  uri: string
  nome: string
  siglaPartido: string
  uriPartido?: string
  siglaUf: string
  idLegislatura: number
  urlFoto?: string
  email?: string
}

export type DeputadoBR = {
  id: string                // br-deputado-{id}
  apiId: number
  name: string
  partido: string
  uf: string
  foto?: string
  email?: string
  url: string
}

export async function fetchDiputadosBR(opts?: { limit?: number; signal?: AbortSignal }): Promise<DeputadoBR[]> {
  const limit = opts?.limit ?? 600
  const params = new URLSearchParams({ itens: String(limit), ordem: 'ASC', ordenarPor: 'nome' })
  const url = `${BASE}/deputados?${params.toString()}`
  const res = await fetchWithCorsFallback(url, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Câmara BR deputados error: ${res.status}`)
  const json = (await res.json()) as { dados?: DeputadoListRow[] }
  return (json.dados ?? []).map(d => ({
    id: `br-deputado-${d.id}`,
    apiId: d.id,
    name: d.nome,
    partido: d.siglaPartido ?? '',
    uf: d.siglaUf ?? '',
    foto: d.urlFoto,
    email: d.email,
    url: `https://www.camara.leg.br/deputados/${d.id}`,
  }))
}

// Detalle on-demand de un diputado individual
type DeputadoDetail = {
  id: number
  nomeCivil?: string
  ultimoStatus?: {
    nome?: string
    nomeEleitoral?: string
    siglaPartido?: string
    siglaUf?: string
    urlFoto?: string
    email?: string
    gabinete?: { telefone?: string; sala?: string; predio?: string; andar?: string }
    situacao?: string
  }
  cpf?: string
  sexo?: string
  dataNascimento?: string
  municipioNascimento?: string
  ufNascimento?: string
  escolaridade?: string
  redeSocial?: string[]
}

export async function fetchDiputadoBRDetail(apiId: number, signal?: AbortSignal): Promise<DeputadoDetail | null> {
  try {
    const res = await fetchWithCorsFallback(`${BASE}/deputados/${apiId}`, {
      signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { dados?: DeputadoDetail }
    return json.dados ?? null
  } catch {
    return null
  }
}
