import type { NewsItem, Relevance, Topic } from '../../types.js'
import { loadStaticJson, truncateExcerpt } from '../util.js'

// CNV Argentina · Resoluciones del mercado de capitales.
// Portado de client/src/lib/sources/cnv-ar.ts — mismo mapeo → ids idénticos
// (row.id) para que el dedupe del front colapse server/cliente en uno.
// Dataset estático curado: client/public/data/cnv-ar.json.

type CnvRow = {
  id: string
  tipoDocumento: string
  title: string
  fecha: string
  tipo: string
  ementa: string
}

type CnvData = { fuente: string; url: string; fetchedAt: string; items: CnvRow[] }

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/cripto|token|blockchain/i.test(t)) return 'integracion-regional'
  if (/sostenib|esg|verde|sustent/i.test(t)) return 'ambiente'
  if (/g[ée]nero|paridad|mujer/i.test(t)) return 'genero'
  if (/mercosur|mercosul|integraci[óo]n/i.test(t)) return 'integracion-regional'
  return 'economia-regional'
}

function detectRelevance(title: string): Relevance {
  if (/reglament|nuev[ao]\s+r[ée]gimen|marco regulatorio/i.test(title)) return 'alta'
  return 'media'
}

export async function fetchCnvAR(staticBase: string, opts?: { limit?: number }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 30
  const data = await loadStaticJson<CnvData>('cnv-ar', staticBase)
  return data.items.slice(0, limit).map(row => ({
    id: row.id,
    title: row.title,
    country: 'AR' as const,
    topic: detectTopic(row.title + ' ' + row.ementa),
    type: 'reglamento' as const,
    date: row.fecha,
    relevance: detectRelevance(row.title),
    excerpt: truncateExcerpt(row.ementa),
    source: 'Comisión Nacional de Valores · Argentina',
    fullText: row.ementa,
    tipoDocumento: row.tipoDocumento,
    tipoConteudo: 'Resolución CNV',
    authors: 'Directorio de la Comisión Nacional de Valores',
    status: 'Vigente',
    dataPublicacao: row.fecha,
    sourceUrl: 'https://www.argentina.gob.ar/cnv/normativa',
  }))
}
