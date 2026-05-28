import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// PWAUpdateBanner · Notifica al usuario cuando hay una nueva versión
// del service worker. Por default vite-plugin-pwa con autoUpdate
// actualiza en background sin avisar — esto degrada UX porque el
// usuario podría seguir viendo versión vieja por horas.
//
// Aparece arriba del bottom-nav cuando needRefresh es true. El usuario
// elige cuándo recargar.

export function PWAUpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(swRegistration: ServiceWorkerRegistration | undefined) {
      // Reload check cada 60 minutos por si el usuario tiene la app abierta mucho tiempo
      if (swRegistration) {
        setInterval(() => { swRegistration.update() }, 60 * 60 * 1000)
      }
    },
  })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Reset dismiss si llega una nueva update mientras estamos mostrando dismissed
    if (needRefresh) setDismissed(false)
  }, [needRefresh])

  if (!needRefresh || dismissed) return null

  const handleUpdate = () => {
    updateServiceWorker(true)  // forzar recarga
  }

  return (
    <div className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 md:bottom-4">
      <div className="flex items-center gap-2 rounded-full bg-upm-700 px-3 py-2 shadow-floating ring-1 ring-upm-800">
        <RefreshCw size={13} className="text-white" />
        <span className="text-[12px] font-bold text-white">Nueva versión disponible</span>
        <button
          onClick={handleUpdate}
          className="rounded-full bg-white px-3 py-1 text-[11.5px] font-bold text-upm-700 hover:bg-upm-50"
        >
          Recargar
        </button>
        <button
          onClick={() => { setDismissed(true); setNeedRefresh(false) }}
          aria-label="Descartar"
          className="rounded-full p-1 text-white/70 hover:bg-upm-800 hover:text-white"
          title="Después"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
