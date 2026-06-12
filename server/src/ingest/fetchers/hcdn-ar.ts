import type { NewsItem, Topic } from '../../types.js'
import { detectTopic } from '../topic.js'
import { fetchJson, loadStaticJson, truncateExcerpt } from '../util.js'

// ─────────────────────────────────────────────────────────────────────────────
// 1) fetchHcdnAR — portado del worker (hcdnAR), CKAN datos.hcdn.gob.ar.
//    El resource_id puede rotar; si falla queda registrado por-fuente sin
//    tirar el run. (Se preserva intacto: registry.ts lo importa.)
// ─────────────────────────────────────────────────────────────────────────────
type HcdnRecord = {
  _id?: number
  proyecto_id?: string
  proyecto_titulo?: string
  titulo?: string
  sumario?: string
  texto?: string
  proyecto_fecha?: string
  fecha?: string
}

export async function fetchHcdnAR(): Promise<NewsItem[]> {
  const j = await fetchJson<{ result?: { records?: HcdnRecord[] } }>(
    'https://datos.hcdn.gob.ar/api/3/action/datastore_search?resource_id=08c8ee72-1207-4e87-94dd-4a8c8ea98c7b&limit=15',
  )
  const records = j.result?.records ?? []
  return records.map((rec, i) => ({
    id: 'ar-hcdn-' + (rec.proyecto_id ?? rec._id ?? i),
    title: ((rec.proyecto_titulo ?? rec.titulo ?? '').slice(0, 110)) || `Proyecto AR ${rec._id}`,
    country: 'AR' as const,
    topic: detectTopic((rec.proyecto_titulo ?? '') + ' ' + (rec.sumario ?? '')),
    type: 'ley' as const,
    date: (rec.proyecto_fecha ?? rec.fecha ?? new Date().toISOString()).slice(0, 10),
    relevance: 'media' as const,
    excerpt: truncateExcerpt((rec.sumario ?? rec.texto ?? '') as string, 280),
    source: 'HCDN — Cámara de Diputados de Argentina',
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) fetchHcdnArgentina — portado de client/src/lib/sources/hcdn-ar.ts.
//    HCDN · Cámara de Diputados de Argentina, dataset oficial 'leyes-sumario'
//    de datos.hcdn.gob.ar servido como JSON estático curado
//    (client/public/data/leyes-ar.json, ~1200 leyes nacionales).
//    Mismo mapeo e ids (ar-ley-<num>) que el cliente para que el dedupe del
//    front colapse server/cliente en uno. detectTopic/detectRelevance locales
//    copiados verbatim del archivo cliente (no usa el detectTopic compartido).
// ─────────────────────────────────────────────────────────────────────────────
type LeySumario = {
  ley?: string
  titulo?: string
  sumario?: string
  referencias?: string
}

function detectTopicLey(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sustent|clima|ecolog|residuo|hidrocarbur/i.test(t)) return 'ambiente'
  if (/corredor|biocean|infraestructur|vial|ferrovi|ruta nacional/i.test(t)) return 'corredores-bioceanicos'
  if (/mercosur|integraci|cooperaci/i.test(t)) return 'integracion-regional'
  if (/género|paridad|mujer|violencia/i.test(t)) return 'genero'
  if (/educac|escolar|universidad/i.test(t)) return 'educacion'
  if (/salud|sanitar|hospital|prevenc|patolog/i.test(t)) return 'salud'
  if (/energ|eléctric|combust|petró/i.test(t)) return 'energia'
  if (/río uruguay/i.test(t)) return 'rio-uruguay'
  if (/seguridad|defensa|fronteri|polic/i.test(t)) return 'seguridad'
  if (/comerci|fiscal|tribut|impuesto|econ[oó]mic|deuda|presupuest/i.test(t)) return 'economia-regional'
  if (/relaciones exteriores|tratado|internacional|diplomát/i.test(t)) return 'rrii'
  return 'integracion-regional'
}

function detectRelevanceLey(titulo: string): 'alta' | 'media' | 'baja' {
  const t = (titulo || '').toLowerCase()
  if (/presupuesto|emergencia|reforma|deuda|c[oó]digo/i.test(t)) return 'alta'
  if (/declaraci[oó]n/i.test(t)) return 'baja'
  return 'media'
}

// Límite de la última entrada 'hcdn-ar' del FETCHERS del cliente ({ limit: 200 }).
const LEYES_AR_LIMIT = 200

export async function fetchHcdnArgentina(staticBase: string): Promise<NewsItem[]> {
  const data = await loadStaticJson<LeySumario[]>('leyes-ar', staticBase)
  if (!Array.isArray(data)) return []
  return data.slice(0, LEYES_AR_LIMIT).map(mapLey).filter((x): x is NewsItem => x !== null)
}

function mapLey(r: LeySumario): NewsItem | null {
  const leyNum = r.ley
  const titulo = (r.titulo ?? '').trim()
  const sumario = (r.sumario ?? '').trim().replace(/^"|"$/g, '')
  const referencias = (r.referencias ?? '').trim()
  if (!titulo && !sumario) return null
  // Fecha: las leyes argentinas en este dataset no incluyen fecha estructurada,
  // usamos la fecha del feed (snapshot)
  const today = new Date().toISOString().slice(0, 10)
  const keywords = referencias
    .split(/\s{2,}|·/)
    .map(k => k.trim())
    .filter(k => k.length > 2 && k.length < 40)
  return {
    id: 'ar-ley-' + (leyNum ?? Math.random().toString(36).slice(2, 10)),
    title: leyNum
      ? `Ley ${leyNum} · ${titulo.length > 80 ? titulo.slice(0, 77) + '…' : titulo}`
      : titulo,
    country: 'AR',
    topic: detectTopicLey(titulo + ' ' + sumario + ' ' + referencias),
    type: 'ley',
    date: today,
    relevance: detectRelevanceLey(titulo + ' ' + sumario),
    excerpt: truncateExcerpt(sumario || titulo),
    source: leyNum
      ? `Ley Nacional ${leyNum} · Cámara de Diputados de Argentina`
      : 'HCDN · Argentina',
    fullText: sumario || titulo,
    tipoDocumento: leyNum ? `Ley ${leyNum}` : undefined,
    keywords: keywords.length > 0 ? keywords.slice(0, 16) : undefined,
    // Portal oficial del Gobierno argentino: búsqueda paramétrica por número de ley.
    // El antiguo buscador HCDN (buscador2016-99.html) está fuera de servicio (404).
    sourceUrl: leyNum
      ? `https://www.argentina.gob.ar/normativa?jurisdiccion=Nacional&numero-norma=${leyNum}&tipo-norma=Ley`
      : undefined,
  }
}
