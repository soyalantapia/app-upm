import type { DocType, NewsItem, Topic } from '../../types.js'
import { loadStaticJson, truncateExcerpt } from '../util.js'

// Leyes Nacionales Destacadas (AR) · 72 leyes reales verificadas.
// Mismo mapeo que client/src/lib/sources/leyes-destacadas-ar.ts → ids idénticos
// (ar-ley-<num>) para que el dedupe del front colapse server/cliente en uno.
type Row = {
  numero: string
  title: string
  fecha: string
  topic: Topic
  type: DocType
  sumario: string
  sourceUrl?: string
}
type Data = { fuente: string; url: string; fetchedAt: string; items: Row[] }

function dotted(n: string): string {
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export async function fetchLeyesDestacadasAR(staticBase: string): Promise<NewsItem[]> {
  const data = await loadStaticJson<Data>('leyes-destacadas-ar', staticBase)
  return data.items.map(row => {
    const etiqueta = row.type === 'decreto' ? 'Decreto' : 'Ley'
    return {
      id: `ar-${row.type === 'decreto' ? 'decreto' : 'ley'}-${row.numero}`,
      title: `${etiqueta} ${dotted(row.numero)} · ${row.title}`,
      country: 'AR' as const,
      topic: row.topic,
      type: row.type,
      date: row.fecha,
      relevance: 'alta' as const,
      excerpt: truncateExcerpt(row.sumario),
      source: 'Congreso de la Nación · Argentina',
      fullText: row.sumario,
      tipoDocumento: `${etiqueta} N° ${dotted(row.numero)}`,
      tipoConteudo: 'Legislación nacional',
      authors: 'Congreso de la Nación Argentina',
      status: 'Sancionada y promulgada',
      dataPublicacao: row.fecha,
      sourceUrl: row.sourceUrl || `https://www.argentina.gob.ar/normativa/nacional/${row.numero}`,
    }
  })
}
