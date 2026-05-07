import { useEffect, useState } from 'react'
import { fetchLiveFeed, type AggregatedFeed } from './sources'

export function useLiveFeed() {
  const [feed, setFeed] = useState<AggregatedFeed | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = (force = false) => {
    setLoading(true)
    setError(null)
    const ctrl = new AbortController()
    fetchLiveFeed({ force, signal: ctrl.signal })
      .then(f => setFeed(f))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }

  useEffect(() => {
    const cleanup = load(false)
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { feed, loading, error, refresh: () => load(true) }
}
