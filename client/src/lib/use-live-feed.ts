import { useEffect, useState } from 'react'
import { fetchLiveFeed, type AggregatedFeed } from './sources'
import type { CountryCode, Topic } from './types'

const AUTO_REFRESH_MS = 5 * 60 * 1000 // 5 min

export function useLiveFeed(prefs?: { countries?: CountryCode[]; topics?: Topic[] }) {
  const [feed, setFeed] = useState<AggregatedFeed | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let ctrl: AbortController | null = null

    const load = (force: boolean) => {
      ctrl?.abort()
      ctrl = new AbortController()
      setLoading(true)
      setError(null)
      fetchLiveFeed({ force, signal: ctrl.signal, prefs })
        .then(f => { if (mounted) setFeed(f) })
        .catch(e => { if (mounted) setError(String(e)) })
        .finally(() => { if (mounted) setLoading(false) })
    }

    load(false)
    const timer = setInterval(() => load(true), AUTO_REFRESH_MS)

    return () => {
      mounted = false
      ctrl?.abort()
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refresh = () => {
    setLoading(true)
    setError(null)
    fetchLiveFeed({ force: true, prefs })
      .then(setFeed)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }

  return { feed, loading, error, refresh }
}
