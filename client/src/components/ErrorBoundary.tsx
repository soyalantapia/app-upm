import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

// ErrorBoundary · React class component que captura errores de cualquier
// componente hijo y muestra un fallback amigable en lugar de la blank
// screen. Loguea a console (en prod podría loguear a Sentry).

type Props = {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

type State = {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // En prod esto iría a Sentry / Datadog
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }
      return <DefaultErrorFallback error={this.state.error} onReset={this.reset} />
    }
    return this.props.children
  }
}

function DefaultErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-danger-bg text-danger-fg">
        <AlertTriangle size={22} />
      </div>
      <div>
        <h2 className="text-[18px] font-bold text-ink-900">Algo salió mal</h2>
        <p className="mt-1 text-[13px] text-ink-500">
          Ocurrió un error inesperado. Podés intentar de nuevo o recargar la página.
        </p>
        <details className="mt-3 text-left text-[11px] text-ink-500">
          <summary className="cursor-pointer font-bold">Detalles técnicos</summary>
          <pre className="mt-1 overflow-x-auto rounded-lg bg-ink-50 p-2 text-[10.5px] text-ink-700">
            {error.message}
          </pre>
        </details>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-ink-700 ring-1 ring-ink-100 shadow-card hover:bg-ink-50"
        >
          <RefreshCw size={13} /> Reintentar
        </button>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 rounded-full bg-upm-700 px-4 py-2 text-[13px] font-bold text-white shadow-cta hover:bg-upm-800"
        >
          Recargar app
        </button>
      </div>
    </div>
  )
}
