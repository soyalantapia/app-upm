import { useEffect, useRef, useState } from 'react'
import { fetchLiveFeed, readCacheStatus, type AggregatedFeed } from './sources'
import { store } from './store'
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

  // Ref para hasCache que se mantiene sincrónica con el feed actual.
  // Antes capturábamos `feed` en la closure del useEffect (deps=[]) y siempre
  // era el valor inicial · cada interval de 5 min mostraba loading=true.
  const feedRef = useRef(feed)
  feedRef.current = feed

  useEffect(() => {
    let mounted = true
    let ctrl: AbortController | null = null

    const load = (force: boolean) => {
      ctrl?.abort()
      ctrl = new AbortController()
      const hasCache = !!feedRef.current
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
          if (mounted) {
            setFeed(f)
            // Evaluar alertas activas contra el nuevo feed
            evaluateAlerts(f)
          }
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

// Clave en sessionStorage para saber si ya evaluamos en esta sesión (evitar spam de notifs).
const EVAL_KEY = 'upm.alerts.evaluated'

function evaluateAlerts(feed: AggregatedFeed) {
  if (typeof window === 'undefined') return
  if (window.sessionStorage.getItem(EVAL_KEY)) return // ya se evaluó en esta sesión
  window.sessionStorage.setItem(EVAL_KEY, '1')

  const { alerts } = store.getSnapshot()
  const activeAlerts = alerts.filter(a => a.active)
  if (activeAlerts.length === 0) return

  for (const alert of activeAlerts) {
    const lower = alert.keyword.toLowerCase()
    const matches = feed.items.filter(item => {
      // Filtrar por países si el alert los especifica
      if (alert.countries.length > 0 && !alert.countries.includes(item.country)) return false
      // Filtrar por temas si el alert los especifica
      if (alert.topics.length > 0 && !alert.topics.includes(item.topic)) return false
      // Buscar keyword en título + excerpt
      return (item.title + ' ' + item.excerpt).toLowerCase().includes(lower)
    })
    if (matches.length > 0) {
      const best = matches[0]
      store.updateAlertMatchCount(alert.id, best.date)
      store.pushNotification({
        title: `Alerta: "${alert.keyword}"`,
        description: `${matches.length} coincidencia${matches.length > 1 ? 's' : ''} en el Radar · ${best.title.slice(0, 80)}${best.title.length > 80 ? '…' : ''}`,
        type: 'novedad',
        ref: best.id,
      })
    }
  }
}
