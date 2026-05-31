import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { FullBleedShell } from '@/layouts/AppShell'
import { Button } from '@/components/ui'
import { COUNTRIES, countryByCode } from '@/lib/data'
import type { CountryCode } from '@/lib/types'

type Draft = {
  name: string
  email: string
  cargo: string
  pais: CountryCode
  institucion: string
  phone: string
}

function formatCard(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length < 3) return digits
  return digits.slice(0, 2) + '/' + digits.slice(2)
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [holder, setHolder] = useState('')
  // Modo demo · campos vacíos por default · usuario puede usar
  // "Rellenar con datos demo" si quiere ahorrarse tipear.
  const [card, setCard] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [billingCountry, setBillingCountry] = useState<CountryCode>('UY')
  const [processing, setProcessing] = useState(false)

  const isFormValid =
    holder.trim().length >= 3 &&
    card.replace(/\s/g, '').length === 16 &&
    expiry.length === 5 &&
    cvv.length >= 3

  useEffect(() => {
    const raw = sessionStorage.getItem('upm.signup.draft')
    if (!raw) {
      navigate('/registro', { replace: true })
      return
    }
    try {
      const parsed = JSON.parse(raw) as Draft
      setDraft(parsed)
      setHolder(parsed.name)
      setBillingCountry(parsed.pais)
    } catch {
      navigate('/registro', { replace: true })
    }
  }, [navigate])

  if (!draft) return null

  const doConfirm = () => {
    if (processing || !isFormValid) return
    setProcessing(true)
    sessionStorage.setItem(
      'upm.signup.completed',
      JSON.stringify({
        ...draft,
        plan: 'UPM Premium',
        amount: 100,
        currency: 'USD',
        activatedAt: new Date().toISOString(),
      }),
    )
    sessionStorage.removeItem('upm.signup.draft')
    navigate('/cuenta-activada', { replace: true })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    doConfirm()
  }

  const country = countryByCode(draft.pais)

  return (
    <FullBleedShell>
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-10 lg:py-14">
        <Link
          to="/registro"
          className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white/85 hover:text-white"
        >
          <ArrowLeft size={13} /> Volver a datos
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          {/* Form de pago */}
          <form
            onSubmit={submit}
            className="glass-strong animate-fade-up flex flex-col gap-5 rounded-3xl p-6 ring-1 ring-white/40 sm:p-8"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-upm-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-upm-700">
                  <Lock size={11} /> Pago seguro
                </div>
                <h2 className="mt-2 text-[22px] font-bold tracking-tight text-ink-900">Datos de pago</h2>
                <p className="mt-1 text-[13px] text-ink-500">
                  Tu primer cobro se realiza luego del período de prueba de 7 días.
                </p>
              </div>
              <CardBrandsRow />
            </div>

            <div className="rounded-2xl bg-info-bg/40 p-3 ring-1 ring-info-bg">
              <div className="flex items-start gap-2 text-[11.5px] leading-relaxed text-info-fg">
                <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span className="block font-bold">Modo demo · sin cargo real</span>
                  <span>
                    Este checkout simula el flujo de cobro. Ningún medio de pago real será debitado.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setHolder('Dr. Martín Pereira')
                      setCard('4242 4242 4242 4242')
                      setExpiry('12/28')
                      setCvv('123')
                    }}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10.5px] font-bold text-info-fg ring-1 ring-info-bg hover:bg-info-bg/60"
                  >
                    Rellenar con datos demo
                  </button>
                </div>
              </div>
            </div>

            <Field label="Titular de la tarjeta" required>
              <input
                value={holder}
                onChange={e => setHolder(e.target.value)}
                placeholder="Nombre como aparece en la tarjeta"
                required
                className="w-full rounded-2xl bg-white px-4 py-3 text-[14.5px] ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
              />
            </Field>

            <Field label="Número de tarjeta" required>
              <div className="relative">
                <CreditCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
                <input
                  value={card}
                  onChange={e => setCard(formatCard(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  required
                  className="w-full rounded-2xl bg-white py-3 pl-10 pr-4 text-[14.5px] tabular-nums ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
                />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Vencimiento (MM/AA)" required>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input
                    value={expiry}
                    onChange={e => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/AA"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    required
                    className="w-full rounded-2xl bg-white py-3 pl-9 pr-3 text-[14.5px] tabular-nums ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
                  />
                </div>
              </Field>
              <Field label="CVV" required>
                <div className="relative">
                  <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input
                    value={cvv}
                    onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    required
                    className="w-full rounded-2xl bg-white py-3 pl-9 pr-3 text-[14.5px] tabular-nums ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-upm-400"
                  />
                </div>
              </Field>
            </div>

            <Field label="País de facturación" required>
              <select
                value={billingCountry}
                onChange={e => setBillingCountry(e.target.value as CountryCode)}
                className="w-full appearance-none rounded-2xl bg-white px-4 py-3 text-[14.5px] ring-1 ring-ink-100 focus:outline-none focus:ring-2 focus:ring-upm-400"
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </Field>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/registro')}
                disabled={processing}
                className="shrink-0 rounded-2xl bg-white px-3.5 py-2.5 text-[12px] font-semibold text-danger-fg ring-1 ring-danger-bg transition hover:bg-danger-bg/40 disabled:opacity-50"
              >
                Cancelar
              </button>
              <Button type="submit" size="lg" disabled={processing || !isFormValid} className="flex-1">
                {processing ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-pulse-soft rounded-full bg-white/80" />
                    Procesando…
                  </>
                ) : (
                  <>
                    <Lock size={15} /> Empezar prueba gratis · luego USD 100/mes
                    <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-ink-500">
              <ShieldCheck size={11} /> Conexión cifrada · Sin permanencia · Cancelás cuando quieras
            </div>
          </form>

          {/* Resumen */}
          <aside className="flex flex-col gap-4 self-start">
            <div className="rounded-3xl bg-white/95 p-5 ring-1 ring-white/40 shadow-toast">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-upm-700">Resumen del pedido</div>

              <div className="mt-3 rounded-2xl bg-gradient-to-br from-upm-700 to-upm-900 p-4 text-white">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-upm-200">Plan</div>
                <div className="mt-0.5 text-[18px] font-bold tracking-tight">UPM Premium</div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-[28px] font-bold tracking-tight">USD 100</span>
                  <span className="text-[12px] text-white/70">/ mes</span>
                </div>
              </div>

              <ul className="mt-4 flex flex-col gap-2 text-[12.5px] text-ink-700">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-success" />
                  Asistente AI ilimitado
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-success" />
                  Radar normativo regional
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-success" />
                  Biblioteca y dossiers UPM
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-success" />
                  Memoria institucional reutilizable
                </li>
              </ul>

              <div className="mt-4 flex flex-col gap-1 border-t border-ink-100 pt-3 text-[12.5px]">
                <div className="flex justify-between">
                  <span className="text-ink-500">Subtotal</span>
                  <span className="font-semibold tabular-nums">USD 100,00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Período de prueba</span>
                  <span className="font-semibold text-success-fg">7 días</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between border-t border-ink-100 pt-2">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-700">Hoy pagás</span>
                  <span className="text-[20px] font-bold tabular-nums text-ink-900">USD 0</span>
                </div>
                <div className="text-[10.5px] text-ink-500">
                  El primer cobro de USD 100 se realizará el {new Date(Date.now() + 7 * 86400000).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}.
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white/95 p-5 ring-1 ring-white/40 shadow-toast">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-upm-700">Tu cuenta</div>
              <div className="mt-2 text-[14px] font-bold text-ink-900">{draft.name}</div>
              <div className="mt-0.5 text-[12px] text-ink-500">{draft.email}</div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full bg-upm-50 px-2 py-0.5 font-semibold text-upm-800">{draft.cargo}</span>
                <span className="rounded-full bg-upm-50 px-2 py-0.5 font-semibold text-upm-800">
                  {country.flag} {country.name}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-700">
                <BadgeCheck size={12} className="text-success" />
                {draft.institucion}
              </div>
              <Link
                to="/registro"
                className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-upm-700 hover:text-upm-800"
              >
                <Sparkles size={11} /> Editar datos
              </Link>
            </div>
          </aside>
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

function CardBrandsRow() {
  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <BrandPill label="VISA" />
      <BrandPill label="MC" />
      <BrandPill label="AMEX" />
    </div>
  )
}

function BrandPill({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold tracking-tight text-ink-700 ring-1 ring-ink-100">
      {label}
    </span>
  )
}
