import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'

// OverflowActions · muestra los primeros N children inline + un menú
// "Más ⋯" con el resto. Resuelve el problema de action bars que
// wrappean a 3 filas en mobile.

export function OverflowActions({
  children,
  visibleCount = 3,
}: {
  children: ReactNode[]
  visibleCount?: number
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children]
  const visible = items.slice(0, visibleCount)
  const overflow = items.slice(visibleCount)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const id = setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', onDoc)
    }
  }, [open])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible}
      {overflow.length > 0 && (
        <div ref={wrapRef} className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            aria-label="Más acciones"
            aria-expanded={open}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 hover:text-upm-700"
          >
            <MoreHorizontal size={14} />
            Más
          </button>
          {open && (
            <div
              role="menu"
              className="absolute left-0 sm:right-0 sm:left-auto top-full z-30 mt-1 flex w-56 flex-col gap-0.5 rounded-2xl bg-white p-1.5 ring-1 ring-ink-100 shadow-floating"
              onClick={() => setOpen(false)}
            >
              {overflow.map((item, i) => (
                <div key={i} className="contents">
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
