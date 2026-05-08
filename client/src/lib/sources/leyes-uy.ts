import type { NewsItem, Topic } from '@/lib/types'

// Leyes promulgadas del Poder Ejecutivo de Uruguay.
// Fuente original: parlamento.gub.uy/transparencia/datos-abiertos/leyes-promulgadas/json
// (4753 leyes con fecha, número, título, link al texto original y al texto actualizado).
//
// Sin CORS abierto + payload 2.2 MB (los proxies no toleran ese tamaño).
// Solución: descargar una vez y servir embebido desde public/data/leyes-uy.json.
//
// Para regenerar:
//   curl -L "https://parlamento.gub.uy/transparencia/datos-abiertos/leyes-promulgadas/json" \
//     -o client/public/data/leyes-uy.json

type LeyUY = {
  Fecha?: string                       // "YYYY-MM-DD"
  Numero_de_Ley?: string               // "20485"
  Texto_Original?: string              // URL a parlamento.gub.uy
  Texto_Actualizado?: string           // URL a IMPO (texto consolidado vigente)
  Titulo?: string                      // sumario / título
  Asunto?: string                      // HTML con link a la ficha
  Leyes_Referenciadas?: string         // contador
  Leyes_que_referencia?: string        // contador
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|residuo|forestal|hídric|conservaci/i.test(t)) return 'ambiente'
  if (/río uruguay|cuenca del plata/i.test(t)) return 'rio-uruguay'
  if (/mercosur|integraci|cooperaci/i.test(t)) return 'integracion-regional'
  if (/corredor|infraestructur|biocean|carret|ferrov|portuari/i.test(t)) return 'corredores-bioceanicos'
  if (/género|paridad|mujer|trata|violencia/i.test(t)) return 'genero'
  if (/educa|escolar|universidad|enseñan/i.test(t)) return 'educacion'
  if (/salud|sanitar|hospital|epidem|farmac|psicotr/i.test(t)) return 'salud'
  if (/energ|eléctric|petró|combust|renovab/i.test(t)) return 'energia'
  if (/segurid|defens|fronter|polic|narcotr|cárcel|criminal/i.test(t)) return 'seguridad'
  if (/comerci|tribut|fiscal|impuesto|presupuest|deuda|inversión|crédito/i.test(t)) return 'economia-regional'
  if (/relaciones exteriores|tratado|internacional|diplomát|embajad/i.test(t)) return 'rrii'
  return 'integracion-regional'
}

function detectRelevance(titulo: string): 'alta' | 'media' | 'baja' {
  const t = (titulo || '').toLowerCase()
  if (/presupuesto|emergencia|reforma|deuda|c[oó]digo|rendici[oó]n de cuentas/i.test(t)) return 'alta'
  if (/declaraci[oó]n|homenaje|conmemora|ferriad|fiesta|monumento/i.test(t)) return 'baja'
  return 'media'
}

function basePath(): string {
  try {
    return (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  } catch {
    return ''
  }
}

// Parsea HTML del campo Asunto para extraer la URL a la ficha.
function parseAsuntoUrl(html?: string): string {
  if (!html) return ''
  const m = html.match(/href=["']([^"']+)["']/)
  return m?.[1].replace(/^http:/, 'https:') ?? ''
}

export async function fetchLeyesUruguay(opts?: {
  limit?: number
  signal?: AbortSignal
}): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 80
  const url = `${basePath()}/data/leyes-uy.json`
  const res = await fetch(url, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Leyes UY (local) error: ${res.status}`)
  const data = (await res.json()) as LeyUY[]
  if (!Array.isArray(data)) return []
  // Ordenar por fecha desc (las más nuevas primero)
  const sorted = data
    .filter(l => l.Numero_de_Ley && l.Titulo)
    .sort((a, b) => (b.Fecha ?? '').localeCompare(a.Fecha ?? ''))
  return sorted.slice(0, limit).map(mapLey).filter((x): x is NewsItem => x !== null)
}

function mapLey(r: LeyUY): NewsItem | null {
  const numero = (r.Numero_de_Ley ?? '').trim()
  const titulo = (r.Titulo ?? '').trim().replace(/\s+/g, ' ')
  if (!numero || !titulo) return null
  const fecha = (r.Fecha ?? new Date().toISOString().slice(0, 10)).slice(0, 10)
  const fichaUrl = parseAsuntoUrl(r.Asunto)
  // Preferir texto actualizado (IMPO consolidado) sobre el original
  const textoUrl = (r.Texto_Actualizado ?? r.Texto_Original ?? '').replace(/^http:/, 'https:')
  const titleClean = titulo.length > 110 ? titulo.slice(0, 107) + '…' : titulo

  return {
    id: `uy-ley-${numero}`,
    title: `Ley ${numero} · ${titleClean}`,
    country: 'UY',
    topic: detectTopic(titulo),
    type: 'ley',
    date: fecha,
    relevance: detectRelevance(titulo),
    excerpt: titulo.length > 600 ? titulo.slice(0, 597) + '…' : titulo,
    source: `Ley ${numero} de Uruguay · Parlamento del Uruguay (Asamblea General)`,
    fullText: titulo,
    status: 'Promulgada',
    tipoDocumento: `Ley ${numero}`,
    sourceUrl: textoUrl || fichaUrl || undefined,
    pdfUrl: textoUrl || undefined,
    dataPublicacao: fecha,
  }
}
