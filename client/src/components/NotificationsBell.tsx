import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, BellRing, Check, FileStack, FileText, Newspaper, Sparkles } from 'lucide-react'
import { Badge } from './ui'
import { cn } from '@/lib/cn'
import { store, useStore, type Notification } from '@/lib/store'

const ICONS: Record<Notification['type'], typeof Bell> = {
  novedad: Newspaper,
  documento: FileText,
  foro: FileStack,
  sistema: Sparkles,
}

const TONE: Record<Notification['type'], string> = {
  novedad: 'bg-warning-bg text-warning-fg',
  documento: 'bg-info-bg text-info-fg',
  foro: 'bg-upm-50 text-upm-700',
  sistema: 'bg-success-bg text-success-fg',
}

export function NotificationsBell({ compact }: { compact?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const notifications = useStore(s => s.notifications)
  const unreadCount = notifications.filter(n => n.unread).length
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  // Cerrar al cambiar de ruta
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Click outside / Escape
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        buttonRef.current && !buttonRef.current.contains(t) &&
        dropdownRef.current && !dropdownRef.current.contains(t)
      ) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    setTimeout(() => window.addEventListener('mousedown', onClick), 0)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Calcular posición cuando se abre o cambia el viewport
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return
    const update = () => {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdownWidth = 330
      const margin = 12
      const viewportW = window.innerWidth
      // En sidebar (no compact) abrir hacia la derecha alineado al borde izquierdo del bell.
      // En mobile/header (compact) abrir alineado al borde derecho del bell.
      let left = compact
        ? rect.right - dropdownWidth
        : rect.left
      // Clamp para no salirse de la pantalla
      if (left + dropdownWidth + margin > viewportW) left = viewportW - dropdownWidth - margin
      if (left < margin) left = margin
      setPos({ top: rect.bottom + 8, left })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, compact])

  const handleClick = (n: Notification) => {
    store.markNotificationRead(n.id)
    setOpen(false)
    if (n.type === 'novedad' && n.ref) {
      navigate(`/radar/${n.ref}`)
    } else if (n.type === 'documento') {
      navigate('/biblioteca')
    } else if (n.type === 'foro') {
      navigate('/biblioteca')
    } else {
      navigate('/')
    }
  }

  const Icon = unreadCount ? BellRing : Bell

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'relative grid place-items-center rounded-full transition-all',
          compact
            ? 'h-9 w-9 bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15'
            : 'h-9 w-9 bg-white text-ink-700 ring-1 ring-ink-100 shadow-card hover:bg-upm-50 hover:text-upm-700',
        )}
        aria-label="Notificaciones"
      >
        <Icon size={15} className={unreadCount ? 'animate-pulse-soft' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white tabular-nums ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 330 }}
          className="animate-toast-in z-[200] rounded-3xl bg-white p-3 shadow-toast ring-1 ring-ink-100"
        >
          <div className="flex items-center justify-between px-2 pb-2">
            <div>
              <div className="text-[14px] font-bold tracking-tight text-ink-900">Notificaciones</div>
              <div className="text-[11px] text-ink-500">
                {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  store.markAllNotificationsRead()
                  store.pushToast('success', 'Todas marcadas como leídas')
                }}
                className="inline-flex items-center gap-1 rounded-full bg-upm-50 px-2.5 py-1 text-[11px] font-bold text-upm-800 hover:bg-upm-100"
              >
                <Check size={11} /> Marcar todas
              </button>
            )}
          </div>

          <div className="flex max-h-[420px] flex-col gap-1 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-success-bg text-success-fg">
                  <Check size={20} strokeWidth={2.4} />
                </div>
                <div className="text-[13px] font-bold text-ink-900">Tu radar está al día</div>
                <div className="text-[11.5px] leading-relaxed text-ink-500">
                  Te avisaremos cuando haya novedades relevantes para tus temas y países.
                </div>
              </div>
            ) : (
              notifications.map(n => {
                const NIcon = ICONS[n.type]
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      'flex items-start gap-3 rounded-2xl p-3 text-left transition-colors',
                      n.unread ? 'bg-upm-50/50 hover:bg-upm-50' : 'hover:bg-ink-50',
                    )}
                  >
                    <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', TONE[n.type])}>
                      <NIcon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[12.5px] font-bold leading-snug text-ink-900">{n.title}</span>
                        {n.unread && <Badge tone="danger">nuevo</Badge>}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-500 line-clamp-2">
                        {n.description}
                      </span>
                      <span className="mt-1 block text-[10.5px] text-ink-400 tabular-nums">
                        {new Date(n.createdAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
