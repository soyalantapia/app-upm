import type { NewsItem, Topic } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// HCDN — Cámara de Diputados de Argentina
// Dataset oficial: bbf6cbcc-a4ee-4b6b-89bf-f23b847c25b7 (Expedientes Período 137)
// El JSON está en URL directa de descarga. CORS: cerrado, requiere proxy.

const URL_JSON =
  'https://datos.hcdn.gob.ar/dataset/bbf6cbcc-a4ee-4b6b-89bf-f23b847c25b7/resource/2c29c0b7-8456-4486-93ed-e909eb93b1c1/download/expedientes_137-1.1.json'

type HcdnExpediente = {
  expedienteDiputados?: string
  expedienteSenado?: string
  fechaPresentacion?: string
  fecha?: string
  tipoProyecto?: string
  numeroExpediente?: string
  titulo?: string
  sumario?: string
  texto?: string
  firmantes?: string
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|ecolog|residuo/i.test(t)) return 'ambiente'
  if (/corredor|biocean|infraestructur|vial|ferrovi/i.test(t)) return 'corredores-bioceanicos'
  if (/mercosur|integraci|cooperaci/i.test(t)) return 'integracion-regional'
  if (/género|paridad|mujer/i.test(t)) return 'genero'
  if (/educac/i.test(t)) return 'educacion'
  if (/salud|sanitar/i.test(t)) return 'salud'
  if (/energ/i.test(t)) return 'energia'
  if (/río uruguay/i.test(t)) return 'rio-uruguay'
  if (/seguridad|defensa/i.test(t)) return 'seguridad'
  if (/comerci|fiscal|tribut|impuesto|econ[oó]mic/i.test(t)) return 'economia-regional'
  return 'integracion-regional'
}

export async function fetchHcdnArgentina(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 20
  // El JSON oficial es grande (todo el período). Lo bajamos via proxy y nos quedamos con los más recientes.
  const res = await fetchWithCorsFallback(URL_JSON, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`HCDN AR error: ${res.status}`)
  const data = (await res.json()) as HcdnExpediente[]
  if (!Array.isArray(data)) return []
  // Ordenar por fecha desc y tomar los últimos N
  const sorted = [...data]
    .filter(r => (r.titulo || r.sumario))
    .sort((a, b) => (b.fechaPresentacion ?? b.fecha ?? '').localeCompare(a.fechaPresentacion ?? a.fecha ?? ''))
    .slice(0, limit)
  return sorted.map(r => mapRecord(r)).filter((x): x is NewsItem => x !== null)
}

function mapRecord(r: HcdnExpediente): NewsItem | null {
  const titulo = (r.titulo ?? '').trim()
  const sumario = (r.sumario ?? r.texto ?? '').trim()
  const text = titulo || sumario
  if (!text) return null
  const fecha = (r.fechaPresentacion ?? r.fecha ?? new Date().toISOString()).slice(0, 10)
  const expediente = r.numeroExpediente ?? r.expedienteDiputados ?? r.expedienteSenado ?? 'sin-id'
  const tipo = r.tipoProyecto ?? 'Proyecto'
  return {
    id: 'ar-hcdn-' + expediente,
    title: titulo.length > 110
      ? titulo.slice(0, 107) + '…'
      : titulo || `${tipo} ${expediente}`,
    country: 'AR',
    topic: detectTopic(titulo + ' ' + sumario),
    type: 'ley',
    date: fecha,
    relevance: 'media',
    excerpt: sumario.length > 280 ? sumario.slice(0, 277) + '…' : sumario || titulo,
    source: `HCDN — Cámara de Diputados de Argentina (${tipo})`,
  }
}
