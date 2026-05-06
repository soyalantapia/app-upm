import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  width = 'lg',
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  width?: 'md' | 'lg' | 'xl'
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

  const widthCls =
    width === 'md' ? 'max-w-md' : width === 'xl' ? 'max-w-3xl' : 'max-w-2xl'

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[80]">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-upm-900/40 backdrop-blur-sm"
      />
      <div
        className={cn(
          'animate-slide-in-right absolute inset-y-0 right-0 flex w-full flex-col bg-bg shadow-floating',
          widthCls,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 bg-white/80 px-5 py-4 backdrop-blur">
          <div className="min-w-0 flex-1">
            {title && <div className="text-[16px] font-bold tracking-tight text-ink-900">{title}</div>}
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
      </div>
    </div>
  )
}
