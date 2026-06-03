import { useEffect, useRef, useState } from 'react'

// CountUp · anima un número desde 0 hasta su valor con easeOutCubic.
// Detalle premium: los números "cuentan" al montar en vez de aparecer secos.
// Respeta prefers-reduced-motion (accesibilidad) → muestra el valor final directo.

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))
  // Ref con el valor mostrado actual · para animar DESDE acá hacia el nuevo target
  // (evita reiniciar desde 0 cuando el feed se actualiza en vivo → tic suave).
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }
    const from = valueRef.current
    if (from === target) return
    let raf = 0
    let start: number | null = null
    const tick = (ts: number) => {
      if (start === null) start = ts
      const t = Math.min(1, (ts - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setValue(from + (target - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else setValue(target)
    }
    raf = requestAnimationFrame(tick)
    // Backstop · si rAF está throttleado (pestaña en segundo plano) garantizamos
    // el valor final igual, para que nunca quede "pegado" en un número intermedio.
    const backstop = setTimeout(() => setValue(target), durationMs + 80)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(backstop)
    }
  }, [target, durationMs])

  return value
}

export function CountUp({
  value,
  durationMs,
  className,
}: {
  value: number
  durationMs?: number
  className?: string
}) {
  const animated = useCountUp(value, durationMs)
  return <span className={className}>{Math.round(animated).toLocaleString('es-AR')}</span>
}
