import type { NewsItem, Topic } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// Câmara dos Deputados de Brasil · Eventos legislativos próximos.
// API pública: dadosabertos.camara.leg.br/api/v2/eventos
// CORS: ✅ abierto
//
// Devuelve sesiones plenárias, reuniones técnicas, audiencias públicas
// programadas con fecha/hora, comisión organizadora y descripción.

const BASE = 'https://dadosabertos.camara.leg.br/api/v2'

type EventoRow = {
  id?: number
  uri?: string
  dataHoraInicio?: string             // "2026-05-08T08:00"
  dataHoraFim?: string
  situacao?: string                   // "Convocada", "Em andamento", etc.
  descricaoTipo?: string              // "Reunião Técnica", "Sessão Deliberativa"
  descricao?: string                  // descripción completa del evento
  localExterno?: string | null
  urlRegistro?: string | null
  localCamara?: { nome?: string; sala?: string }
  orgaos?: { sigla?: string; nome?: string }[]
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|cidades verde|sustent|clima|polui|biolog/i.test(t)) return 'ambiente'
  if (/integra|mercosul|cooperação/i.test(t)) return 'integracion-regional'
  if (/gênero|mulher|paridad|feminin|trata/i.test(t)) return 'genero'
  if (/educação|escolar|ensino|universidad/i.test(t)) return 'educacion'
  if (/saúde|saude|hospital|sanitár|medicament/i.test(t)) return 'salud'
  if (/energia|elétric|petról|gás|combust/i.test(t)) return 'energia'
  if (/internacional|tratado|exterior|diplomáti|expoing|fronteir/i.test(t)) return 'rrii'
  if (/segurança|defesa|polic/i.test(t)) return 'seguridad'
  if (/comércio|tribut|fiscal|imposto|orçament/i.test(t)) return 'economia-regional'
  if (/transport|rodovi|ferrovi|biocean|portuári/i.test(t)) return 'corredores-bioceanicos'
  return 'integracion-regional'
}

function detectRelevance(tipo: string, desc: string): 'alta' | 'media' | 'baja' {
  const t = `${tipo} ${desc}`.toLowerCase()
  if (/sessão deliberativa|votação|deliberativ/i.test(t)) return 'alta'
  if (/audiência|comissão especial/i.test(t)) return 'media'
  if (/reunião técnica|encontro|seminári/i.test(t)) return 'baja'
  return 'media'
}

export async function fetchEventosCamaraBR(opts?: {
  limit?: number
  signal?: AbortSignal
}): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 25
  // Eventos a partir de hoy, ordenados por fecha asc (los más próximos primero)
  const dataInicio = new Date().toISOString().slice(0, 10)
  const params = new URLSearchParams({
    dataInicio,
    itens: String(limit * 2), // pedimos 2x para deduplicar
    ordem: 'ASC',
    ordenarPor: 'dataHoraInicio',
  })
  const res = await fetchWithCorsFallback(`${BASE}/eventos?${params.toString()}`, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Câmara eventos error: ${res.status}`)
  const json = (await res.json()) as { dados?: EventoRow[] }

  // Dedupear eventos repetidos (la API devuelve el mismo evento por cada órgano)
  const seen = new Set<string>()
  const unique: EventoRow[] = []
  for (const e of json.dados ?? []) {
    const key = `${e.descricao ?? ''}|${e.dataHoraInicio ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(e)
  }
  return unique.slice(0, limit).map(mapEvento).filter((x): x is NewsItem => x !== null)
}

function mapEvento(r: EventoRow): NewsItem | null {
  const desc = (r.descricao ?? '').trim()
  const tipo = (r.descricaoTipo ?? '').trim()
  if (!desc || !r.id) return null
  const fecha = (r.dataHoraInicio ?? '').slice(0, 10)
  const orgao = r.orgaos?.[0]?.sigla ?? r.orgaos?.[0]?.nome ?? 'Câmara'
  const orgaoNombre = r.orgaos?.[0]?.nome ?? 'Câmara dos Deputados'
  const titleClean = desc.length > 110 ? desc.slice(0, 107) + '…' : desc

  // El excerpt debe agregar info que NO está en el título: hora, lugar, situación,
  // comisión organizadora completa. Antes copiábamos el desc tal cual y quedaba
  // redundante con el title.
  const horaInicio = (r.dataHoraInicio ?? '').slice(11, 16)
  const horaFim = (r.dataHoraFim ?? '').slice(11, 16)
  const lugar = r.localCamara?.sala ?? r.localCamara?.nome ?? r.localExterno ?? null
  const excerptParts = [
    `Convocada por ${orgaoNombre}`,
    horaInicio ? `Inicio ${horaInicio}${horaFim ? ` · Fin ${horaFim}` : ''} (BRT)` : null,
    lugar ? `Lugar: ${lugar}` : null,
    r.situacao ? `Estado: ${r.situacao}` : null,
    `Tipo: ${tipo || 'Evento legislativo'}`,
    desc,
  ].filter(Boolean)
  const excerpt = excerptParts.join(' · ')

  return {
    id: `br-evento-${r.id}`,
    title: `${tipo || 'Evento'} · ${titleClean}`,
    country: 'BR',
    topic: detectTopic(`${desc} ${tipo}`),
    type: 'comunicado',
    date: fecha || new Date().toISOString().slice(0, 10),
    relevance: detectRelevance(tipo, desc),
    excerpt: excerpt.length > 600 ? excerpt.slice(0, 597) + '…' : excerpt,
    source: `Câmara dos Deputados · Brasil · Agenda ${orgao}`,
    fullText: desc,
    status: r.situacao ?? 'Convocado',
    tipoDocumento: tipo || 'Evento',
    tipoConteudo: orgao,
    dataPublicacao: r.dataHoraInicio,
    sourceUrl: r.urlRegistro ?? r.uri ?? undefined,
    keywords: [tipo, orgao, r.situacao ?? ''].filter(Boolean),
  }
}
