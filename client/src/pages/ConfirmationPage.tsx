import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ScanLine, ArrowLeft, PartyPopper } from 'lucide-react'

export function ConfirmationPage() {
  const { token = '' } = useParams()
  const [params] = useSearchParams()
  const items = Number(params.get('items') ?? 0)
  const isDone = params.get('done') === '1'

  return (
    <div className="animate-fade-up mx-auto flex min-h-[80svh] w-full max-w-xl flex-col items-center justify-center gap-7 px-4 py-10 text-center">
      <div className="relative grid h-28 w-28 place-items-center rounded-full bg-secondary text-[#3f6a35] shadow-floating">
        <div className="absolute inset-0 animate-pulse-soft rounded-full bg-secondary opacity-60" />
        <div className="relative">
          {isDone ? <PartyPopper size={52} /> : <CheckCircle2 size={52} />}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          {isDone ? '¡Pedido completo!' : 'Entrega confirmada'}
        </h1>
        <p className="max-w-sm text-base text-neutral-500">
          {isDone ? (
            <>Entregaste los últimos {items} producto{items === 1 ? '' : 's'} del pedido.</>
          ) : (
            <>
              Entregaste {items} producto{items === 1 ? '' : 's'} del pedido{' '}
              <span className="font-mono font-bold tracking-widest text-neutral-800">{token}</span>
              .
            </>
          )}
        </p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-500 px-8 py-4 text-base font-semibold text-white shadow-cta transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-floating active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
        >
          <ScanLine size={20} /> Escanear otro
        </Link>
        {!isDone && (
          <Link
            to={`/pedidos/${encodeURIComponent(token)}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-neutral-800 shadow-card ring-1 ring-neutral-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-50 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
          >
            <ArrowLeft size={20} /> Volver al pedido
          </Link>
        )}
      </div>
    </div>
  )
}
