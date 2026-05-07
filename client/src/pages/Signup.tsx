import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarCheck,
  Check,
  FileStack,
  Library,
  MessageSquareText,
  Radar,
  ShieldCheck,
  Sparkles,
  Users2,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FullBleedShell } from '@/layouts/AppShell'
import { Button } from '@/components/ui'
import { BrandMark } from '@/components/Brand'
import { PhoneMockup } from '@/components/PhoneMockup'
import { COUNTRIES } from '@/lib/data'

const BENEFITS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Sparkles, title: 'Asistente AI 24h', desc: 'Resumen, brief y redacción institucional con un click' },
  { icon: Radar, title: 'Radar normativo regional', desc: 'Novedades por país y tema, filtradas por tus prioridades' },
  { icon: Library, title: 'Biblioteca UPM curada', desc: 'Memoria institucional con normativa oficial regional' },
  { icon: FileStack, title: 'Briefs y minutas', desc: 'Material de reunión listo para usar, exportable' },
  { icon: ShieldCheck, title: 'Fuentes verificables', desc: 'Cada respuesta indica si trabaja con respaldo UPM' },
  { icon: Users2, title: 'Espacio privado', desc: 'Carpetas, notas y agenda visibles solo para vos' },
]

const FAQ = [
  { q: '¿Quiénes pueden acceder?', a: 'Legisladores, autoridades parlamentarias y secretarías UPM acreditadas.' },
  { q: '¿Cómo se factura?', a: 'Mensualmente al método de pago elegido. Sin permanencia, cancelás cuando quieras.' },
  { q: '¿Mi información es privada?', a: 'Sí. Tu carpeta y conversaciones son privadas y no se comparten con otros usuarios.' },
]

