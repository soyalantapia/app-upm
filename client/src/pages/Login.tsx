import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, FileStack, KeyRound, MailCheck, Radar, ShieldCheck, Sparkles } from 'lucide-react'
import { FullBleedShell } from '@/layouts/AppShell'
import { Button } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useStore, store } from '@/lib/store'
import type { Operator } from '@/lib/types'
import { BrandMark } from '@/components/Brand'
import { PhoneMockup } from '@/components/PhoneMockup'
import { CoverageProof } from '@/components/CoverageProof'

// Base del backend. Sin optional chaining (Vite solo estatiza el patrón exacto).
const API_BASE = (import.meta.env.VITE_UPM_API_URL ?? '').toString().replace(/\/$/, '')

export function LoginPage() {
  const { operator, signIn } = useAuth()
  const onboarded = useStore(s => s.onboarded)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
  const postAuthTarget = !onboarded ? '/onboarding' : from && from !== '/login' ? from : '/'

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (operator) navigate(postAuthTarget, { replace: true })
  }, [operator, postAuthTarget, navigate])

  if (operator) return <Navigate to={postAuthTarget} replace />

  async function requestCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!API_BASE) {
      setError('El servicio de acceso no está disponible en este momento.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      if (res.ok) {
        setStep('code')
        setTimeout(() => codeRef.current?.focus(), 60)
      } else if (res.status === 503) {
        setError('El acceso por email todavía no está habilitado. Escribinos a soporte@upm.org.')
      } else if (res.status === 429) {
        setError('Recién pediste un código. Esperá un minuto antes de reintentar.')
      } else {
        setError('No pudimos enviar el código. Revisá el email e intentá de nuevo.')
      }
    } catch {
      setError('Sin conexión con el servidor. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      })
      if (res.ok) {
        const json = (await res.json()) as { token: string; operator: Operator }
        signIn(json.operator, json.token)
        store.pushToast('success', 'Acceso verificado · Bienvenido a UPM')
        navigate(postAuthTarget, { replace: true })
        return
      }
      if (res.status === 401) setError('Código incorrecto. Revisalo e intentá de nuevo.')
      else if (res.status === 410) setError('El código venció. Pedí uno nuevo.')
      else if (res.status === 429) setError('Demasiados intentos. Pedí un código nuevo.')
      else setError('No pudimos verificar el código. Intentá de nuevo.')
    } catch {
      setError('Sin conexión con el servidor. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
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
              Radar normativo regional, biblioteca institucional y un asistente AI que convierte cada tema en un brief listo para usar, con fuentes verificables.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {[
              { icon: Radar, title: 'Radar normativo', desc: 'Por país, tema y tipo' },
              { icon: FileStack, title: 'Corpus real', desc: 'Normas oficiales scrapeadas' },
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
            Acceso institucional para miembros y autoridades autorizadas.
          </div>
        </div>

        {/* Phone mockup */}
        <div className="hidden lg:block">
          <PhoneMockup />
        </div>

        {/* Card login OTP */}
        <form
          onSubmit={step === 'email' ? requestCode : verify}
          className="glass-strong animate-fade-up flex flex-col gap-4 rounded-3xl p-7 ring-1 ring-white/40"
        >
          <div className="flex items-center gap-3">
            <BrandMark size={42} />
            <div>
              <div className="text-[15px] font-bold tracking-tight text-upm-800">Asistente AI UPM</div>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-500">Acceso institucional</div>
            </div>
          </div>

          <CoverageProof tone="light" className="lg:hidden" />

          {step === 'email' ? (
            <>
              <div>
                <h2 className="text-[22px] font-bold tracking-tight text-ink-900">Ingresá con tu email</h2>
                <p className="mt-1 text-[13.5px] text-ink-500">
                  Te enviamos un código de acceso de un solo uso. Sin contraseñas.
                </p>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-ink-500">Email institucional</span>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nombre@parlamento.gov"
                  className="w-full rounded-2xl bg-white px-4 py-3 text-[15px] ring-1 ring-ink-100 shadow-card placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-upm-400"
                />
              </label>
              {error && <p className="text-[12.5px] font-medium text-danger">{error}</p>}
              <Button type="submit" size="lg" disabled={loading} className="w-full">
                {loading ? 'Enviando código…' : (<><MailCheck size={17} /> Enviarme el código <ArrowRight size={16} /></>)}
              </Button>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-[22px] font-bold tracking-tight text-ink-900">Revisá tu email</h2>
                <p className="mt-1 text-[13.5px] text-ink-500">
                  Enviamos un código de 6 dígitos a <strong className="text-ink-700">{email}</strong>. Vence en 10 minutos.
                </p>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-ink-500">Código de acceso</span>
                <input
                  ref={codeRef}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full rounded-2xl bg-white px-4 py-3 text-center text-[24px] font-bold tracking-[10px] ring-1 ring-ink-100 shadow-card placeholder:tracking-normal placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
                />
              </label>
              {error && <p className="text-[12.5px] font-medium text-danger">{error}</p>}
              <Button type="submit" size="lg" disabled={loading || code.length !== 6} className="w-full">
                {loading ? 'Verificando…' : (<><KeyRound size={16} /> Ingresar</>)}
              </Button>
              <button
                type="button"
                onClick={() => { setStep('email'); setCode(''); setError(null) }}
                className="flex items-center justify-center gap-1 text-[12px] font-semibold text-upm-700 hover:text-upm-800"
              >
                <ArrowLeft size={13} /> Usar otro email o reenviar
              </button>
            </>
          )}

          <a
            href="mailto:soporte@upm.org?subject=Solicitar%20acceso%20UPM"
            className="text-center text-[11.5px] font-semibold text-upm-700 hover:text-upm-800"
          >
            ¿Sos autoridad y no tenés acceso? Solicitalo
          </a>
        </form>
      </div>
    </FullBleedShell>
  )
}
