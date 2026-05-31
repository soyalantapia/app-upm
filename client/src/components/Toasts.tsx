import { CheckCircle2, Info, XCircle, AlertTriangle, X } from 'lucide-react'
import { store, useStore } from '@/lib/store'
import { cn } from '@/lib/cn'

const TONE_ICON = {
  success: <CheckCircle2 size={18} className="text-success" />,
  info: <Info size={18} className="text-info" />,
  warning: <AlertTriangle size={18} className="text-warning" />,
  danger: <XCircle size={18} className="text-danger" />,
}

const TONE_RING = {
  success: 'ring-success-bg',
  info: 'ring-info-bg',
  warning: 'ring-warning-bg',
  danger: 'ring-danger-bg',
}

export function Toasts() {
  const toasts = useStore(s => s.toasts)
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed top-4 left-1/2 z-[80] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          role={t.tone === 'danger' ? 'alert' : undefined}
          className={cn(
            'animate-toast-in pointer-events-auto flex items-start gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-toast ring-1',
            TONE_RING[t.tone],
          )}
        >
          <div className="mt-0.5">{TONE_ICON[t.tone]}</div>
          <p className="flex-1 text-sm text-ink-900">{t.message}</p>
          {t.action && (
            <button
              onClick={() => { t.action!.onClick(); store.dismissToast(t.id) }}
              className="shrink-0 self-center rounded-full bg-upm-50 px-2.5 py-1 text-[12px] font-bold text-upm-700 ring-1 ring-upm-100 hover:bg-upm-100"
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={() => store.dismissToast(t.id)}
            className="rounded-full p-1 text-ink-300 hover:bg-ink-50 hover:text-ink-700"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