export function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cargo, setCargo] = useState('Legislador')
  const [pais, setPais] = useState('UY')
  const [institucion, setInstitucion] = useState('')
  const [phone, setPhone] = useState('')
  const [accepted, setAccepted] = useState(true)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !institucion.trim() || !accepted) return
    sessionStorage.setItem(
      'upm.signup.draft',
      JSON.stringify({ name, email, cargo, pais, institucion, phone }),
    )
    navigate('/checkout')
  }

  return (
    <FullBleedShell>
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 lg:py-14">
        {/* Top brand */}
        <div className="absolute left-6 top-6 hidden items-center gap-2.5 lg:flex">
          <BrandMark size={36} />
          <div className="flex flex-col leading-tight text-white">
            <span className="text-[15px] font-bold tracking-tight">Asistente AI UPM</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
              Crear cuenta institucional
            </span>
          </div>
        </div>

        <div className="absolute right-6 top-6 hidden lg:block">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur transition hover:bg-white/15"
          >
            <ArrowLeft size={12} /> Ya tengo cuenta · Ingresar
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          {/* Hero pitch */}
          <div className="flex flex-col gap-6 text-white">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/85 ring-1 ring-white/20">
              <Zap size={12} /> Membresía institucional UPM
            </div>

            <h1 className="text-[40px] font-bold leading-[1.04] tracking-tight sm:text-[48px]">
              Una plataforma diseñada para que <span className="text-upm-200">legislar sea más rápido y con respaldo</span>.
            </h1>

            <p className="max-w-lg text-[15px] leading-relaxed text-white/80">
              El Asistente AI UPM convierte cada novedad en un brief listo para usar. Radar regional, biblioteca curada y respuestas con fuentes — todo desde un mismo espacio.
            </p>

            {/* Pricing card */}
            <div className="relative overflow-hidden rounded-3xl bg-white/5 p-6 ring-1 ring-white/15 backdrop-blur">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-upm-400/20 blur-3xl" />
              <div className="relative flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-upm-200">Plan UPM Premium</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-[44px] font-bold tracking-tight text-white">USD 100</span>
                      <span className="text-[13px] font-semibold text-white/70">/ mes</span>
                    </div>
                    <div className="mt-1 text-[12px] text-white/65">Sin permanencia · Cancelás cuando quieras</div>
                  </div>
                  <div className="rounded-full bg-success-bg/30 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-success">
                    7 días gratis
                  </div>
                </div>

                <ul className="grid gap-2 sm:grid-cols-2">
                  {BENEFITS.slice(0, 6).map(b => (
                    <li key={b.title} className="flex items-start gap-2 text-[12.5px] text-white/85">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-upm-200 text-upm-800">
                        <Check size={10} strokeWidth={3} />
                      </span>
                      <span>
                        <span className="font-semibold text-white">{b.title}.</span> {b.desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-white/60">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck size={13} className="text-upm-200" /> Acreditación UPM</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-upm-200" /> Datos privados</span>
              <span className="inline-flex items-center gap-1.5"><CalendarCheck size={13} className="text-upm-200" /> Sin permanencia</span>
            </div>

            {/* Phone mockup mobile only — esconde en mobile y muestra en lg para no romper */}
            <div className="hidden xl:flex">
              <PhoneMockup />
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={submit}
            className="glass-strong animate-fade-up flex flex-col gap-5 rounded-3xl p-6 ring-1 ring-white/40 sm:p-7"
          >
            <div className="flex items-center gap-3 lg:hidden">
              <BrandMark size={42} />
              <div>
                <div className="text-[15px] font-bold tracking-tight text-upm-800">Asistente AI UPM</div>
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-500">Crear cuenta</div>
              </div>
            </div>

            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-ink-900">Crear tu cuenta institucional</h2>
              <p className="mt-1 text-[13px] text-ink-500">
                Completá tus datos. En el siguiente paso confirmás la suscripción.
              </p>
            </div>

            <Field label="Nombre completo" required>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Dr. Martín Pereira"
                required
                className="w-full rounded-2xl bg-white px-4 py-3 text-[14.5px] ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
              />
            </Field>

            <Field label="Email institucional" required>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nombre@parlamento.gov"
                required
                className="w-full rounded-2xl bg-white px-4 py-3 text-[14.5px] ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cargo">
                <select
                  value={cargo}
                  onChange={e => setCargo(e.target.value)}
                  className="w-full appearance-none rounded-2xl bg-white px-4 py-3 text-[14.5px] ring-1 ring-ink-100 focus:outline-none focus:ring-2 focus:ring-upm-400"
                >
                  <option>Legislador</option>
                  <option>Senador</option>
                  <option>Diputado</option>
                  <option>Coordinador de foro</option>
                  <option>Secretaría UPM</option>
                  <option>Asesor parlamentario</option>
                </select>
              </Field>
              <Field label="País">
                <select
                  value={pais}
                  onChange={e => setPais(e.target.value)}
                  className="w-full appearance-none rounded-2xl bg-white px-4 py-3 text-[14.5px] ring-1 ring-ink-100 focus:outline-none focus:ring-2 focus:ring-upm-400"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Institución" required>
              <div className="relative">
                <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
                <input
                  value={institucion}
                  onChange={e => setInstitucion(e.target.value)}
                  placeholder="Cámara de Diputados / Senado / Comisión..."
                  required
                  className="w-full rounded-2xl bg-white py-3 pl-9 pr-4 text-[14.5px] ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
                />
              </div>
            </Field>

            <Field label="Teléfono (opcional)">
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+598 99 123 456"
                className="w-full rounded-2xl bg-white px-4 py-3 text-[14.5px] ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
              />
            </Field>

            <label className="flex items-start gap-2.5 rounded-2xl bg-upm-50/60 p-3 ring-1 ring-upm-100">
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-upm-600"
              />
              <span className="text-[12px] leading-relaxed text-ink-700">
                Acepto los <a href="#" className="font-semibold text-upm-700 hover:underline">Términos de servicio</a> y la <a href="#" className="font-semibold text-upm-700 hover:underline">Política de privacidad</a>.
                Mi cuenta queda vinculada a mi institución.
              </span>
            </label>

            <Button type="submit" size="lg" disabled={!name.trim() || !email.trim() || !institucion.trim() || !accepted} className="w-full">
              Continuar al pago <ArrowRight size={17} />
            </Button>

            <div className="flex items-center justify-center gap-2 text-[12px] text-ink-500 lg:hidden">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="font-semibold text-upm-700 hover:text-upm-800">
                Ingresar
              </Link>
            </div>
          </form>
        </div>

        {/* FAQ */}
        <div className="mt-10 grid gap-3 text-white/85 sm:grid-cols-3">
          {FAQ.map(f => (
            <div key={f.q} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur">
              <div className="flex items-start gap-2">
                <MessageSquareText size={14} className="mt-0.5 shrink-0 text-upm-200" />
                <div>
                  <div className="text-[13px] font-bold text-white">{f.q}</div>
                  <div className="mt-1 text-[12px] text-white/65">{f.a}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FullBleedShell>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}

