import { useEffect, useRef, useState } from 'react'
import type { NewsItem } from './types'
import { matchesQuery } from './synonyms'

// Base del backend. IMPORTANTE: sin optional chaining (`env?.`) — Vite solo
// reemplaza el patrón exacto `import.meta.env.VITE_X` y si no rollup elimina
// el código por DCE. Mismo patrón que lib/sync.ts.
const API_BASE = (import.meta.env.VITE_UPM_API_URL ?? '').toString().replace(/\/$/, '')

export type SearchMode = 'hybrid' | 'fts' | 'local'
type Result = { items: NewsItem[]; loading: boolean; mode: SearchMode }

// Búsqueda SEMÁNTICA: pega a GET {API}/search?q= (pgvector + FTS híbrido en el
// backend → encuentra por SIGNIFICADO, no solo palabra clave). Si no hay API
// configurada, falla o tarda, cae al filtro local sobre `fallback` (matchesQuery),
// así el ⌘K nunca queda peor que antes. Recibe el query YA debounced.
export function useSemanticSearch(query: string, opts: { fallback: NewsItem[] }): Result {
  const term = query.trim()
  const [state, setState] = useState<Result>({ items: [], loading: false, mode: 'local' })
  // Ref para no re-disparar el efecto cuando cambia la identidad del fallback
  // (el feed se revalida cada 5min); solo nos importa el término.
  const fallbackRef = useRef(opts.fallback)
  fallbackRef.current = opts.fallback

  useEffect(() => {
    if (!term) {
      setState({ items: [], loading: false, mode: 'local' })
      return
    }
    const local = (): NewsItem[] =>
      fallbackRef.current.filter(n =>
        matchesQuery(`${n.title} ${n.excerpt ?? ''} ${n.tipoDocumento ?? ''}`, term),
      )

    if (!API_BASE) {
      setState({ items: local(), loading: false, mode: 'local' })
      return
    }

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 9000)
    setState(s => ({ ...s, loading: true }))
    fetch(`${API_BASE}/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('http ' + r.status))))
      .then((d: { items?: NewsItem[]; mode?: 'hybrid' | 'fts' }) => {
        const items = Array.isArray(d.items) ? d.items : []
        // Si el backend no trajo nada, mostramos el fallback local por las dudas.
        setState({
          items: items.length ? items : local(),
          loading: false,
          mode: items.length ? (d.mode ?? 'hybrid') : 'local',
        })
      })
      .catch(() => setState({ items: local(), loading: false, mode: 'local' }))
      .finally(() => clearTimeout(timer))

    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [term])

  return state
}
