import { useEffect, useState } from 'react'
import { fetchLiveFeed, readCacheStatus, type AggregatedFeed } from './sources'
import type { CountryCode, Topic } from './types'

const AUTO_REFRESH_MS = 5 * 60 * 1000 // 5 min

export function useLiveFeed(prefs?: { countries?: CountryCode[]; topics?: Topic[] }) {
  // Hidratar inicialmente desde cache si existe (incluso si está stale dentro de 24h).
  // Esto hace que el primer paint sea instantáneo y no se vea el skeleton.
  const initial = readCacheStatus()
  const [feed, setFeed] = useState<AggregatedFeed | null>(initial?.feed ?? null)
  // loading=true solo si NO hay cache. Si hay cache (aunque sea stale), feed se ve y
  // refrescamos en background sin spinner global.
  const [loading, setLoading] = useState(!initial)
  const [revalidating, setRevalidating] = useState(initial?.fresh === false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let ctrl: AbortController | null = null

    const load = (force: boolean) => {
      ctrl?.abort()
      ctrl = new AbortController()
      const hasCache = !!feed
      // Si NO hay cache previo, mostramos loading global. Si hay, solo "revalidating".
      if (!hasCache) setLoading(true)
      else setRevalidating(true)
      setError(null)
      fetchLiveFeed({
        force,
        signal: ctrl.signal,
        prefs,
        // Render progresivo: cada fetcher que responde actualiza el state.
        onProgress: partial => {
          if (!mounted) return
          // Solo actualizar si el partial trae al menos 1 fuente live.
          if (partial.sources.some(s => s.ok)) {
            setFeed(partial)
            // Quitamos el loading apenas tenemos la primera fuente.
            if (!hasCache) setLoading(false)
          }
        },
      })
        .then(f => {
          if (mounted) setFeed(f)
        })
        .catch(e => {
          if (mounted) setError(String(e))
        })
        .finally(() => {
          if (mounted) {
            setLoading(false)
            setRevalidating(false)
          }
        })
    }

    // Primera carga: usa cache si está fresh; si no, hace fetch (stale-while-revalidate).
    const cached = readCacheStatus()
    load(!cached || !cached.fresh)
    const timer = setInterval(() => load(true), AUTO_REFRESH_MS)

    return () => {
      mounted = false
      ctrl?.abort()
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refresh = () => {
    const ctrl = new AbortController()
    setRevalidating(true)
    setError(null)
    fetchLiveFeed({
      force: true,
      prefs,
      signal: ctrl.signal,
      onProgress: partial => {
        if (partial.sources.some(s => s.ok)) setFeed(partial)
      },
    })
      .then(setFeed)
      .catch(e => setError(String(e)))
      .finally(() => setRevalidating(false))
  }

  return { feed, loading, revalidating, error, refresh }
}
