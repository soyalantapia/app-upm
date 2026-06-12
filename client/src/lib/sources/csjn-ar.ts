import type { NewsItem, Topic } from '@/lib/types'

// Corte Suprema de Justicia de la Nación (CSJN) · Argentina.
// 20 fallos/sumarios emblemáticos curados (Riachuelo, glaciares, género,
// salud, etc.). El JSON ya existía en public/data/csjn-ar.json sin fetcher.

type CsjnRow = {
  id: string
  title: string
  fecha: string
  sala: string
  ley?: string
  sumario: string
  url?: string
  tags?: string[]
}

type CsjnData = { fuente: string; url: string; fetchedAt: string; items: CsjnRow[] }

const PUBLIC_BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '')
const DATA_URL = `${PUBLIC_BASE}/data/csjn-ar.json`

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/ambient|riachuelo|cuenca|glaciar|residuo|contaminaci|acumar|sustent/i.test(t)) return 'ambiente'
  if (/g[ée]nero|mujer|aborto|femicid|paridad|violencia de g/i.test(t)) return 'genero'
  if (/salud|sanitari|vacuna|medicament|obra social|pami|discapacidad/i.test(t)) return 'salud'
  if (/educac|universi|escolar|ense[ñn]/i.test(t)) return 'educacion'
  if (/energ|tarifa|hidrocarbur|gas|el[ée]ctric|combustible/i.test(t)) return 'energia'
  if (/penal|detenid|polic|narcotr|seguridad|c[áa]rcel|prisi[óo]n/i.test(t)) return 'seguridad'
  if (/tributari|impuesto|copartici|aduaner|econ[óo]mic|fiscal/i.test(t)) return 'economia-regional'
  if (/tratado|internacional|extradici|derechos humanos/i.test(t)) return 'rrii'
  if (/mercosur/i.test(t)) return 'mercosur'
  return 'integracion-regional'
}

export async function fetchCsjnAR(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 30
  const res = await fetch(DATA_URL, { signal: opts?.signal })
  if (!res.ok) throw new Error(`CSJN AR data error: ${res.status}`)
  const data = (await res.json()) as CsjnData
  return data.items.slice(0, limit).map(row => {
    const tags = (row.tags ?? []).join(' ')
    return {
      id: row.id,
      title: row.title,
      country: 'AR' as const,
      topic: detectTopic(`${row.title} ${row.sumario} ${tags}`),
      type: 'informe' as const,
      date: row.fecha,
      relevance: 'alta' as const, // fallos de la Corte Suprema = máxima jerarquía
      excerpt: row.sumario.length > 600 ? row.sumario.slice(0, 597) + '…' : row.sumario,
      source: 'Corte Suprema de Justicia de la Nación · Argentina',
      fullText: row.sumario,
      tipoDocumento: row.ley ? `Fallo CSJN · Ley ${row.ley}` : 'Fallo CSJN',
      tipoConteudo: 'Jurisprudencia',
      authors: row.sala,
      status: 'Sentencia firme',
      keywords: row.tags,
      dataPublicacao: row.fecha,
      sourceUrl: row.url ?? 'https://www.csjn.gov.ar',
    }
  })
}
