import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock, MapPin, User, Zap, AlertCircle } from 'lucide-react'
import { findOrderByToken, computeOrderStatus, type OrderProduct } from '@/data/mockOrders'
import { ProductRow } from '@/components/ProductRow'
import { StatusBadge } from '@/components/StatusBadge'
import { cn } from '@/lib/cn'

export function OrderDetailPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const order = useMemo(() => findOrderByToken(token), [token])

  const [selection, setSelection] = useState<Record<string, number>>({})

  if (!order) {
    return (
      <div className="animate-fade-up mx-auto flex w-full max-w-2xl flex-col items-center gap-5 px-4 py-20 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-[#fff0f0] text-[#b13030]">
          <AlertCircle size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">No encontramos ese pedido</h1>
          <p className="mt-2 text-base text-neutral-500">
            Revisá el código{' '}
            <code className="rounded-md bg-primary-100 px-1.5 py-0.5 font-mono text-sm font-bold text-neutral-700">
              {token}
            </code>{' '}
            o probá escaneando de nuevo.
          </p>
        </div>
        <Link
          to="/"
          className="rounded-full bg-primary-500 px-6 py-3.5 text-sm font-semibold text-white shadow-cta transition-all duration-200 hover:bg-primary-600 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
        >
          Volver a escanear
        </Link>
      </div>
    )
  }

  const isCompleted = order.status === 'completed'
  const totalItems = order.products.reduce((s, p) => s + p.total, 0)
  const retrievedItems = order.products.reduce((s, p) => s + p.retrieved, 0)
  const selectedItems = Object.values(selection).reduce((s, n) => s + n, 0)
  const progress = totalItems === 0 ? 0 : Math.round((retrievedItems / totalItems) * 100)

  const setQty = (productId: string, qty: number) =>
    setSelection((prev) => ({ ...prev, [productId]: qty }))

  const selectAll = () => {
    const next: Record<string, number> = {}
    order.products.forEach((p: OrderProduct) => {
      const remaining = p.total - p.retrieved
      if (remaining > 0) next[p.id] = remaining
    })
    setSelection(next)
  }

  const clearAll = () => setSelection({})

  const confirm = () => {
    if (selectedItems === 0) return
    const wouldComplete =
      computeOrderStatus(
        order.products.map((p) => ({
          ...p,
          retrieved: p.retrieved + (selection[p.id] ?? 0),
        })),
      ) === 'completed'
    navigate(
      `/pedidos/${encodeURIComponent(order.token)}/confirmacion?items=${selectedItems}&done=${wouldComplete ? '1' : '0'}`,
    )
  }

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <button
        onClick={() => navigate('/')}
        className="inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold text-neutral-500 transition-colors duration-150 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-primary-400"
      >
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              Pedido
            </p>
            <h1 className="mt-1 font-mono text-2xl font-bold tracking-widest text-neutral-900 sm:text-3xl">
              {order.token}
            </h1>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2 text-neutral-700">
            <User size={16} className="text-neutral-400" />
            <span className="font-medium">{order.customerName}</span>
          </div>
          {order.pickupPoint && (
            <div className="flex items-center gap-2 text-neutral-700">
              <MapPin size={16} className="text-neutral-400" />
              <span className="font-medium">{order.pickupPoint}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-neutral-700">
            <Clock size={16} className="text-neutral-400" />
            <span className="font-medium">
              {new Date(order.createdAt).toLocaleString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
              })}
            </span>
          </div>
        </dl>

        <div className="mt-5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-semibold text-neutral-500">Avance del retiro</span>
            <span className="font-bold tabular-nums text-neutral-700">
              {retrievedItems} de {totalItems}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-100">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                isCompleted ? 'bg-status-success' : 'bg-primary-500',
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {isCompleted && (
        <div className="flex items-center gap-3 rounded-2xl bg-secondary p-4 text-[#3f6a35]">
          <CheckCircle2 size={20} className="shrink-0" />
          <p className="text-sm font-semibold">Este pedido ya fue entregado por completo.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <h2 className="text-xl font-bold text-neutral-900">Productos</h2>
        {!isCompleted && (
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-semibold text-neutral-700 shadow-card ring-1 ring-neutral-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-primary-400"
            >
              <Zap size={14} /> Entregar todo
            </button>
            <button
              onClick={clearAll}
              disabled={selectedItems === 0}
              className="inline-flex h-11 items-center rounded-full px-4 text-xs font-semibold text-neutral-500 transition-colors duration-150 hover:text-neutral-900 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-primary-400"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 pb-4">
        {order.products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            selected={selection[product.id] ?? 0}
            onChange={(qty) => setQty(product.id, qty)}
          />
        ))}
      </div>

      {!isCompleted && (
        <>
          {/* Spacer for fixed action bar on mobile */}
          <div className="h-32 md:hidden" aria-hidden />

          <div
            className={cn(
              'fixed inset-x-3 bottom-[5.5rem] z-20 rounded-3xl bg-white p-3 shadow-floating',
              'md:static md:mt-3 md:bg-white md:p-4 md:shadow-card',
            )}
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
              <div className="pl-2">
                <p className="text-xs font-semibold text-neutral-500">A entregar</p>
                <p className="text-2xl font-bold tabular-nums text-neutral-900">{selectedItems}</p>
              </div>
              <button
                type="button"
                onClick={confirm}
                disabled={selectedItems === 0}
                className={cn(
                  'group relative flex-1 overflow-hidden rounded-full px-6 py-4 text-base font-semibold text-white transition-all duration-200',
                  'bg-primary-500 shadow-cta hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-floating',
                  'active:translate-y-0 active:scale-[0.98]',
                  'focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
                  'disabled:bg-primary-200 disabled:text-primary-400 disabled:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed',
                  'sm:flex-none sm:px-10',
                )}
              >
                Confirmar entrega
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
