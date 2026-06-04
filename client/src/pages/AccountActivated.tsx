import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, CheckCircle2, Mail, Sparkles } from 'lucide-react'
import { FullBleedShell } from '@/layouts/AppShell'
import { Button } from '@/components/ui'
import { FlowSteps } from '@/components/FlowSteps'
import { useAuth } from '@/lib/auth'
import { store } from '@/lib/store'
import { countryByCode } from '@/lib/data'
import type { CountryCode } from '@/lib/types'

type Completed = {
  name: string
  email: string
  cargo: string
  pais: CountryCode
  institucion: string
  amount: number
  currency: string
  plan: string
  activatedAt: string
}

export function AccountActivatedPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [data, setData] = useState<Completed | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('upm.signup.completed')
    if (!raw) {
      navigate('/registro', { replace: true })
      return
    }
    try {
      setData(JSON.parse(raw))
    } catch {
      navigate('/registro', { replace: true })
    }
  }, [navigate])

  if (!data) return null

  const country = countryByCode(data.pais)

  const enterApp = () => {
    signIn(data.email)
    store.setDefaults()
    store.pushNotification({
      type: 'sistema',
      title: 'Bienvenida a UPM Premium',
      description: `Tu suscripción está activa. Período gratuito hasta el ${new Date(Date.now() + 7 * 86400000).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}.`,
    })
    store.pushToast('success', '¡Listo! Bienvenido al ecosistema UPM')
    sessionStorage.removeItem('upm.signup.completed')
    navigate('/', { replace: true })
  }

  return (
    <FullBleedShell>
      <div className="relative z-10 mx-auto w-full max-w-xl px-4">
        <FlowSteps current="listo" className="mb-7" />
        <div className="glass-strong animate-fade-up relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl p-7 ring-1 ring-white/40 sm:p-9 text-center">
          <Confetti />
          {/* Badge con pop elástico + anillos concéntricos (motion-safe) */}
          <div className="relative motion-safe:animate-badge-pop">
            <span aria-hidden className="absolute inset-0 rounded-3xl bg-success/30 motion-safe:animate-ring-expand" />
            <span aria-hidden className="absolute inset-0 rounded-3xl bg-success/20 motion-safe:animate-ring-expand" style={{ animationDelay: '0.6s' }} />
            <div className="relative grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-success to-emerald-700 text-white shadow-floating">
              <CheckCircle2 size={32} strokeWidth={2.4} />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-success-fg">
            <BadgeCheck size={11} /> Suscripción activa
          </div>

          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink-900 sm:text-[32px]">
              ¡Bienvenido, {data.name.split(' ').slice(-1)[0]}!
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">
              Tu cuenta institucional UPM está activa. El primer cobro de USD {data.amount} se realizará el{' '}
              <span className="font-semibold text-ink-900 tabular-nums">
                {new Date(Date.now() + 7 * 86400000).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>.
            </p>
          </div>

          <div className="grid w-full gap-2 rounded-2xl bg-white p-4 ring-1 ring-ink-100 text-left">
            <Row label="Cuenta" value={data.email} />
            <Row label="Plan" value={`${data.plan} · USD ${data.amount}/mes`} />
            <Row label="Institución" value={data.institucion} />
            <Row label="País" value={`${country.flag} ${country.name}`} />
            <Row label="Cargo" value={data.cargo} />
          </div>

          <div className="flex w-full items-start gap-2 rounded-2xl bg-info-bg/50 p-3 ring-1 ring-info-bg text-left">
            <Mail size={14} className="mt-0.5 shrink-0 text-info-fg" />
            <span className="text-[12px] leading-relaxed text-info-fg">
              Te enviamos un email a <span className="font-semibold">{data.email}</span> con el comprobante y los próximos pasos.
            </span>
          </div>

          <div className="flex w-full flex-col gap-2">
            <Button size="lg" onClick={enterApp} className="w-full">
              <Sparkles size={15} /> Empezar a usar UPM
              <ArrowRight size={15} />
            </Button>
            <Link
              to="/login"
              className="text-center text-[12px] font-semibold text-ink-500 hover:text-upm-700"
            >
              Ir a inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </FullBleedShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">{label}</span>
      <span className="truncate font-semibold text-ink-900">{value}</span>
    </div>
  )
}

// Confetti de celebración · una sola caída que se desvanece (~1.5s).
// Posiciones/colores fijos (determinista) y oculto en prefers-reduced-motion.
const CONFETTI: { left: string; bg: string; delay: number; w: number; h: number; r: string }[] = [
  { left: '6%', bg: '#2f6fed', delay: 0.0, w: 7, h: 11, r: '2px' },
  { left: '15%', bg: '#34d399', delay: 0.18, w: 9, h: 9, r: '9999px' },
  { left: '24%', bg: '#fbbf24', delay: 0.05, w: 7, h: 10, r: '2px' },
  { left: '33%', bg: '#f472b6', delay: 0.3, w: 8, h: 8, r: '9999px' },
  { left: '42%', bg: '#a78bfa', delay: 0.12, w: 6, h: 11, r: '2px' },
  { left: '50%', bg: '#34d399', delay: 0.42, w: 9, h: 9, r: '9999px' },
  { left: '58%', bg: '#2f6fed', delay: 0.22, w: 7, h: 10, r: '2px' },
  { left: '67%', bg: '#fbbf24', delay: 0.36, w: 8, h: 8, r: '9999px' },
  { left: '76%', bg: '#f472b6', delay: 0.08, w: 6, h: 11, r: '2px' },
  { left: '85%', bg: '#a78bfa', delay: 0.28, w: 9, h: 9, r: '9999px' },
  { left: '93%', bg: '#2f6fed', delay: 0.15, w: 7, h: 10, r: '2px' },
  { left: '38%', bg: '#fbbf24', delay: 0.5, w: 6, h: 9, r: '9999px' },
  { left: '62%', bg: '#34d399', delay: 0.55, w: 7, h: 10, r: '2px' },
  { left: '20%', bg: '#a78bfa', delay: 0.46, w: 8, h: 8, r: '9999px' },
]

function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="absolute top-0 motion-safe:animate-confetti"
          style={{
            left: c.left,
            width: c.w,
            height: c.h,
            backgroundColor: c.bg,
            borderRadius: c.r,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
