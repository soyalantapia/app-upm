import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight, Eye, EyeOff, FileStack, PlayCircle, Radar, ShieldCheck, Sparkles } from 'lucide-react'
import { FullBleedShell } from '@/layouts/AppShell'
import { Button } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useStore, store } from '@/lib/store'
import { DEMO_OPERATOR } from '@/lib/data'
import { BrandMark } from '@/components/Brand'
import { PhoneMockup } from '@/components/PhoneMockup'
import { CoverageProof } from '@/components/CoverageProof'

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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      // Ya onboarded → su deep-link o Home. Solo el usuario nuevo va a onboarding.
      navigate(onboarded ? (from || '/') : '/onboarding', { replace: true })
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
            ].map((item, i) => (
              <div
                key={item.title}
                className="animate-fade-up flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur"
                style={{ animationDelay: `${120 + i * 90}ms` }}
              >
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

          <CoverageProof className="animate-fade-up" />

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
          className="glass-strong animate-fade-up flex flex-col gap-4 rounded-3xl p-7 ring-1 ring-white/40"
        >
          <div className="flex items-center gap-3 lg:hidden">
            <BrandMark size={42} />
            <div>
              <div className="text-[15px] font-bold tracking-tight text-upm-800">Asistente AI UPM</div>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-500">Acceso institucional</div>
            </div>
          </div>

          {/* Cobertura "en vivo" para mobile (en desktop ya está en el pitch lateral) */}
          <CoverageProof tone="light" className="lg:hidden" />

          <div>
            <h2 className="text-[22px] font-bold tracking-tight text-ink-900">Conocé UPM por dentro</h2>
            <p className="mt-1 text-[13.5px] text-ink-500">
              Viví el recorrido completo en 2 minutos: alta, activación y tu Radar configurado. Sin tarjeta real.
            </p>
          </div>

          {/* PRIMARIO · arranca el circuito completo (reemplaza al viejo "Crear cuenta") */}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="lg"
              onClick={() => navigate('/registro')}
              disabled={loading}
              className="group relative w-full overflow-hidden before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-1/2 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:content-[''] motion-safe:before:animate-[shine-sweep_1.5s_ease-out_0.6s_both]"
            >
              <PlayCircle size={18} className="transition-transform duration-200 group-hover:scale-110" /> Vivir el recorrido completo
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-[10.5px] font-medium text-ink-400">
              <span className="inline-block motion-safe:animate-step-wave" style={{ animationDelay: '0s' }}>Alta</span>
              <ChevronRight size={10} className="text-ink-300" />
              <span className="inline-block motion-safe:animate-step-wave" style={{ animationDelay: '0.45s' }}>Pago demo</span>
              <ChevronRight size={10} className="text-ink-300" />
              <span className="inline-block motion-safe:animate-step-wave" style={{ animationDelay: '0.9s' }}>Activación</span>
              <ChevronRight size={10} className="text-ink-300" />
              <span className="inline-block motion-safe:animate-step-wave" style={{ animationDelay: '1.35s' }}>Onboarding</span>
              <ChevronRight size={10} className="text-ink-300" />
              <span className="inline-block font-bold text-upm-700 motion-safe:animate-step-wave" style={{ animationDelay: '1.8s' }}>Tu panel</span>
            </div>
          </div>

          {/* SECUNDARIO · saltar directo al producto */}
          <Button type="button" variant="ghost" size="md" onClick={onDemo} disabled={loading} className="w-full">
            o entrar directo a la demo
          </Button>

          {/* Acceso de miembros · login institucional compacto y secundario */}
          <div className="flex items-center gap-3 pt-1">
            <div className="h-px flex-1 bg-ink-100" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-300">¿Ya sos miembro?</span>
            <div className="h-px flex-1 bg-ink-100" />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-ink-500">Email institucional</span>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nombre@parlamento.gov"
              className="w-full rounded-2xl bg-white px-4 py-3 text-[15px] ring-1 ring-ink-100 shadow-card placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-ink-500">Contraseña</span>
              <a
                href="mailto:soporte@upm.org?subject=Recuperar%20acceso%20UPM&body=Hola%2C%20necesito%20recuperar%20el%20acceso%20a%20mi%20cuenta%20UPM."
                className="text-[11px] font-semibold text-upm-700 hover:text-upm-800"
              >
                Olvidé mi contraseña
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-2xl bg-white px-4 py-3 pr-11 text-[15px] ring-1 ring-ink-100 shadow-card focus:outline-none focus:ring-2 focus:ring-upm-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <span className="text-[11px] text-ink-400">Demo · ingresá cualquier credencial para continuar.</span>
          </label>

          <Button type="submit" variant="secondary" size="md" disabled={loading} className="w-full">
            {loading ? 'Verificando…' : (
              <>
                Ingresar con mi cuenta <ArrowRight size={16} />
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={() => store.pushToast('info', 'Tu solicitud fue registrada. La Secretaría UPM la revisará en 48hs.')}
            className="text-center text-[11.5px] font-semibold text-upm-700 hover:text-upm-800"
          >
            ¿Sos autoridad? Solicitar acceso institucional
          </button>
        </form>
      </div>
    </FullBleedShell>
  )
}
