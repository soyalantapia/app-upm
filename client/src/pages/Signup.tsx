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
  Radar,
  ShieldCheck,
  Sparkles,
  Users2,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FullBleedShell } from '@/layouts/AppShell'
import { Button } from '@/components/ui'
import { COUNTRIES } from '@/lib/data'

const BENEFITS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Sparkles, title: 'Asistente AI 24h', desc: 'Resumen, brief y redacción institucional' },
  { icon: Radar, title: 'Radar normativo', desc: 'Novedades por país y tema' },
  { icon: Library, title: 'Biblioteca UPM', desc: 'Memoria institucional curada' },
  { icon: FileStack, title: 'Briefs y minutas', desc: 'Material reusable y exportable' },
  { icon: ShieldCheck, title: 'Con respaldo', desc: 'Fuentes verificables UPM' },
  { icon: Users2, title: 'Privado', desc: 'Carpetas y notas solo para vos' },
]

const FAQ = [
  { q: '¿Quiénes pueden acceder?', a: 'Legisladores, autoridades y secretarías UPM acreditadas.' },
  { q: '¿Cómo se factura?', a: 'Mensual, sin permanencia. Cancelás cuando quieras.' },
  { q: '¿Mi información es privada?', a: 'Sí, tu carpeta y conversaciones son privadas.' },
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
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:py-10 lg:py-14">
        {/* Botón Ingresar flotante arriba derecha (desktop). El brand viene del FullBleedShell. */}
        <Link
          to="/login"
          className="absolute right-4 top-6 z-20 inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[11.5px] font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur transition hover:bg-white/15 lg:right-6"
        >
          <ArrowLeft size={11} /> Ingresar
        </Link>

        <div className="grid gap-6 pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start lg:gap-8 lg:pt-0">
          {/* Pitch — visible mobile y desktop, layout adaptativo */}
          <div className="flex flex-col gap-5 text-white">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/85 ring-1 ring-white/20">
              <Zap size={11} /> Membresía institucional UPM
            </div>

            <h1 className="text-[28px] font-bold leading-[1.1] tracking-tight sm:text-[36px] lg:text-[42px] lg:leading-[1.05]">
              La plataforma para que legislar sea{' '}
              <span className="text-upm-200">más rápido y con respaldo</span>.
            </h1>

            <p className="max-w-md text-[14px] leading-relaxed text-white/75 sm:text-[15px]">
              Asistente AI institucional, radar normativo regional y biblioteca UPM curada, todo desde un mismo espacio.
            </p>

            {/* Pricing card mobile-friendly */}
            <div className="relative overflow-hidden rounded-3xl bg-white/5 p-5 ring-1 ring-white/15 backdrop-blur sm:p-6">
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-upm-400/20 blur-3xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-upm-200">
                    Plan UPM Premium
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-[36px] font-bold leading-none tracking-tight text-white sm:text-[42px]">
                      USD&nbsp;100
                    </span>
                    <span className="text-[12px] font-semibold text-white/70">/mes</span>
                  </div>
                  <div className="mt-1 text-[11.5px] text-white/65">
                    Sin permanencia · Cancelás cuando quieras
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-success-bg/30 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-success">
                  7 días gratis
                </div>
              </div>

              <ul className="relative mt-4 grid gap-1.5 sm:grid-cols-2">
                {BENEFITS.map(b => (
                  <li key={b.title} className="flex items-start gap-1.5 text-[12px] text-white/85">
                    <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-upm-200 text-upm-800">
                      <Check size={9} strokeWidth={3} />
                    </span>
                    <span className="min-w-0">
                      <span className="font-semibold text-white">{b.title}.</span>{' '}
                      <span className="text-white/65">{b.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hidden flex-wrap items-center gap-3 text-[11px] text-white/60 sm:flex">
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck size={12} className="text-upm-200" /> Acreditación UPM
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-upm-200" /> Datos privados
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarCheck size={12} className="text-upm-200" /> Sin permanencia
              </span>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={submit}
            className="glass-strong animate-fade-up flex flex-col gap-4 rounded-3xl p-5 ring-1 ring-white/40 sm:p-6"
          >
            <div>
              <h2 className="text-[20px] font-bold tracking-tight text-ink-900 sm:text-[22px]">
                Crear tu cuenta institucional
              </h2>
              <p className="mt-1 text-[12.5px] text-ink-500">
                Completá tus datos. En el siguiente paso confirmás la suscripción.
              </p>
            </div>

            <Field label="Nombre completo" required>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Dr. Martín Pereira"
                required
                className="w-full rounded-2xl bg-white px-4 py-2.5 text-[14px] ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
              />
            </Field>

            <Field label="Email institucional" required>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nombre@parlamento.gov"
                required
                className="w-full rounded-2xl bg-white px-4 py-2.5 text-[14px] ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cargo">
                <select
                  value={cargo}
                  onChange={e => setCargo(e.target.value)}
                  className="w-full appearance-none rounded-2xl bg-white px-4 py-2.5 text-[14px] ring-1 ring-ink-100 focus:outline-none focus:ring-2 focus:ring-upm-400"
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
                  className="w-full appearance-none rounded-2xl bg-white px-4 py-2.5 text-[14px] ring-1 ring-ink-100 focus:outline-none focus:ring-2 focus:ring-upm-400"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Institución" required>
              <div className="relative">
                <Building2 size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
                <input
                  value={institucion}
                  onChange={e => setInstitucion(e.target.value)}
                  placeholder="Cámara de Diputados / Senado..."
                  required
                  className="w-full rounded-2xl bg-white py-2.5 pl-9 pr-4 text-[14px] ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
                />
              </div>
            </Field>

            <Field label="Teléfono (opcional)">
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+598 99 123 456"
                className="w-full rounded-2xl bg-white px-4 py-2.5 text-[14px] ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
              />
            </Field>

            <label className="flex items-start gap-2 rounded-2xl bg-upm-50/60 p-2.5 ring-1 ring-upm-100">
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-upm-600"
              />
              <span className="text-[11.5px] leading-relaxed text-ink-700">
                Acepto los{' '}
                <a href="#" className="font-semibold text-upm-700 hover:underline">
                  Términos
                </a>{' '}
                y la{' '}
                <a href="#" className="font-semibold text-upm-700 hover:underline">
                  Privacidad
                </a>
                . Mi cuenta queda vinculada a mi institución.
              </span>
            </label>

            <Button
              type="submit"
              size="lg"
              disabled={!name.trim() || !email.trim() || !institucion.trim() || !accepted}
              className="w-full"
            >
              Continuar al pago <ArrowRight size={16} />
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-[11.5px] text-ink-500">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="font-semibold text-upm-700 hover:text-upm-800">
                Ingresar
              </Link>
            </div>
          </form>
        </div>

        {/* FAQ */}
        <div className="mt-8 grid gap-2.5 text-white/85 sm:grid-cols-3 sm:gap-3">
          {FAQ.map(f => (
            <div key={f.q} className="rounded-2xl bg-white/5 p-3.5 ring-1 ring-white/10 backdrop-blur">
              <div className="text-[12px] font-bold text-white">{f.q}</div>
              <div className="mt-1 text-[11.5px] text-white/65">{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </FullBleedShell>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}
