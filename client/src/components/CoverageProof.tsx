import { CountUp } from '@/components/CountUp'
import { cn } from '@/lib/cn'

// Números honestos del corpus.
//  · Países = COUNTRIES.length (fuente única en lib/data).
//  · Fuentes oficiales = entradas del registro en lib/sources/index.ts (45 al hoy).
//    Se deja como constante para NO arrastrar los 45 adaptadores (fetch) al
//    chunk del login; si cambia el registro, actualizar acá.
// Números REALES de producción: 4 países con corpus (AR/CO/UY/BR) y 39 fuentes
// activas (registry, tras sacar las 9 fuentes sintéticas).
const PAISES = 4
const FUENTES_OFICIALES = 39

type Tone = 'dark' | 'light'

const TONE: Record<Tone, { wrap: string; num: string; label: string; divider: string; dot: string; live: string }> = {
  dark: {
    wrap: 'bg-white/5 ring-1 ring-white/10 backdrop-blur',
    num: 'text-white',
    label: 'text-white/60',
    divider: 'bg-white/10',
    dot: 'bg-emerald-400',
    live: 'text-white/85',
  },
  light: {
    wrap: 'bg-upm-50/70 ring-1 ring-upm-100',
    num: 'text-upm-900',
    label: 'text-ink-500',
    divider: 'bg-ink-100',
    dot: 'bg-success',
    live: 'text-ink-700',
  },
}

/**
 * Prueba de cobertura "en vivo" para la puerta de entrada (Login/Signup).
 * Comunica escala real del corpus en 5 segundos: países + fuentes oficiales
 * conectadas, con count-up (los números "respiran"), más un pulso "En vivo".
 * Mismo lenguaje que la cinta de cobertura del Home.
 */
export function CoverageProof({ tone = 'dark', className }: { tone?: Tone; className?: string }) {
  const t = TONE[tone]
  return (
    <div
      role="group"
      aria-label={`Cobertura del corpus UPM: ${PAISES} países, ${FUENTES_OFICIALES} fuentes oficiales, monitoreo en vivo`}
      className={cn('flex items-stretch gap-1 rounded-2xl p-2.5 sm:gap-2 sm:p-3', t.wrap, className)}
    >
      <Metric value={PAISES} label="Países" tone={t} />
      <span aria-hidden className={cn('w-px self-stretch', t.divider)} />
      <Metric value={FUENTES_OFICIALES} label="Fuentes oficiales" tone={t} />
      <span aria-hidden className={cn('w-px self-stretch', t.divider)} />
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1.5">
        <span className="relative flex h-2.5 w-2.5 items-center justify-center">
          <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping', t.dot)} />
          <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', t.dot)} />
        </span>
        <span className={cn('text-[10px] font-bold uppercase tracking-[0.14em]', t.live)}>En vivo</span>
      </div>
    </div>
  )
}

function Metric({ value, label, tone }: { value: number; label: string; tone: (typeof TONE)[Tone] }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-0.5 px-1.5 text-center">
      <CountUp value={value} className={cn('text-[20px] font-bold leading-none tabular-nums sm:text-[24px]', tone.num)} />
      <span className={cn('text-[9.5px] font-bold uppercase leading-tight tracking-[0.12em] sm:text-[10px]', tone.label)}>
        {label}
      </span>
    </div>
  )
}
