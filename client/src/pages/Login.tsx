import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Lock, Sparkles, ShieldCheck, Radar, FileStack, UserPlus } from 'lucide-react'
import { FullBleedShell } from '@/layouts/AppShell'
import { Button } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useStore, store } from '@/lib/store'
import { DEMO_OPERATOR } from '@/lib/data'
import { BrandMark } from '@/components/Brand'
import { PhoneMockup } from '@/components/PhoneMockup'

export function LoginPage() {
  const { operator, signIn } = useAuth()
  const onboarded = useStore(s => s.onboarded)
  const navigate = useNavigate()
  const location = useLocation()
  // Deep-link preservation · si llegaste acá por RequireAuth, location.state.from
  // tiene la ruta original. Post-signin, volvemos ahí (no a Home plano).
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
  const postAuthTarget = (() => {
    // Si tiene onboarding pendiente, primero forzamos onboarding
    if (!onboarded) return '/onboarding'
    return from && from !== '/login' ? from : '/'
  })()
  const [email, setEmail] = useState('martin.pereira@upm.org')
  const [password, setPassword] = useState('demo-upm-2026')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (operator) {
      navigate(postAuthTarget, { replace: true })
    }
  }, [operator, postAuthTarget, navigate])

  if (operator) return <Navigate to={postAuthTarget} replace />

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      signIn(email)
      store.pushToast('success', 'Bienvenido al ecosistema UPM')
      // Si ya estaba onboarded de antes (deep-link), respetamos from; sino → onboarding
      navigate(onboarded && from ? from : '/onboarding', { replace: true })
    }, 650)
  }

  const onDemo = () => {
    setLoading(true)
    setTimeout(() => {
      signIn(DEMO_OPERATOR.email)
      store.setDefaults()
      store.pushToast('info', 'Sesión demo iniciada como Dr. Martín Pereira')
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    }, 400)
  }

  return (
    <FullBleedShell>
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)_minmax(0,400px)] lg:items-center">
        {/* Pitch lateral (desktop) */}
        <div className="hidden flex-col gap-7 text-white lg:flex">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80 ring-1 ring-white/20">
              <Sparkles size={13} /> Asesor AI 24 horas
            </div>
            <h1 className="text-[40px] font-bold leading-[1.05] tracking-tight">
              Una plataforma que <span className="text-upm-200">informa, ordena y prepara</span> el trabajo del legislador.
            </h1>
            <p className="max-w-md text-[14.5px] leading-relaxed text-white/75">
              Radar normativo regional, biblioteca institucional UPM y un asistente AI que convierte cada tema en un brief listo para usar, con fuentes verificables.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {[
              { icon: Radar, title: 'Radar normativo', desc: 'Por país, tema y tipo' },
              { icon: FileStack, title: 'Biblioteca UPM', desc: 'Memoria institucional' },
              { icon: ShieldCheck, title: 'Con respaldo', desc: 'Fuentes verificables' },
            ].map(item => (
              <div key={item.title} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-upm-200 ring-1 ring-white/15">
                  <item.icon size={16} />
                </div>
                <div>
                  <div className="text-[13px] font-bold">{item.title}</div>
                  <div className="text-[11.5px] text-white/65">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-[12px] text-white/55">
            Ecosistema cerrado · UPM. Acceso institucional para miembros y autoridades autorizadas.
          </div>
        </div>

        {/* Phone mockup */}
        <div className="hidden lg:block">
          <PhoneMockup />
        </div>

        {/* Card login */}
        <form
          onSubmit={onSubmit}
          className="glass-strong animate-fade-up flex flex-col gap-5 rounded-3xl p-7 ring-1 ring-white/40"
        >
          <div className="flex items-center gap-3 lg:hidden">
            <BrandMark size={42} />
            <div>
              <div className="text-[15px] font-bold tracking-tight text-upm-800">Asistente AI UPM</div>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-500">Acceso institucional</div>
            </div>
          </div>

          <div>
            <h2 className="text-[22px] font-bold tracking-tight text-ink-900">Acceso al ecosistema</h2>
            <p className="mt-1 text-[13.5px] text-ink-500">
              Asesor AI para legisladores, con radar normativo y fuentes verificables.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-ink-500">Email institucional</span>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-2xl bg-white px-4 py-3 text-[15px] ring-1 ring-ink-100 shadow-card focus:outline-none focus:ring-2 focus:ring-upm-400"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-ink-500">Contraseña</span>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-2xl bg-white px-4 py-3 pr-10 text-[15px] ring-1 ring-ink-100 shadow-card focus:outline-none focus:ring-2 focus:ring-upm-400"
              />
              <Lock size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
            </div>
          </label>

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? 'Verificando…' : (
              <>
                Ingresar <ArrowRight size={17} />
              </>
            )}
          </Button>

          <Link
            to="/registro"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-upm-800 ring-2 ring-upm-200 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-upm-50 hover:ring-upm-400 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98]"
          >
            <UserPlus size={17} /> Crear cuenta
          </Link>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-ink-100" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-300">o</span>
            <div className="h-px flex-1 bg-ink-100" />
          </div>

          <Button type="button" variant="ghost" size="md" onClick={onDemo} disabled={loading} className="w-full">
            Entrar con cuenta demo
          </Button>

          <div className="flex flex-col gap-1.5 text-center text-[11.5px] text-ink-500">
            <span>Acceso exclusivo para miembros y autoridades autorizadas.</span>
            <button
              type="button"
              onClick={() => store.pushToast('info', 'Tu solicitud fue registrada. La Secretaría UPM la revisará en 48hs.')}
              className="font-semibold text-upm-700 hover:text-upm-800"
            >
              ¿Sos autoridad? Solicitar acceso institucional
            </button>
          </div>
        </form>
      </div>
    </FullBleedShell>
  )
}
