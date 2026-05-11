import { useEffect, useState } from 'react'
import { fetchLiveFeed } from './sources'
import { buildCitationGraph, getBacklinks, extractLawNumberFromId, type Backlink, type CitationGraph } from './citations'

let cached: { graph: CitationGraph; itemsCount: number } | null = null
let buildPromise: Promise<CitationGraph> | null = null

export async function getOrBuildGraph(): Promise<CitationGraph> {
  if (cached && buildPromise === null) {
    const feed = await fetchLiveFeed({}).catch(() => null)
    if (feed && feed.items.length === cached.itemsCount) return cached.graph
    cached = null
  }
  if (buildPromise) return buildPromise
  buildPromise = (async () => {
    const feed = await fetchLiveFeed({})
    const graph = buildCitationGraph(feed.items)
    cached = { graph, itemsCount: feed.items.length }
    buildPromise = null
    return graph
  })()
  return buildPromise
}

// Hook: devuelve el grafo completo cuando está listo. Útil para Radar/Laws que
// necesitan calcular vigencia + clusters + smart card metrics en bulk.
export function useCitationGraph(): { graph: CitationGraph | null; loading: boolean } {
  const [graph, setGraph] = useState<CitationGraph | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let mounted = true
    getOrBuildGraph()
      .then(g => {
        if (mounted) {
          setGraph(g)
          setLoading(false)
        }
      })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])
  return { graph, loading }
}

// Devuelve cuántas normas citan el item dado (para badges en cards).
// Si el item no es una ley nacional, retorna 0.
export function getCitationCount(itemId: string, graph: CitationGraph | null): number {
  if (!graph) return 0
  const num = extractLawNumberFromId(itemId)
  if (!num) return 0
  return graph.backlinks.get(num)?.length ?? 0
}

export function useBacklinks(itemId: string | undefined): {
  backlinks: Backlink[]
  loading: boolean
} {
  const [backlinks, setBacklinks] = useState<Backlink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!itemId) {
      setBacklinks([])
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true)
    getOrBuildGraph()
      .then(graph => {
        if (!mounted) return
        setBacklinks(getBacklinks(itemId, graph))
        setLoading(false)
      })
      .catch(() => {
        if (mounted) {
          setBacklinks([])
          setLoading(false)
        }
      })
    return () => {
      mounted = false
    }
  }, [itemId])

  return { backlinks, loading }
}
