// Detección de normas trending · trending = recibieron muchas citaciones de
// normas recientes (últimos 30 días).
// También detectamos temas en alza por concentración de actividad.

import type { NewsItem, Topic } from './types'
import type { CitationGraph } from './citations'

export type TrendingLaw = {
  numero: string                  // número de ley, ej "27541"
  law: NewsItem | null            // la ley raíz si la tenemos en el corpus
  citasRecientes: number          // backlinks en últimos 30d
  citasTotal: number
  recencyScore: number            // citasRecientes / citasTotal
  topCitantes: NewsItem[]         // hasta 3 ejemplos
}

export type TrendingTopic = {
  topic: Topic
  countRecent: number
  countTotal: number
  growth: number                  // recent / (total * windowFraction baseline)
}

// Devuelve top K leyes que recibieron citaciones recientes
export function computeTrendingLaws(graph: CitationGraph, items: NewsItem[], topK = 10, days = 30): TrendingLaw[] {
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000
  const result: TrendingLaw[] = []

  for (const [numero, backlinks] of graph.backlinks) {
    const recientes = backlinks.filter(b => {
      const d = new Date(b.item.date ?? '').getTime()
      return !Number.isNaN(d) && d >= threshold
    })
    if (recientes.length === 0) continue
    const total = backlinks.length
    const law = items.find(i => i.id === `ar-ley-${numero}` || i.id === `uy-ley-${numero}` || i.id === `ar-ley-infoleg-${numero}`) ?? null
    result.push({
      numero,
      law,
      citasRecientes: recientes.length,
      citasTotal: total,
      recencyScore: recientes.length / Math.max(total, 1),
      topCitantes: recientes
        .map(r => r.item)
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
        .slice(0, 3),
    })
  }

  // Ordenar por mezcla: citas recientes peso 2x, recency score peso 1x.
  result.sort((a, b) => {
    const aScore = a.citasRecientes * 2 + a.recencyScore * 10
    const bScore = b.citasRecientes * 2 + b.recencyScore * 10
    return bScore - aScore
  })

  return result.slice(0, topK)
}

// Top temas con más actividad en una ventana reciente
export function computeTrendingTopics(items: NewsItem[], topK = 6, days = 30): TrendingTopic[] {
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000
  const recent = new Map<Topic, number>()
  const total = new Map<Topic, number>()
  for (const item of items) {
    const t = item.topic
    total.set(t, (total.get(t) ?? 0) + 1)
    const d = new Date(item.date ?? '').getTime()
    if (!Number.isNaN(d) && d >= threshold) {
      recent.set(t, (recent.get(t) ?? 0) + 1)
    }
  }
  // Baseline: fracción del corpus que cae en la ventana reciente
  const recentTotalCount = Array.from(recent.values()).reduce((s, n) => s + n, 0)
  const totalCount = items.length
  const baselineRatio = totalCount > 0 ? recentTotalCount / totalCount : 0

  const out: TrendingTopic[] = []
  for (const [topic, countRec] of recent) {
    const countTot = total.get(topic) ?? countRec
    const expected = countTot * baselineRatio
    const growth = expected > 0 ? countRec / expected : 1
    out.push({ topic, countRecent: countRec, countTotal: countTot, growth })
  }
  out.sort((a, b) => b.growth - a.growth || b.countRecent - a.countRecent)
  return out.slice(0, topK)
}
