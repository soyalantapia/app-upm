import type { NewsItem, Topic } from '@/lib/types'

// Cámara de Diputados AR · Expedientes históricos (períodos 129 a 137).
// Dataset CKAN datos.hcdn.gob.ar: 1,849 expedientes legislativos del
// Congreso Nacional desde 2002 hasta 2019, ya cargados en
// public/data/hcdn-exp.json.
//
// Útiles como fuente histórica para entender el contexto de proyectos
// recientes que se reactivan o reformulan.

type Expediente = {
  expediente?: string         // ej "1195-D-2019"
  numero?: string
  origen?: string             // "D" Diputados, "S" Senado, "PE" Poder Ejecutivo, "JGM" Jefatura
  anio?: string
  titulo?: string
}

const ORIGEN_LABEL: Record<string, string> = {
  D: 'Cámara de Diputados',
  S: 'Senado de la Nación',
  PE: 'Poder Ejecutivo',
  JGM: 'Jefatura de Gabinete',
  OV: 'Otros',
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|ecolog|residuo|hidrocarbur|biolog|forestal/i.test(t)) return 'ambiente'
  if (/corredor|biocean|infraestructur|vial|ferrovi|ruta|transport|portuari/i.test(t)) return 'corredores-bioceanicos'
  if (/río uruguay/i.test(t)) return 'rio-uruguay'
  if (/mercosur|integraci|cooperaci/i.test(t)) return 'integracion-regional'
  if (/género|paridad|mujer|violencia|trata/i.test(t)) return 'genero'
  if (/educac|escolar|universidad|enseñan/i.test(t)) return 'educacion'
  if (/salud|sanitar|hospital|prevenc|patolog|farmac/i.test(t)) return 'salud'
  if (/energ|eléctric|combust|petró|gas natural|nuclear/i.test(t)) return 'energia'
  if (/seguridad|defensa|fronteri|polic|narcot/i.test(t)) return 'seguridad'
  if (/comerci|fiscal|tribut|impuesto|deuda|presupuest|aduan|inversi|economi/i.test(t)) return 'economia-regional'
  if (/relaciones exteriores|tratado|internacional|diplomát|embajad/i.test(t)) return 'rrii'
  return 'integracion-regional'
}

function detectRelevance(titulo: string): 'alta' | 'media' | 'baja' {
  const t = (titulo || '').toLowerCase()
  if (/presupuesto|emergenc|reforma|deuda|c[oó]digo|emergencia/i.test(t)) return 'alta'
  if (/declar[aá]ci[oó]n|homenaje|conmemora/i.test(t)) return 'baja'
  return 'media'
}

function basePath(): string {
  try {
    return (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  } catch {
    return ''
  }
}

export async function fetchExpedientesHCDN(opts?: {
  limit?: number
  signal?: AbortSignal
}): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 80
  const url = `${basePath()}/data/hcdn-exp.json`
  const res = await fetch(url, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`HCDN expedientes (local) error: ${res.status}`)
  const data = (await res.json()) as Expediente[]
  if (!Array.isArray(data)) return []
  // Ya viene ordenado por año desc; tomamos los primeros
  return data.slice(0, limit).map(mapExpediente).filter((x): x is NewsItem => x !== null)
}

function mapExpediente(r: Expediente): NewsItem | null {
  const exp = (r.expediente ?? '').trim()
  const titulo = (r.titulo ?? '').trim()
  if (!exp || !titulo) return null
  const anio = (r.anio ?? '').trim()
  const origen = (r.origen ?? '').trim()
  const origenLabel = ORIGEN_LABEL[origen] ?? origen ?? 'Congreso'
  // Sin fecha exacta, usamos enero del año declarado
  const fecha = anio ? `${anio}-01-01` : new Date().toISOString().slice(0, 10)
  const titleClean = titulo.length > 110 ? titulo.slice(0, 107) + '…' : titulo

  return {
    id: `ar-exp-${exp.replace(/[^a-zA-Z0-9]/g, '-')}`,
    title: `Expediente ${exp} · ${titleClean}`,
    country: 'AR',
    topic: detectTopic(titulo),
    type: 'comunicado',
    date: fecha,
    relevance: detectRelevance(titulo),
    excerpt: titulo.length > 600 ? titulo.slice(0, 597) + '…' : titulo,
    source: `Cámara de Diputados AR · Expediente · ${origenLabel}`,
    fullText: titulo,
    status: `Expediente ${exp}`,
    tipoDocumento: `Expediente ${exp}`,
    tipoConteudo: origenLabel,
    dataPublicacao: fecha,
    keywords: [origenLabel, anio].filter(Boolean),
  }
}
