import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useLiveFeed } from '@/lib/use-live-feed'

// SourceHealthBanner · Aparece SIEMPRE arriba (debajo del header) si
// alguna fuente del feed tiene error. Dismissible por sesión.
// Sin interrupción al flow del legislador pero garantiza visibilidad.

const DISMISS_KEY = 'upm.source-health.dismissed-until'

export function SourceHealthBanner() {
  const { feed } = useLiveFeed()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      const until = window.sessionStorage.getItem(DISMISS_KEY)
      if (until && Number(until) > Date.now()) setDismissed(true)
    } catch { /* ignore */ }
  }, [])

  if (dismissed) return null
  if (!feed?.sources) return null

  const failed = feed.sources.filter(s => !s.ok)
  if (failed.length === 0) return null

  const handleDismiss = () => {
    setDismissed(true)
    try {
      // Dismiss por 1 hora
      window.sessionStorage.setItem(DISMISS_KEY, String(Date.now() + 60 * 60 * 1000))
    } catch { /* ignore */ }
  }

  return (
    <div className="sticky top-14 z-30 -mx-4 mt-0 mb-3 bg-warning-bg/95 ring-1 ring-warning/30 backdrop-blur sm:-mx-6">
      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-2 px-4 py-2 sm:px-6">
        <AlertTriangle size={14} className="shrink-0 text-warning-fg" />
        <div className="flex-1 min-w-0 text-[12px] leading-tight text-warning-fg">
          <span className="font-bold">{failed.length} fuente{failed.length > 1 ? 's' : ''} con error.</span>{' '}
          <span className="opacity-80 line-clamp-1">
            {failed.slice(0, 2).map(s => s.label).join(', ')}
            {failed.length > 2 ? ` y ${failed.length - 2} más` : ''}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded-full p-1 text-warning-fg/60 hover:bg-warning/10 hover:text-warning-fg"
          aria-label="Descartar por 1 hora"
          title="Descartar por 1 hora"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
