import type { NewsItem, Relevance, Topic } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// API pública del Senado Federal de Brasil
// Docs: https://legis.senado.leg.br/dadosabertos/docs/

const BASE = 'https://legis.senado.leg.br/dadosabertos'

type ProcessoListaItem = {
  id: number
  identificacao?: string
  ementa?: string
  apresentacao?: string
}

type ProcessoListaResponse = {
  ListaProcesso?: {
    Processos?: {
      Processo?: ProcessoListaItem | ProcessoListaItem[]
    }
  }
}

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/ambient|sustent|clima|polui|meio ambiente/i.test(t)) return 'ambiente'
  if (/corredor|infraestrutur|logístic|biocean/i.test(t)) return 'corredores-bioceanicos'
  if (/integra|mercosul|mercosur|cooperação/i.test(t)) return 'integracion-regional'
  if (/gênero|mulher|paridad/i.test(t)) return 'genero'
  if (/educação|ensino/i.test(t)) return 'educacion'
  if (/saúde|sanitár/i.test(t)) return 'salud'
  if (/energia|elétric|petról/i.test(t)) return 'energia'
  if (/internacional|tratado/i.test(t)) return 'rrii'
  if (/segurança|fronteir/i.test(t)) return 'seguridad'
  if (/comércio|tribut|fiscal/i.test(t)) return 'economia-regional'
  return 'integracion-regional'
}

export async function fetchSenadoBR(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 20
  // Endpoint que lista las últimas matérias en tramitación
  const url = `${BASE}/processo?ano=${new Date().getFullYear()}&format=json`
  const res = await fetchWithCorsFallback(url, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Senado BR API error: ${res.status}`)
  const json = (await res.json()) as ProcessoListaResponse

  const raw = json.ListaProcesso?.Processos?.Processo
  const list: ProcessoListaItem[] = Array.isArray(raw) ? raw : raw ? [raw] : []
  return list.slice(0, limit).map(p => mapItem(p))
}

function mapItem(p: ProcessoListaItem): NewsItem {
  const ementa = (p.ementa ?? '').trim()
  const ident = p.identificacao ?? `Processo ${p.id}`
  const date = (p.apresentacao ?? new Date().toISOString()).slice(0, 10)
  return {
    id: 'br-senado-' + p.id,
    title: `${ident} — Senado Brasil`,
    country: 'BR',
    topic: detectTopic(ementa + ' ' + ident),
    type: 'ley',
    date,
    relevance: 'media' as Relevance,
    excerpt: ementa.length > 280 ? ementa.slice(0, 277) + '…' : ementa || `Materia ${ident} en trámite en el Senado Federal.`,
    source: 'Senado Federal — Brasil',
  }
}
