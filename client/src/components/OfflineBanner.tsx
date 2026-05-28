import { useEffect, useState } from 'react'
import { WifiOff, X } from 'lucide-react'

// OfflineBanner · Indicador sticky cuando el dispositivo está offline.
// Aparece arriba (debajo del header) en cualquier página. Auto-oculta
// cuando vuelve la conexión.

export function OfflineBanner() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onOnline = () => { setOffline(false); setDismissed(false) }
    const onOffline = () => { setOffline(true); setDismissed(false) }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (!offline || dismissed) return null

  return (
    <div className="sticky top-0 z-40 bg-warning text-warning-fg shadow-card" role="status" aria-live="polite">
      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-2 px-4 py-2 sm:px-6">
        <WifiOff size={14} className="shrink-0" />
        <span className="flex-1 text-[12px] font-bold">
          Sin conexión · Estás viendo datos guardados en cache.
        </span>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Descartar"
          className="rounded-full p-1 hover:bg-warning-fg/10"
          title="Descartar"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
