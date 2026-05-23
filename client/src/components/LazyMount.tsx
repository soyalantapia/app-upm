import { useEffect, useRef, useState } from 'react'

// Wrapper que solo renderiza children cuando el contenedor entra en viewport
// (con margin para precargar antes). Reduce el trabajo inicial de detalles
// pesados (Constelación SVG, ModificatoriasTimeline con regex masivas, etc.)
//
// Usage:
//   <LazyMount minHeight={200}><ConstelacionRegulatoria item={item} /></LazyMount>
//
// El placeholder reserva el espacio (minHeight) para evitar layout shifts.
export function LazyMount({
  children,
  minHeight = 120,
  rootMargin = '200px',
}: {
  children: React.ReactNode
  minHeight?: number
  rootMargin?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (mounted) return
    const el = ref.current
    if (!el) return
    // Fallback si no hay IntersectionObserver (raro pero por las dudas)
    if (typeof IntersectionObserver === 'undefined') {
      setMounted(true)
      return
    }
    const obs = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setMounted(true)
            obs.disconnect()
            break
          }
        }
      },
      { rootMargin },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [mounted, rootMargin])

  return (
    <div ref={ref} style={mounted ? undefined : { minHeight }}>
      {mounted ? children : (
        <div className="flex items-center justify-center rounded-3xl bg-ink-50/30 ring-1 ring-ink-100" style={{ minHeight }}>
          <span className="text-[11px] text-ink-400">Cargando…</span>
        </div>
      )}
    </div>
  )
}
