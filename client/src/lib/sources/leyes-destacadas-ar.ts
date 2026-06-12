import type { DocType, NewsItem, Topic } from '@/lib/types'

// Leyes Nacionales Destacadas · Congreso de la Nación Argentina.
// Set curado de leyes/decretos nacionales REALES y verificados (número, fecha
// y sumario reales). id `ar-ley-<num>` engancha el grafo de citaciones.

type Row = {
  numero: string // solo dígitos, ej "27742"
  title: string
  fecha: string // YYYY-MM-DD
  topic: Topic
  type: DocType
  sumario: string
  sourceUrl?: string
}

type LeyesData = { fuente: string; url: string; fetchedAt: string; items: Row[] }

const PUBLIC_BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '')
const DATA_URL = `${PUBLIC_BASE}/data/leyes-destacadas-ar.json`

// 27742 → "27.742"
function dotted(n: string): string {
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export async function fetchLeyesDestacadasAR(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 40
  const res = await fetch(DATA_URL, { signal: opts?.signal })
  if (!res.ok) throw new Error(`Leyes destacadas AR data error: ${res.status}`)
  const data = (await res.json()) as LeyesData
  return data.items.slice(0, limit).map(row => {
    const etiqueta = row.type === 'decreto' ? 'Decreto' : 'Ley'
    return {
      id: `ar-${row.type === 'decreto' ? 'decreto' : 'ley'}-${row.numero}`,
      title: `${etiqueta} ${dotted(row.numero)} · ${row.title}`,
      country: 'AR' as const,
      topic: row.topic,
      type: row.type,
      date: row.fecha,
      relevance: 'alta' as const,
      excerpt: row.sumario.length > 600 ? row.sumario.slice(0, 597) + '…' : row.sumario,
      source: 'Congreso de la Nación · Argentina',
      fullText: row.sumario,
      tipoDocumento: `${etiqueta} N° ${dotted(row.numero)}`,
      tipoConteudo: 'Legislación nacional',
      authors: 'Congreso de la Nación Argentina',
      status: 'Sancionada y promulgada',
      dataPublicacao: row.fecha,
      sourceUrl: row.sourceUrl ?? `https://www.argentina.gob.ar/normativa/nacional/${row.numero}`,
    }
  })
}
