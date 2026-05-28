import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, X, Sparkles, Radar, Calendar } from 'lucide-react'

// HomeTour · tour de bienvenida de 3 tooltips después del primer login.
// Solo aparece si nunca se cerró antes (localStorage flag).
// Diseño no-intrusivo: chip flotante "¿Te oriento?" abre el tour.

const STORAGE_KEY = 'upm.home-tour.dismissed'

type Step = {
  icon: React.ComponentType<{ size?: number }>
  title: string
  body: string
  cta?: string
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'Bienvenido a UPM',
    body: 'Es tu dashboard para ver qué pasó importante hoy. Las 3 cards de arriba responden: ¿qué alta relevancia?, ¿qué se vota?, ¿qué audiencias hay próximas?',
    cta: 'Mostrame el Radar',
  },
  {
    icon: Radar,
    title: 'Radar en vivo',
    body: 'El Radar trae normativa de 47 fuentes oficiales del MERCOSUR. Usá "Mi comisión" para ver solo lo de tu tema, o tipeá un número de ley en el search.',
    cta: 'Ver agenda',
  },
  {
    icon: Calendar,
    title: 'Agenda y briefings',
    body: 'La Agenda MERCOSUR mezcla eventos institucionales con convocatorias detectadas del feed. Para sesiones, tocá "Pre-sesión" abajo y armás un briefing en 30 segundos.',
    cta: 'Empezar a usar',
  },
]

export function HomeTour() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  // Lazy init · evita setState in effect (react-hooks/purity)
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return true
    }
  })

  const persistDismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch { /* ignore */ }
    setDismissed(true)
    setOpen(false)
  }

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1)
    else persistDismiss()
  }

  if (dismissed) return null

  // Chip cerrado · invita a abrir el tour
  if (!open) {
    return createPortal(
      <div className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 md:bottom-6 md:left-6 md:translate-x-0">
        <div className="flex items-center gap-1 rounded-full bg-upm-700 px-1 py-1 shadow-floating ring-1 ring-upm-800">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold text-white hover:bg-upm-800"
          >
            <Sparkles size={12} /> ¿Primera vez? Te oriento en 30s
          </button>
          <button
            onClick={persistDismiss}
            aria-label="No mostrar más"
            className="rounded-full p-1.5 text-white/70 hover:bg-upm-800 hover:text-white"
            title="No mostrar más"
          >
            <X size={12} />
          </button>
        </div>
      </div>,
      document.body,
    )
  }

  // Modal del tour
  const current = STEPS[step]
  const Icon = current.icon
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Tour de bienvenida" className="fixed inset-0 z-[80]">
      <button
        aria-label="Cerrar tour"
        onClick={persistDismiss}
        className="animate-fade-in absolute inset-0 bg-upm-900/65 backdrop-blur"
      />
      <div className="animate-fade-up absolute inset-x-4 bottom-20 mx-auto max-w-md rounded-3xl bg-white p-5 shadow-floating ring-1 ring-ink-100 md:bottom-1/2 md:translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2">
        {/* Progreso */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={
                'h-1 flex-1 rounded-full transition ' +
                (i === step ? 'bg-upm-600' : i < step ? 'bg-upm-300' : 'bg-ink-100')
              }
            />
          ))}
        </div>

        <div className="mt-4 flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-upm-50 text-upm-700">
            <Icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-bold leading-snug text-ink-900">{current.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{current.body}</p>
          </div>
          <button
            onClick={persistDismiss}
            aria-label="Saltar tour"
            className="rounded-full p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
            title="Saltar"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
            Paso {step + 1} de {STEPS.length}
          </span>
          <button
            onClick={next}
            className="inline-flex items-center gap-1.5 rounded-full bg-upm-700 px-4 py-2 text-[12.5px] font-bold text-white shadow-cta hover:bg-upm-800"
          >
            {current.cta ?? 'Siguiente'} <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
