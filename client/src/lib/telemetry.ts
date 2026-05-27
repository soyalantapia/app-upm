// telemetry · Abstracción mínima para reportar errores y eventos.
// Hoy: console + localStorage ring buffer (últimos 50 errors).
// Mañana: cambiar implementación a Sentry/Datadog sin tocar consumers.
//
// Uso:
//   import { reportError, trackEvent } from '@/lib/telemetry'
//   reportError(err, { context: 'NewsConversation' })
//   trackEvent('briefing_exported', { format: 'csv' })

type ErrorReport = {
  message: string
  stack?: string
  context?: string
  componentStack?: string
  timestamp: number
  url: string
  userAgent: string
}

type TrackEvent = {
  name: string
  props?: Record<string, unknown>
  timestamp: number
  url: string
}

const ERROR_KEY = 'upm.telemetry.errors'
const EVENT_KEY = 'upm.telemetry.events'
const MAX_BUFFER = 50

// Reporter pluggable · default = console + localStorage.
// Cuando exista Sentry: setReporter(reportToSentry)
type Reporter = {
  reportError: (report: ErrorReport) => void
  trackEvent: (event: TrackEvent) => void
}

const defaultReporter: Reporter = {
  reportError(report) {
    // eslint-disable-next-line no-console
    console.error('[telemetry:error]', report)
    try {
      const raw = window.localStorage.getItem(ERROR_KEY)
      const buf: ErrorReport[] = raw ? JSON.parse(raw) : []
      buf.push(report)
      if (buf.length > MAX_BUFFER) buf.splice(0, buf.length - MAX_BUFFER)
      window.localStorage.setItem(ERROR_KEY, JSON.stringify(buf))
    } catch { /* ignore */ }
  },
  trackEvent(event) {
    // eslint-disable-next-line no-console
    console.debug('[telemetry:event]', event.name, event.props ?? {})
    try {
      const raw = window.localStorage.getItem(EVENT_KEY)
      const buf: TrackEvent[] = raw ? JSON.parse(raw) : []
      buf.push(event)
      if (buf.length > MAX_BUFFER) buf.splice(0, buf.length - MAX_BUFFER)
      window.localStorage.setItem(EVENT_KEY, JSON.stringify(buf))
    } catch { /* ignore */ }
  },
}

let reporter: Reporter = defaultReporter

/**
 * Reemplaza el reporter activo (útil para Sentry/Datadog en producción).
 */
export function setReporter(custom: Reporter): void {
  reporter = custom
}

export function reportError(error: Error, opts?: { context?: string; componentStack?: string }): void {
  if (typeof window === 'undefined') return
  reporter.reportError({
    message: error.message,
    stack: error.stack,
    context: opts?.context,
    componentStack: opts?.componentStack,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: window.navigator.userAgent,
  })
}

export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  reporter.trackEvent({
    name,
    props,
    timestamp: Date.now(),
    url: window.location.href,
  })
}

/**
 * Lee el buffer de errores (para devtools / debug page).
 */
export function getErrorBuffer(): ErrorReport[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(ERROR_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Limpia el buffer de errores.
 */
export function clearErrorBuffer(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ERROR_KEY)
  } catch { /* ignore */ }
}
