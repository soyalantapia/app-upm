import type { NewsItem, Relevance, Topic } from '../../types.js'
import { loadStaticJson, truncateExcerpt } from '../util.js'

// IMPO Uruguay · decretos del Poder Ejecutivo vigentes.
// Dataset estático curado (client/public/data/impo-uy.json) con 15 decretos
// recientes que reglamentan leyes uruguayas o establecen políticas sectoriales.
// Mismo mapeo que client/src/lib/sources/impo-uy.ts → ids idénticos
// para que el dedupe del front colapse server/cliente en uno.

type ImpoRow = {
  id: string
  tipoDocumento: string
  title: string
  fecha: string
  ministerio: string
  tipo: string
  ementa: string
}

type ImpoData = {
  fuente: string
  url: string
  fetchedAt: string
  items: ImpoRow[]
}

function detectTopic(text: string): Topic {
  const t = text.toLowerCase()
  if (/ambient|bosque|residuo|sustent|biolog|costero|cambio clim/i.test(t)) return 'ambiente'
  if (/jubila|previsi[óo]n|cuidad|movilidad/i.test(t)) return 'salud'
  if (/educac|escolar|ense[ñn]/i.test(t)) return 'educacion'
  if (/salud|sanitar|hospital|medic/i.test(t)) return 'salud'
  if (/energ|hidr[óo]geno|el[ée]ctric|petr[óo]l|tarifa|UTE/i.test(t)) return 'energia'
  if (/genero|mujer|paridad|micaela|violencia/i.test(t)) return 'genero'
  if (/internacional|tratado|exterior|mercosur|frontera|aduana/i.test(t)) return 'rrii'
  if (/seguridad|defens|polic|justici/i.test(t)) return 'seguridad'
  if (/comerc|tribut|fiscal|industria|trabajo|PYME|turismo/i.test(t)) return 'economia-regional'
  if (/transport|infraestruct|ferrov|nav|pesca/i.test(t)) return 'corredores-bioceanicos'
  return 'integracion-regional'
}

function detectRelevance(ministerio: string, title: string): Relevance {
  const t = (ministerio + ' ' + title).toLowerCase()
  if (/transici[óo]n energ[ée]tica|sistema nacional integrado|reform/i.test(t)) return 'alta'
  if (/reglamentaci[óo]n|implementaci[óo]n/i.test(t)) return 'media'
  return 'media'
}

export async function fetchImpoUY(staticBase: string, opts?: { limit?: number }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 30
  const data = await loadStaticJson<ImpoData>('impo-uy', staticBase)
  return data.items.slice(0, limit).map(row => ({
    id: row.id,
    title: row.title,
    country: 'UY' as const,
    topic: detectTopic(row.title + ' ' + row.ementa),
    type: 'decreto' as const,
    date: row.fecha,
    relevance: detectRelevance(row.ministerio, row.title),
    excerpt: truncateExcerpt(row.ementa),
    source: `IMPO Uruguay · ${row.ministerio}`,
    fullText: row.ementa,
    tipoDocumento: row.tipoDocumento,
    tipoConteudo: 'Decreto del Poder Ejecutivo',
    authors: row.ministerio,
    status: 'Vigente',
    dataPublicacao: row.fecha,
    sourceUrl: 'https://www.impo.com.uy',
  }))
}
