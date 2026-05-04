import { Minus, Plus } from 'lucide-react'

type Props = {
  value: number
  min?: number
  max: number
  onChange: (v: number) => void
  disabled?: boolean
}

export function QuantityStepper({ value, min = 0, max, onChange, disabled }: Props) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))
  const isMin = value <= min
  const isMax = value >= max

  return (
    <div className="inline-flex select-none items-center gap-1.5 rounded-full bg-white p-1 ring-1 ring-neutral-100">
      <button
        type="button"
        aria-label="Restar"
        onClick={dec}
        disabled={disabled || isMin}
        className="grid h-10 w-10 place-items-center rounded-full bg-primary-100 text-neutral-700 transition-all duration-200 active:scale-95 disabled:opacity-30 sm:h-11 sm:w-11"
      >
        <Minus size={18} strokeWidth={2.5} />
      </button>
      <div className="min-w-[2.5ch] text-center text-xl font-bold tabular-nums text-neutral-900 sm:text-2xl">
        {value}
      </div>
      <button
        type="button"
        aria-label="Sumar"
        onClick={inc}
        disabled={disabled || isMax}
        className="grid h-10 w-10 place-items-center rounded-full bg-primary-500 text-white shadow-sm transition-all duration-200 active:scale-95 hover:bg-primary-600 disabled:opacity-30 sm:h-11 sm:w-11"
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>
    </div>
  )
}
