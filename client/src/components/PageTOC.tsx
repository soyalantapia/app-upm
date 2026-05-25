import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { List, ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// PageTOC · Tabla de contenidos sticky para páginas largas (Leyes detalle,
// NewsConversation, etc). Mobile: collapsible chip arriba. Desktop: sticky
// rail a la derecha con scroll-to.

export type TOCSection = {
  id: string         // id del elemento DOM
  label: string      // texto del item
  icon?: LucideIcon
}

export function PageTOC({ sections }: { sections: TOCSection[] }) {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Detectar qué sección está visible (intersection observer)
  useEffect(() => {
    const els = sections.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    if (els.length === 0) return
    const obs = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -60% 0px' },
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [sections])

  if (sections.length < 3) return null  // no vale la pena para <3 secciones

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 70
    window.scrollTo({ top, behavior: 'smooth' })
    setOpen(false)
  }

  return createPortal(
    <>
      {/* Mobile: chip flotante abajo a la derecha */}
      <div className="fixed bottom-20 right-4 z-30 lg:hidden">
        <button
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-upm-700 px-3 py-2 text-[11.5px] font-bold text-white shadow-floating hover:bg-upm-800"
          aria-label="Tabla de contenidos"
        >
          <List size={13} /> Secciones <ChevronDown size={11} className={open ? 'rotate-180 transition' : 'transition'} />
        </button>
        {open && (
          <>
            <button
              aria-label="Cerrar"
              className="fixed inset-0 z-30"
              onClick={() => setOpen(false)}
            />
            <div className="absolute bottom-12 right-0 z-40 w-64 max-h-[60vh] overflow-y-auto rounded-2xl bg-white p-2 ring-1 ring-ink-100 shadow-floating">
              {sections.map(s => {
                const Icon = s.icon
                const isActive = s.id === activeId
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={
                      'flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[12px] font-semibold transition ' +
                      (isActive ? 'bg-upm-50 text-upm-800' : 'text-ink-700 hover:bg-ink-50')
                    }
                  >
                    {Icon ? <Icon size={12} /> : null}
                    <span className="line-clamp-1">{s.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Desktop: rail sticky a la derecha */}
      <aside className="hidden lg:block fixed right-6 top-24 z-20 w-56">
        <div className="rounded-2xl bg-white/90 p-2 ring-1 ring-ink-100 shadow-card backdrop-blur">
          <div className="px-2 pb-1 text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
            Secciones
          </div>
          <nav className="flex flex-col gap-0.5 max-h-[70vh] overflow-y-auto">
            {sections.map(s => {
              const Icon = s.icon
              const isActive = s.id === activeId
              return (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={
                    'flex items-center gap-2 rounded-lg px-2 py-1 text-left text-[11.5px] font-semibold transition ' +
                    (isActive ? 'bg-upm-50 text-upm-800 ring-1 ring-upm-100' : 'text-ink-600 hover:bg-ink-50')
                  }
                >
                  {Icon ? <Icon size={11} className="shrink-0" /> : null}
                  <span className="line-clamp-1">{s.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </aside>
    </>,
    document.body,
  )
}
