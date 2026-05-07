import type { NewsItem, Topic } from '@/lib/types'
import { fetchWithCorsFallback } from './cors-fetch'

// HCDN — Cámara de Diputados de Argentina
// Portal CKAN: https://datos.hcdn.gob.ar
// API CKAN expone los datasets pero el endpoint de búsqueda directa
// suele tener CORS restringido. Vamos a un dataset CSV/JSON estable
// servido desde el portal con Access-Control-Allow-Origin: *.
//
// Resource ID conocido del dataset "proyectos legislativos":
// https://datos.hcdn.gob.ar/dataset/proyectos-de-ley

// Estrategia: tirar de la API CKAN search; si falla por CORS, lanzamos error
// y el agregador hace fallback.

type CkanSearchResp = {
  success: boolean
  result?: {
    records?: HcdnRecord[]
    total?: number
  }
}

type HcdnRecord = {
  _id?: number
  proyecto_id?: number
  expediente?: string
  numexp?: string
  proyecto_titulo?: string
  titulo?: string
  proyecto_fecha?: string
  fecha?: string
  texto?: string
  sumario?: string
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima/i.test(t)) return 'ambiente'
  if (/corredor|biocean|infraestructur|vial/i.test(t)) return 'corredores-bioceanicos'
  if (/mercosur|integraci|cooperaci/i.test(t)) return 'integracion-regional'
  if (/género|paridad|mujer/i.test(t)) return 'genero'
  if (/educac/i.test(t)) return 'educacion'
  if (/salud|sanitar/i.test(t)) return 'salud'
  if (/energ/i.test(t)) return 'energia'
  if (/río uruguay/i.test(t)) return 'rio-uruguay'
  if (/seguridad/i.test(t)) return 'seguridad'
  if (/comerci|fiscal|tribut/i.test(t)) return 'economia-regional'
  return 'integracion-regional'
}

export async function fetchHcdnArgentina(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 15
  // Resource ID público de proyectos legislativos en datos.hcdn.gob.ar
  // Nota: el ID puede cambiar; si falla, el agregador lo soportará graciosamente.
  const resource = '08c8ee72-1207-4e87-94dd-4a8c8ea98c7b'
  const url = `https://datos.hcdn.gob.ar/api/3/action/datastore_search?resource_id=${resource}&limit=${limit}`
  const res = await fetchWithCorsFallback(url, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`HCDN AR error: ${res.status}`)
  const json = (await res.json()) as CkanSearchResp
  const records = json.result?.records ?? []
  return records.map(r => mapRecord(r)).filter((x): x is NewsItem => x !== null)
}

function mapRecord(r: HcdnRecord): NewsItem | null {
  const titulo = (r.proyecto_titulo ?? r.titulo ?? '').trim()
  const sumario = (r.sumario ?? r.texto ?? '').trim()
  const text = titulo || sumario
  if (!text) return null
  const fecha = (r.proyecto_fecha ?? r.fecha ?? new Date().toISOString()).slice(0, 10)
  const expediente = r.expediente ?? r.numexp ?? `${r.proyecto_id ?? r._id}`
  return {
    id: 'ar-hcdn-' + (r.proyecto_id ?? r._id ?? expediente),
    title: titulo.length > 110 ? titulo.slice(0, 107) + '…' : titulo || `Expediente ${expediente}`,
    country: 'AR',
    topic: detectTopic(titulo + ' ' + sumario),
    type: 'ley',
    date: fecha,
    relevance: 'media',
    excerpt: sumario.length > 280 ? sumario.slice(0, 277) + '…' : sumario || titulo,
    source: 'HCDN — Cámara de Diputados de Argentina',
  }
}
