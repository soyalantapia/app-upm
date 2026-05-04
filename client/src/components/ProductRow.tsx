import { Beer, Coffee, UtensilsCrossed, Check } from 'lucide-react'
import type { OrderProduct } from '@/data/mockOrders'
import { QuantityStepper } from './QuantityStepper'
import { cn } from '@/lib/cn'

const icons = {
  bebida: Beer,
  comida: UtensilsCrossed,
  extra: Coffee,
} as const

type Props = {
  product: OrderProduct
  selected: number
  onChange: (qty: number) => void
}

export function ProductRow({ product, selected, onChange }: Props) {
  const remaining = product.total - product.retrieved
  const Icon = icons[product.category] ?? Coffee
  const isFull = remaining === 0

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-3xl bg-white p-4 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between sm:p-5',
        isFull ? 'opacity-70' : 'shadow-sm hover:shadow-md',
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={cn(
            'grid h-12 w-12 shrink-0 place-items-center rounded-2xl',
            isFull ? 'bg-secondary text-[#3f6a35]' : 'bg-primary-100 text-neutral-700',
          )}
        >
          {isFull ? <Check size={22} strokeWidth={2.5} /> : <Icon size={22} />}
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-base font-bold text-neutral-900 sm:text-lg">
              {product.name}
            </h3>
            <span className="text-xs font-semibold text-neutral-400">×{product.total}</span>
          </div>
          {product.description && (
            <p className="truncate text-sm text-neutral-500">{product.description}</p>
          )}
          <p className="mt-1 text-xs font-medium text-neutral-400">
            Entregados <span className="text-neutral-700">{product.retrieved}</span> · Faltan{' '}
            <span className={cn(isFull ? 'text-[#3f6a35]' : 'text-primary-700')}>{remaining}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end">
        {isFull ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-[#3f6a35]">
            <Check size={14} strokeWidth={3} /> Entregado
          </span>
        ) : (
          <QuantityStepper value={selected} max={remaining} onChange={onChange} />
        )}
      </div>
    </div>
  )
}
