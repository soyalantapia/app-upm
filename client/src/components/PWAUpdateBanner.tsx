import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// PWAUpdateBanner · mantiene la app en la última versión sin depender de que
// el usuario note y toque un banner (antes quedaban varados en versión vieja).
//
// Estrategia: registerType 'autoUpdate' → el nuevo service worker activa solo
// (skipWaiting + clientsClaim). Cuando toma control de la página (controllerchange)
// recargamos UNA vez para servir el bundle nuevo. Guardas:
//  · solo recarga si YA había un SW controlando (update real, no primera instalación)
//  · flag de sesión para no entrar en loop de recargas
// Además rechequea updates al volver a la app (visibilitychange).

const RELOAD_FLAG = 'upm.sw.reloaded'

export function PWAUpdateBanner() {
  useRegisterSW({
    immediate: true,
    onRegistered(registration: ServiceWorkerRegistration | undefined) {
      if (!registration) return
      const check = () => registration.update().catch(() => {})
      // Rechequear cuando el usuario vuelve a la pestaña/app
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    // ¿Había un SW controlando al cargar? Si no, es primera instalación → no recargar.
    const hadController = !!navigator.serviceWorker.controller
    let reloaded = false

    const onControllerChange = () => {
      if (reloaded || !hadController) return
      // Evitar bucles entre cargas
      if (sessionStorage.getItem(RELOAD_FLAG)) return
      reloaded = true
      try {
        sessionStorage.setItem(RELOAD_FLAG, '1')
      } catch {
        /* sessionStorage bloqueado · igual recargamos una vez */
      }
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
  }, [])

  return null // sin UI · la actualización es automática
}
