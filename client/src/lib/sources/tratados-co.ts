import type { NewsItem, Topic } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// Tratados internacionales suscritos por Colombia (Cancillería).
// Dataset Socrata 'fdir-hk5z': 1261 tratados con fecha, lugar, tema,
// vigencia y ley aprobatoria.
// CORS: ✅ datos.gov.co abre Access-Control-Allow-Origin: *

const ENDPOINT = 'https://www.datos.gov.co/resource/fdir-hk5z.json'

type TratadoRow = {
  nombretratado?: string
  bilateral?: string                // "SI" / "NO"
  lugaradopcion?: string
  fechaadopcion?: string             // "DD/MM/YYYY"
  estadosorganismos?: string         // "BRASIL *" o "BRASIL * MEXICO * ..."
  temas?: string                     // "COOPERACIÓN INTERNACIONAL *"
  naturalezatratado?: string         // "ACUERDO PROCEDIMIENTO SIMPLIFICADO"
  depositario?: string
  suscribioporcolombia?: string
  vigente?: string                   // "SI" / "NO"
  fechaleyaprobatoria?: string
  numeroleyaprobatoria?: string
  decretofechadiariooficial?: string
  decretonumerodiariooficial?: string
}

function detectTopic(temas: string, nombre: string): Topic {
  const t = (temas + ' ' + nombre).toLowerCase()
  if (/transporte|navegaci|aérea|tránsito|biocean|infraestruc|corredor/i.test(t)) return 'corredores-bioceanicos'
  if (/ambient|natural|biolog|cambio clim|fauna|sostenib/i.test(t)) return 'ambiente'
  if (/educa|cultura|patrimonio|científ/i.test(t)) return 'educacion'
  if (/salud|sanitar|epidemiol|farmacéuti/i.test(t)) return 'salud'
  if (/energ|nuclear|hidrocarb|petról|eléctric/i.test(t)) return 'energia'
  if (/comercio|tribut|aduan|inversión|económic|libre comerc/i.test(t)) return 'economia-regional'
  if (/género|mujer|trata de personas/i.test(t)) return 'genero'
  if (/seguridad|defens|tráfico|drogas|narcót|fronter|crimen|ciberse|migraci/i.test(t)) return 'seguridad'
  if (/cooperaci|integra|amistad|complementac/i.test(t)) return 'integracion-regional'
  return 'rrii'
}

function detectRelevance(naturaleza: string | undefined, vigente: string | undefined): 'alta' | 'media' | 'baja' {
  const n = (naturaleza ?? '').toLowerCase()
  if (vigente === 'NO') return 'baja'
  if (/multilater|convenci.*naciones unidas|tratado constitutivo/i.test(n)) return 'alta'
  if (/convenio|tratado/i.test(n)) return 'media'
  return 'baja'
}

// Convierte "DD/MM/YYYY" → "YYYY-MM-DD". Si no parsea, devuelve string vacía.
function parseDate(d?: string): string {
  if (!d) return ''
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!m) return ''
  const [, dd, mm, yy] = m
  const year = yy.length === 2 ? '20' + yy : yy
  return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

// Limpia campos del tipo "BRASIL *  MEXICO *  ..." → "BRASIL, MEXICO, ..."
function cleanList(s?: string): string {
  if (!s) return ''
  return s
    .split('*')
    .map(p => p.trim())
    .filter(p => p.length > 0 && p !== '(NO REGISTRA)')
    .join(', ')
}

export async function fetchTratadosColombia(opts?: {
  limit?: number
  signal?: AbortSignal
}): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 25
  // Solo tratados vigentes con fecha registrada. Ordenamos por created_at del row
  // (la fecha de adopción viene en string DD/MM/YYYY y Socrata no la indexa como date).
  const params = new URLSearchParams({
    $limit: String(limit),
    $where: "vigente = 'SI' AND nombretratado IS NOT NULL AND fechaadopcion IS NOT NULL",
    $order: ':created_at DESC',
  })
  const res = await fetchWithCorsFallback(`${ENDPOINT}?${params.toString()}`, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Cancillería CO API error: ${res.status}`)
  const data = (await res.json()) as TratadoRow[]
  if (!Array.isArray(data)) return []
  return data.map((row, idx) => mapTratado(row, idx)).filter((x): x is NewsItem => x !== null)
}

function mapTratado(r: TratadoRow, idx: number): NewsItem | null {
  const nombre = (r.nombretratado ?? '').trim()
  if (!nombre) return null
  const fecha = parseDate(r.fechaadopcion) || new Date().toISOString().slice(0, 10)
  const estados = cleanList(r.estadosorganismos)
  const temas = cleanList(r.temas)
  const bilateral = r.bilateral === 'SI'
  const lugar = (r.lugaradopcion ?? '').trim()
  const naturaleza = (r.naturalezatratado ?? '').trim()
  const numLey = (r.numeroleyaprobatoria ?? '').trim()
  const noRegistraLey = numLey === '(NO REGISTRA)' || numLey === ''
  // ID estable: fecha + slug del título cortado
  const slug = nombre
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const id = `co-tratado-${fecha}-${slug || idx}`
  const titleClean = nombre.length > 110 ? nombre.slice(0, 107) + '…' : nombre
  // Excerpt: tipo de tratado + países + lugar + tema
  const excerptParts: string[] = []
  if (naturaleza) excerptParts.push(naturaleza)
  excerptParts.push(`${bilateral ? 'Bilateral' : 'Multilateral'} con ${estados || '—'}`)
  if (lugar) excerptParts.push(`Adoptado en ${lugar}`)
  if (temas) excerptParts.push(`Tema: ${temas}`)
  if (!noRegistraLey) excerptParts.push(`Aprobado por Ley ${numLey}`)
  const excerpt = excerptParts.join('. ') + '.'
  return {
    id,
    title: `Tratado · ${titleClean}`,
    country: 'CO',
    topic: detectTopic(temas, nombre),
    type: 'convenio',
    date: fecha,
    relevance: detectRelevance(naturaleza, r.vigente),
    excerpt: excerpt.length > 600 ? excerpt.slice(0, 597) + '…' : excerpt,
    source: `Cancillería de Colombia · Tratados Internacionales · ${naturaleza || 'Tratado'}`,
    fullText: nombre,
    authors: r.suscribioporcolombia && r.suscribioporcolombia !== 'ILEGIBLE' && r.suscribioporcolombia !== '(NO REGISTRA)'
      ? r.suscribioporcolombia
      : undefined,
    status: r.vigente === 'SI' ? 'Vigente' : 'No vigente',
    tipoDocumento: naturaleza || 'Tratado',
    keywords: [
      ...(temas ? temas.split(',').map(s => s.trim()).filter(Boolean) : []),
      ...(estados ? estados.split(',').map(s => s.trim()).filter(Boolean).slice(0, 6) : []),
    ].slice(0, 10),
    dataPublicacao: fecha,
  }
}
