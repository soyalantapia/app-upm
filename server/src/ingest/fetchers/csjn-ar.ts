import type { NewsItem, Topic } from '../../types.js'
import { loadStaticJson, truncateExcerpt } from '../util.js'

// Corte Suprema de Justicia de la Nación (AR) · 20 fallos emblemáticos curados.
// Mismo mapeo e ids que client/src/lib/sources/csjn-ar.ts.
type Row = {
  id: string
  title: string
  fecha: string
  sala: string
  ley?: string
  sumario: string
  url?: string
  tags?: string[]
}
type Data = { fuente: string; url: string; fetchedAt: string; items: Row[] }

function detectTopicCsjn(text: string): Topic {
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

export async function fetchCsjnAR(staticBase: string): Promise<NewsItem[]> {
  const data = await loadStaticJson<Data>('csjn-ar', staticBase)
  return data.items.map(row => {
    const tags = (row.tags ?? []).join(' ')
    return {
      id: row.id,
      title: row.title,
      country: 'AR' as const,
      topic: detectTopicCsjn(`${row.title} ${row.sumario} ${tags}`),
      type: 'informe' as const,
      date: row.fecha,
      relevance: 'alta' as const,
      excerpt: truncateExcerpt(row.sumario),
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
