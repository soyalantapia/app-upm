import { useEffect, type RefObject } from 'react'

// useFocusTrap · atrapa el focus dentro del ref mientras esté activo.
// Tab al final → vuelve al primer focusable. Shift+Tab al principio →
// salta al último. Escape sale (consumer decide qué hacer).
//
// Uso: const ref = useRef<HTMLDivElement>(null)
//      useFocusTrap(ref, open, onClose)

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
) {
  useEffect(() => {
    if (!active || !ref.current) return
    const root = ref.current

    // Focus al primer elemento focuseable al activarse
    const firstEl = root.querySelector<HTMLElement>(FOCUSABLE)
    firstEl?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault()
        onEscape()
        return
      }
      if (e.key !== 'Tab') return
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(el => !el.hasAttribute('disabled') && el.tabIndex >= 0)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const activeEl = document.activeElement as HTMLElement | null

      if (e.shiftKey) {
        // Shift+Tab desde el primer elemento → ir al último
        if (activeEl === first || !root.contains(activeEl)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        // Tab desde el último elemento → ir al primero
        if (activeEl === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, onEscape, ref])
}
