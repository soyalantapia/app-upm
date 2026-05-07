import type { NewsItem, Relevance, Topic } from '@/lib/types'

// Datos abiertos del gobierno colombiano (plataforma Socrata).
// Hay datasets de proyectos de ley, normograma, decretos. URL ejemplo abajo.
// Docs: https://dev.socrata.com/foundry/www.datos.gov.co
//
// Dataset elegido: "Proyectos de Ley - Senado de Colombia"
// (Este dataset puede cambiar; tomamos uno público de proyectos legislativos)
//
// Si la URL no responde, el agregador hará fallback a mock automáticamente.

const ENDPOINT = 'https://www.datos.gov.co/resource/yhfm-pnf2.json'

type SocrataRow = {
  numero?: string
  numero_proyecto?: string
  ano?: string
  fecha?: string
  fecha_radicacion?: string
  titulo?: string
  asunto?: string
  estado?: string
  autor?: string
}

function detectTopic(text: string): Topic {
  const t = (text || '').toLowerCase()
  if (/ambient|sosteni|clima|polución|conservac/i.test(t)) return 'ambiente'
  if (/integra|mercosur|cooperación|regional/i.test(t)) return 'integracion-regional'
  if (/género|paridad|mujer|equidad/i.test(t)) return 'genero'
  if (/salud|sanitar|hospital/i.test(t)) return 'salud'
  if (/educa/i.test(t)) return 'educacion'
  if (/energ/i.test(t)) return 'energia'
  if (/segur|público|fronter/i.test(t)) return 'seguridad'
  if (/comercio|tribut|fiscal|aduan|impuesto/i.test(t)) return 'economia-regional'
  return 'integracion-regional'
}

function detectRelevance(estado: string | undefined): Relevance {
  const e = (estado || '').toLowerCase()
  if (/sancion|aprobad|ley/i.test(e)) return 'alta'
  if (/segundo|comisión|tercer/i.test(e)) return 'media'
  return 'baja'
}

function pad(date: string | undefined): string {
  if (!date) return new Date().toISOString().slice(0, 10)
  // Socrata fechas vienen como "2025-04-15T00:00:00.000"
  return date.slice(0, 10)
}

export async function fetchProyectosColombia(opts?: {
  limit?: number
  signal?: AbortSignal
}): Promise<NewsItem[]> {
  const limit = opts?.limit ?? 20
  const params = new URLSearchParams({
    $limit: String(limit),
    $order: 'fecha_radicacion DESC',
  })
  const url = `${ENDPOINT}?${params.toString()}`
  const res = await fetch(url, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Socrata CO API error: ${res.status}`)
  const rows = (await res.json()) as SocrataRow[]

  return rows.map((r, i) => {
    const titulo = (r.titulo ?? r.asunto ?? `Proyecto ${r.numero_proyecto ?? r.numero ?? ''}`).trim()
    const ementa = (r.asunto ?? r.titulo ?? '').trim()
    return {
      id: 'co-senado-' + (r.numero_proyecto ?? r.numero ?? i),
      title: titulo.length > 100 ? titulo.slice(0, 97) + '…' : titulo,
      country: 'CO',
      topic: detectTopic(titulo + ' ' + ementa),
      type: 'ley',
      date: pad(r.fecha_radicacion ?? r.fecha),
      relevance: detectRelevance(r.estado),
      excerpt: ementa.length > 280 ? ementa.slice(0, 277) + '…' : (ementa || titulo),
      source: 'Senado de Colombia · datos.gov.co',
    }
  })
}
