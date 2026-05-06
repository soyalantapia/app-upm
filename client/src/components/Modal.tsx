import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const sizeCls = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg'

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[90] grid place-items-center px-4 py-6">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-upm-900/45 backdrop-blur-sm"
      />
      <div
        className={cn(
          'animate-toast-in relative flex max-h-[90vh] w-full flex-col rounded-3xl bg-white shadow-toast ring-1 ring-ink-100',
          sizeCls,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            {title && <div className="text-[17px] font-bold tracking-tight text-ink-900">{title}</div>}
            {description && <div className="mt-0.5 text-[12.5px] text-ink-500">{description}</div>}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-900"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 bg-ink-50/40 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
