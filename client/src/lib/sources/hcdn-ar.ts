import type { NewsItem, Topic } from '@/lib/types'

// HCDN — Cámara de Diputados de Argentina
// Fuente original: dataset oficial 'leyes-sumario' de datos.hcdn.gob.ar
// (5418c27d-344f-48bd-b21b-8fe1c7ad7eec)
//
// Por restricciones CORS de los proxies públicos con payloads >1MB,
// servimos el JSON desde el mismo origin (public/data/leyes-ar.json,
// 1.3 MB ~1200 leyes nacionales). Esta data se puede regenerar
// periódicamente con:
//   curl -L "https://datos.hcdn.gob.ar/dataset/.../sumario.json" | \
//     python3 -c "..." > client/public/data/leyes-ar.json

type LeySumario = {
  ley?: string
  titulo?: string
  sumario?: string
  referencias?: string
}

function detectTopic(text: string): Topic {
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

function detectRelevance(titulo: string): 'alta' | 'media' | 'baja' {
  const t = (titulo || '').toLowerCase()
  if (/presupuesto|emergencia|reforma|deuda|c[oó]digo/i.test(t)) return 'alta'
  if (/declaraci[oó]n/i.test(t)) return 'baja'
  return 'media'
}

function basePath(): string {
  // Vite expone import.meta.env.BASE_URL; respeta el subpath en GitHub Pages
  // (ej: /app-upm/). En tests/SSR cae a '/'.
  try {
    return (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  } catch {
    return ''
  }
}

export async function fetchHcdnArgentina(opts?: { limit?: number; signal?: AbortSignal }): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 30
  const url = `${basePath()}/data/leyes-ar.json`
  const res = await fetch(url, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`HCDN AR (local) error: ${res.status}`)
  const data = (await res.json()) as LeySumario[]
  if (!Array.isArray(data)) return []
  return data.slice(0, limit).map(mapLey).filter((x): x is NewsItem => x !== null)
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
    topic: detectTopic(titulo + ' ' + sumario + ' ' + referencias),
    type: 'ley',
    date: today,
    relevance: detectRelevance(titulo + ' ' + sumario),
    excerpt: sumario.length > 600 ? sumario.slice(0, 597) + '…' : (sumario || titulo),
    source: leyNum
      ? `Ley Nacional ${leyNum} · Cámara de Diputados de Argentina`
      : 'HCDN · Argentina',
    fullText: sumario || titulo,
    tipoDocumento: leyNum ? `Ley ${leyNum}` : undefined,
    keywords: keywords.length > 0 ? keywords.slice(0, 16) : undefined,
    sourceUrl: leyNum ? `https://www.hcdn.gob.ar/proyectos/buscador2016-99.html?qBus=${leyNum}` : undefined,
  }
}
