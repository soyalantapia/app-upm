import { useEffect, useState } from 'react'

// Devuelve el valor `q` recién después de `delay` ms de quietud.
// Útil para no re-filtrar 1700 items en cada keystroke.
export function useDebounced<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
