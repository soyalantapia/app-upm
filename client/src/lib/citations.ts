// Grafo invertido de citaciones legales.
//
// Pre-condición: ya tenemos el regex de extracción de leyes citadas en cada item
// (ver extract-context.ts). Este módulo invierte el grafo: dado un número de ley,
// devuelve TODAS las normas del corpus que la mencionan.
//
// Killer feature: abrir Ley 24.076 (Gas) y ver al instante "47 normas la citan",
// con desglose por país y por tipo. Nadie tiene esto · ni Infoleg, ni Cámara BR,
// ni IMPO. Es el grafo regulatorio del Mercosur reconstruido desde el texto.

import type { CountryCode, NewsItem } from './types'

// Mismo regex que extract-context · captura "Ley 27.541", "Ley N° 24076",
// "Leyes\nN.° 24.076 y N.° 27.742", "Lei nº 14.300", etc.
const LEY_RE = /Ley(?:es)?\s*[\s\n]*(?:N[°º\.\s]*)?(\d{1,2}[\.\s]?\d{3,4})/gi
const LEI_RE = /Lei(?:s)?\s*(?:n[º°\.]?\s*)?(\d{1,2}[\.\s]?\d{3,4})/gi

export type Backlink = {
  item: NewsItem
  // Cantidad de menciones (algunas normas citan la ley varias veces)
  occurrences: number
}

export type CitationGraph = {
  // leyNumero (sin puntos) → lista de items que la citan (ordenada por # ocurrencias)
  backlinks: Map<string, Backlink[]>
  builtAt: number
}

function extractLawCitations(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  if (!text) return counts
  const collect = (re: RegExp) => {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const num = m[1].replace(/[\.\s]/g, '')
      if (num.length < 4 || num.length > 5) continue
      counts.set(num, (counts.get(num) ?? 0) + 1)
    }
  }
  collect(LEY_RE)
  collect(LEI_RE)
  return counts
}

// Construye el grafo invertido. Se ejecuta una vez por sesión (cache módulo-level
// en use-citations.ts). Costo ~80ms para 1601 items.
export function buildCitationGraph(items: NewsItem[]): CitationGraph {
  const t0 = performance.now()
  const backlinks = new Map<string, Backlink[]>()

  for (const item of items) {
    const text = `${item.title ?? ''}\n${item.fullText ?? item.excerpt ?? ''}`
    const cites = extractLawCitations(text)
    for (const [num, count] of cites) {
      // Filtrar autoreferencia: si el item mismo es la ley citada, ignorar.
      if (item.id === `ar-ley-${num}` || item.id === `uy-ley-${num}`) continue
      if (!backlinks.has(num)) backlinks.set(num, [])
      backlinks.get(num)!.push({ item, occurrences: count })
    }
  }

  // Ordenar cada lista por # ocurrencias desc, luego por fecha desc
  for (const list of backlinks.values()) {
    list.sort((a, b) => {
      if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences
      return (b.item.date ?? '').localeCompare(a.item.date ?? '')
    })
  }

  if (typeof window !== 'undefined' && window.console) {
    const ms = (performance.now() - t0).toFixed(0)
    console.log(
      `[citations] graph built in ${ms}ms · ${backlinks.size} leyes citadas, ` +
      `${Array.from(backlinks.values()).reduce((s, l) => s + l.length, 0)} backlinks totales`,
    )
  }

  return { backlinks, builtAt: Date.now() }
}

// Extrae el número de ley del id del item (si es una ley nacional)
export function extractLawNumberFromId(id: string): string | null {
  const m = id.match(/^(?:ar|uy)-ley-(\d{4,5})$/)
  return m ? m[1] : null
}

export function getBacklinks(itemId: string, graph: CitationGraph): Backlink[] {
  const num = extractLawNumberFromId(itemId)
  if (!num) return []
  return graph.backlinks.get(num) ?? []
}

// Estadísticas del grafo · útil para mostrar en el Home como "potencia del corpus"
export function getCitationStats(graph: CitationGraph): {
  leyesCitadas: number
  totalBacklinks: number
  topLeyes: { numero: string; count: number }[]
} {
  const top: { numero: string; count: number }[] = []
  let total = 0
  for (const [num, list] of graph.backlinks) {
    top.push({ numero: num, count: list.length })
    total += list.length
  }
  top.sort((a, b) => b.count - a.count)
  return {
    leyesCitadas: graph.backlinks.size,
    totalBacklinks: total,
    topLeyes: top.slice(0, 10),
  }
}

// Distribución por país de los backlinks · útil para el panel
export function backlinksByCountry(backlinks: Backlink[]): Map<CountryCode, number> {
  const m = new Map<CountryCode, number>()
  for (const b of backlinks) {
    m.set(b.item.country, (m.get(b.item.country) ?? 0) + 1)
  }
  return m
}
