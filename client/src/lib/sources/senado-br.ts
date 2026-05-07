import type { NewsItem, Topic } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// API pública del Senado Federal de Brasil
// Docs: https://legis.senado.leg.br/dadosabertos/docs/
//
// CORS: ✅ Senado abre CORS con Access-Control-Allow-Origin: *
// Endpoint /processo devuelve un ARRAY directo de items, no envuelto.

const BASE = 'https://legis.senado.leg.br/dadosabertos'

type SenadoProcesso = {
  id: number
  codigoMateria?: number
  identificacao?: string
  ementa?: string
  dataApresentacao?: string
  dataUltimaAtualizacao?: string
  tipoConteudo?: string
  tipoDocumento?: string
  autoria?: string
  tramitando?: string
  urlDocumento?: string
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|polui|meio ambiente|preservaç/i.test(t)) return 'ambiente'
  if (/corredor|infraestrutur|logístic|biocean|rodovi|ferrovi/i.test(t)) return 'corredores-bioceanicos'
  if (/integra|mercosul|mercosur|cooperação/i.test(t)) return 'integracion-regional'
  if (/gênero|mulher|paridad|feminin/i.test(t)) return 'genero'
  if (/educação|ensino|escolar/i.test(t)) return 'educacion'
  if (/saúde|sanitár|hospital|médic/i.test(t)) return 'salud'
  if (/energia|elétric|petról|renovável|combust/i.test(t)) return 'energia'
  if (/internacional|tratado|exterior|diplomát/i.test(t)) return 'rrii'
  if (/segurança|defesa|fronteir|polic/i.test(t)) return 'seguridad'
  if (/comércio|tribut|fiscal|economi|tribut|imposto/i.test(t)) return 'economia-regional'
  return 'integracion-regional'
}

function detectRelevance(tipoDoc: string | undefined): 'alta' | 'media' | 'baja' {
  const t = (tipoDoc ?? '').toLowerCase()
  if (/projeto de lei|projeto de emenda/i.test(t)) return 'alta'
  if (/medida provisória|projeto de lei complementar/i.test(t)) return 'alta'
  if (/emenda|requerimento/i.test(t)) return 'media'
  return 'baja'
}

export async function fetchSenadoBR(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 30
  // El endpoint devuelve un array directo de procesos del año
  const url = `${BASE}/processo?ano=${new Date().getFullYear()}&limit=${limit}`
  const res = await fetchWithCorsFallback(url, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Senado BR API error: ${res.status}`)
  const data = (await res.json()) as SenadoProcesso[]
  if (!Array.isArray(data)) return []
  return data.slice(0, limit).map(mapItem).filter((x): x is NewsItem => x !== null)
}

function mapItem(p: SenadoProcesso): NewsItem | null {
  const ementa = (p.ementa ?? '').trim()
  const ident = p.identificacao ?? `Processo ${p.id}`
  const date = (p.dataApresentacao ?? p.dataUltimaAtualizacao ?? new Date().toISOString()).slice(0, 10)
  const tipoDoc = p.tipoDocumento ?? p.tipoConteudo ?? ''
  if (!ementa && !ident) return null
  return {
    id: 'br-senado-' + p.id,
    title: `${ident} — ${tipoDoc || 'Senado'} (Brasil)`,
    country: 'BR',
    topic: detectTopic(ementa + ' ' + ident + ' ' + tipoDoc),
    type: 'ley',
    date,
    relevance: detectRelevance(tipoDoc),
    excerpt: ementa.length > 280
      ? ementa.slice(0, 277) + '…'
      : ementa || `Materia ${ident} en trámite en el Senado Federal.`,
    source: `Senado Federal — Brasil${p.autoria ? ' · ' + p.autoria.slice(0, 50) : ''}`,
  }
}
