import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, CheckCircle2, Mail, Sparkles } from 'lucide-react'
import { FullBleedShell } from '@/layouts/AppShell'
import { Button } from '@/components/ui'
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
        <div className="glass-strong animate-fade-up flex flex-col items-center gap-5 rounded-3xl p-7 ring-1 ring-white/40 sm:p-9 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-success to-emerald-700 text-white shadow-floating">
            <CheckCircle2 size={32} strokeWidth={2.4} />
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
