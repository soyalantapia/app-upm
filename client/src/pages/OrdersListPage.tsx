import { Link } from 'react-router-dom'
import { ChevronRight, Clock, MapPin } from 'lucide-react'
import { mockOrders } from '@/data/mockOrders'
import { StatusBadge } from '@/components/StatusBadge'

export function OrdersListPage() {
  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">Pedidos</h1>
        <p className="text-base text-neutral-500">Acceso rápido a los pedidos en demo.</p>
      </div>

      <div className="flex flex-col gap-3">
        {mockOrders.map((o, i) => {
          const total = o.products.reduce((s, p) => s + p.total, 0)
          const retrieved = o.products.reduce((s, p) => s + p.retrieved, 0)
          return (
            <Link
              key={o.id}
              to={`/pedidos/${o.token}`}
              style={{ animationDelay: `${i * 60}ms` }}
              className="animate-fade-up group flex items-center gap-4 rounded-3xl bg-white p-4 shadow-card transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 sm:p-5"
            >
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-100 font-mono text-xs font-bold tracking-widest text-neutral-700 transition-all duration-300 group-hover:bg-primary-500 group-hover:text-white">
                {o.token.slice(-3)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-bold text-neutral-900">{o.customerName}</p>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-0.5 font-mono text-xs font-semibold tracking-widest text-neutral-400">
                  {o.token}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-neutral-500">
                  {o.pickupPoint && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} /> {o.pickupPoint}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(o.createdAt).toLocaleString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="tabular-nums">
                    {retrieved} de {total} entregados
                  </span>
                </div>
              </div>
              <ChevronRight
                size={20}
                className="shrink-0 text-neutral-300 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary-700"
              />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
