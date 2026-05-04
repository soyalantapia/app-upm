import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ScanLine, ArrowLeft, PartyPopper } from 'lucide-react'

export function ConfirmationPage() {
  const { token = '' } = useParams()
  const [params] = useSearchParams()
  const items = Number(params.get('items') ?? 0)
  const isDone = params.get('done') === '1'

  return (
    <div className="mx-auto flex min-h-[80svh] w-full max-w-xl flex-col items-center justify-center gap-7 px-4 py-10 text-center">
      <div className="grid h-24 w-24 place-items-center rounded-3xl bg-secondary text-[#3f6a35] shadow-sm">
        {isDone ? <PartyPopper size={48} /> : <CheckCircle2 size={48} />}
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
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
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-500 px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-primary-600 active:scale-[0.99]"
        >
          <ScanLine size={20} /> Escanear otro
        </Link>
        {!isDone && (
          <Link
            to={`/pedidos/${encodeURIComponent(token)}`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-neutral-800 shadow-sm ring-1 ring-neutral-100 hover:bg-primary-100"
          >
            <ArrowLeft size={20} /> Volver al pedido
          </Link>
        )}
      </div>
    </div>
  )
}
