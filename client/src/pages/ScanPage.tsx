import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, Keyboard, ScanLine, AlertCircle } from 'lucide-react'
import { mockOrders } from '@/data/mockOrders'
import { cn } from '@/lib/cn'

type Mode = 'idle' | 'camera' | 'manual'

export function ScanPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('idle')
  const [manualToken, setManualToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerId = 'qr-reader'

  useEffect(() => {
    if (mode !== 'camera') return
    let active = true
    const scanner = new Html5Qrcode(containerId, false)
    scannerRef.current = scanner
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (!active) return
          active = false
          scanner.stop().catch(() => {})
          navigate(`/pedidos/${encodeURIComponent(decoded.trim())}`)
        },
        () => {},
      )
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'No pudimos acceder a la cámara.'
        setError(msg)
        setMode('idle')
      })
    return () => {
      active = false
      scanner.stop().catch(() => {}).finally(() => scanner.clear().catch(() => {}))
    }
  }, [mode, navigate])

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualToken.trim()) return
    navigate(`/pedidos/${encodeURIComponent(manualToken.trim())}`)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold text-neutral-900 sm:text-4xl">Escaneá un QR</h1>
        <p className="text-base text-neutral-500">
          Pediles el código a tu cliente y entregá los productos en segundos.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl bg-[#fff0f0] p-4 text-[#b13030]">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-primary-100 sm:aspect-[4/3]">
        {mode === 'camera' ? (
          <div id={containerId} className="absolute inset-0" />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-white text-primary-700 shadow-sm">
                <ScanLine size={40} />
              </div>
              <div>
                <p className="text-base font-semibold text-neutral-800">Listo para escanear</p>
                <p className="mt-1 max-w-xs text-sm text-neutral-500">
                  Activá la cámara o cargá el código a mano.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-dashed border-white/60" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setError(null)
            setMode((m) => (m === 'camera' ? 'idle' : 'camera'))
          }}
          className={cn(
            'flex items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-semibold shadow-sm transition-all duration-200 active:scale-[0.98]',
            mode === 'camera'
              ? 'bg-[#ff5656] text-white hover:brightness-95'
              : 'bg-primary-500 text-white hover:bg-primary-600',
          )}
        >
          <Camera size={20} />
          {mode === 'camera' ? 'Detener cámara' : 'Activar cámara'}
        </button>

        <button
          type="button"
          onClick={() => setMode((m) => (m === 'manual' ? 'idle' : 'manual'))}
          className="flex items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-base font-semibold text-neutral-800 shadow-sm ring-1 ring-neutral-100 transition-all duration-200 hover:bg-primary-100 active:scale-[0.98]"
        >
          <Keyboard size={20} />
          Cargar código
        </button>
      </div>

      {mode === 'manual' && (
        <form onSubmit={submitManual} className="flex flex-col gap-3 sm:flex-row">
          <input
            autoFocus
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value.toUpperCase())}
            placeholder="DNX-XXXXXX"
            className="flex-1 rounded-2xl bg-white px-5 py-4 text-base tracking-widest text-neutral-900 ring-1 ring-neutral-100 placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <button
            type="submit"
            className="rounded-full bg-primary-500 px-6 py-4 text-base font-semibold text-white shadow-sm hover:bg-primary-600"
          >
            Buscar pedido
          </button>
        </form>
      )}

      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-neutral-800">Pedidos de prueba</p>
          <p className="text-xs font-medium text-neutral-400">demo</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {mockOrders.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => navigate(`/pedidos/${o.token}`)}
              className="rounded-full bg-primary-100 px-4 py-2 text-xs font-bold tracking-widest text-neutral-700 transition-all duration-200 hover:bg-primary-200"
            >
              {o.token}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
