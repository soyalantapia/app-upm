import type { ProductStatus } from '@/data/mockOrders'
import { cn } from '@/lib/cn'

const labels: Record<ProductStatus, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  completed: 'Completado',
}

const styles: Record<ProductStatus, string> = {
  pending: 'bg-[#fff8e1] text-[#a17d12]',
  partial: 'bg-secondary text-[#3f6a35]',
  completed: 'bg-[#e8f6ec] text-[#2d8a45]',
}

export function StatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        styles[status],
        className,
      )}
    >
      {labels[status]}
    </span>
  )
}
