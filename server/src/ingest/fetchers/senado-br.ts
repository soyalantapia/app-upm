import type { NewsItem } from '../../types.js'
import { detectTopic } from '../topic.js'
import { fetchJson, truncateExcerpt } from '../util.js'

// Portado del worker (senadoBR) — procesos del Senado Federal de Brasil.
type Processo = { id: number; identificacao?: string; ementa?: string; apresentacao?: string }

export async function fetchSenadoBR(): Promise<NewsItem[]> {
  const year = new Date().getFullYear()
  const j = await fetchJson<{ ListaProcesso?: { Processos?: { Processo?: Processo | Processo[] } } }>(
    `https://legis.senado.leg.br/dadosabertos/processo?ano=${year}&format=json`,
  )
  const raw = j.ListaProcesso?.Processos?.Processo
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  return list.slice(0, 20).map(p => ({
    id: 'br-senado-' + p.id,
    title: `${p.identificacao ?? `Processo ${p.id}`} — Senado Brasil`,
    country: 'BR' as const,
    topic: detectTopic((p.ementa ?? '') + ' ' + (p.identificacao ?? '')),
    type: 'ley' as const,
    date: (p.apresentacao ?? new Date().toISOString()).slice(0, 10),
    relevance: 'media' as const,
    excerpt: truncateExcerpt(p.ementa ?? '', 280),
    source: 'Senado Federal — Brasil',
  }))
}
