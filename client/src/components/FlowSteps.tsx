import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export type FlowStep = 'datos' | 'pago' | 'listo'

const STEPS: { id: FlowStep; label: string }[] = [
  { id: 'datos', label: 'Datos' },
  { id: 'pago', label: 'Pago' },
  { id: 'listo', label: 'Listo' },
]

/**
 * Indicador de progreso del funnel de alta (Datos → Pago → Listo).
 * Pensado para vivir sobre el fondo oscuro del FullBleedShell (texto blanco).
 * Da sensación de avance guiado: el visitante sabe dónde está y cuánto falta.
 */
export function FlowSteps({ current, className }: { current: FlowStep; className?: string }) {
  const currentIndex = STEPS.findIndex(s => s.id === current)

  return (
    <nav
      aria-label="Progreso de alta"
      className={cn('mx-auto flex w-full max-w-md items-center', className)}
    >
      {STEPS.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        const isLast = i === STEPS.length - 1
        return (
          <div key={step.id} className={cn('flex items-center', !isLast && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full text-[12.5px] font-bold tabular-nums transition-all duration-300',
                  done && 'bg-upm-300 text-upm-900 ring-1 ring-upm-200/60',
                  active && 'bg-white text-upm-800 shadow-floating ring-2 ring-white/70',
                  !done && !active && 'bg-white/10 text-white/55 ring-1 ring-white/20',
                )}
              >
                {done ? <Check size={15} strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-[10.5px] font-bold uppercase tracking-[0.14em] transition-colors',
                  active ? 'text-white' : done ? 'text-white/80' : 'text-white/45',
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  'mx-2 -mt-5 h-0.5 flex-1 rounded-full transition-colors duration-300',
                  i < currentIndex ? 'bg-upm-300' : 'bg-white/15',
                )}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
