import { cn } from '@/lib/cn'

export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-upm-500 to-upm-800 text-white shadow-cta',
        className,
      )}
      style={{ width: size, height: size }}
      aria-label="UPM"
    >
      <svg viewBox="0 0 32 32" width={size * 0.62} height={size * 0.62} fill="none" aria-hidden>
        <path d="M6 8h4v10a4 4 0 0 0 4 4 4 4 0 0 0 4-4V8h4v10a8 8 0 0 1-16 0V8Z" fill="currentColor" />
        <circle cx="24.5" cy="9.5" r="2.5" fill="#DCEBFA" />
      </svg>
    </span>
  )
}

export function BrandLockup({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <BrandMark size={compact ? 32 : 38} />
      <div className="flex flex-col leading-tight">
        <span className="text-[15px] font-bold tracking-tight text-upm-800">Asistente AI UPM</span>
        {!compact && (
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-500">
            Legislador · Demo
          </span>
        )}
      </div>
    </div>
  )
}
