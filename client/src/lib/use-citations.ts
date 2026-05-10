import { useEffect, useState } from 'react'
import { fetchLiveFeed } from './sources'
import { buildCitationGraph, getBacklinks, type Backlink, type CitationGraph } from './citations'

let cached: { graph: CitationGraph; itemsCount: number } | null = null
let buildPromise: Promise<CitationGraph> | null = null

async function getOrBuildGraph(): Promise<CitationGraph> {
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
