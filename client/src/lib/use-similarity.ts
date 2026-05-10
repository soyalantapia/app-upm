import { useEffect, useState } from 'react'
import { fetchLiveFeed } from './sources'
import { buildSimilarityIndex, findSimilarItems, type SimilarItem, type SimilarityIndex } from './similarity'

// Cache módulo-level del índice TF-IDF. Se construye una vez con el feed completo
// y se reutiliza para todas las páginas (Radar detalle, Leyes detalle).
// Invalidación: si llega un feed con más items, reconstruimos.
let cached: { index: SimilarityIndex; itemsCount: number } | null = null
let buildPromise: Promise<SimilarityIndex> | null = null

async function getOrBuildIndex(): Promise<SimilarityIndex> {
  // Si ya hay índice cacheado y el feed no cambió de tamaño, reusar.
  if (cached && buildPromise === null) {
    // Sondear si el feed cambió (lectura sincrónica de cache)
    const feed = await fetchLiveFeed({}).catch(() => null)
    if (feed && feed.items.length === cached.itemsCount) return cached.index
    // Si cambió, invalidar y reconstruir abajo
    cached = null
  }
  if (buildPromise) return buildPromise
  buildPromise = (async () => {
    const feed = await fetchLiveFeed({})
    const index = buildSimilarityIndex(feed.items)
    cached = { index, itemsCount: feed.items.length }
    buildPromise = null
    return index
  })()
  return buildPromise
}

// Hook: dado un itemId, devuelve los K items más similares cross-país.
export function useSimilarItems(itemId: string | undefined, topK = 6): {
  similar: SimilarItem[]
  loading: boolean
} {
  const [similar, setSimilar] = useState<SimilarItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!itemId) {
      setSimilar([])
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true)
    getOrBuildIndex()
      .then(index => {
        if (!mounted) return
        const result = findSimilarItems(itemId, index, { topK, preferCrossCountry: true })
        setSimilar(result)
        setLoading(false)
      })
      .catch(() => {
        if (mounted) {
          setSimilar([])
          setLoading(false)
        }
      })
    return () => {
      mounted = false
    }
  }, [itemId, topK])

  return { similar, loading }
}
