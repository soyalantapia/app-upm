import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BellRing, CalendarCheck, ChevronLeft, MapPin, Sparkles, Tag } from 'lucide-react'
import { FullBleedShell } from '@/layouts/AppShell'
import { Button, Chip } from '@/components/ui'
import { COUNTRIES, TOPICS } from '@/lib/data'
import type { CountryCode, Frequency, Topic } from '@/lib/types'
import { store } from '@/lib/store'
import { useAuth } from '@/lib/auth'

const FREQS: { id: Frequency; label: string; desc: string; icon: typeof BellRing }[] = [
  { id: 'diario', label: 'Diario', desc: 'Resumen al inicio del día', icon: CalendarCheck },
  { id: 'semanal', label: 'Semanal', desc: 'Cada lunes a la mañana', icon: CalendarCheck },
  { id: 'alertas', label: 'Solo alertas', desc: 'Cuando algo sea muy relevante', icon: BellRing },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const { operator } = useAuth()
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [countries, setCountries] = useState<CountryCode[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [frequency, setFrequency] = useState<Frequency>('diario')

  const toggleCountry = (c: CountryCode) =>
    setCountries(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]))
  const toggleTopic = (t: Topic) =>
    setTopics(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]))

  const finish = () => {
    store.setPrefs({ countries, topics, frequency, language: 'es', notifications: true })
    store.pushToast('success', 'Tu Radar UPM está configurado')
    navigate('/', { replace: true })
  }

  // Skip · setea defaults razonables y va al Home. El usuario puede ajustar
  // después en /perfil.
  const skip = () => {
    store.setDefaults()
    store.pushToast('info', 'Configuramos defaults · podés ajustar en Perfil')
    navigate('/', { replace: true })
  }

  const stepInfo = [
    { eyebrow: 'Paso 1 de 3', title: 'Países que querés seguir', desc: 'Tus prioridades regionales filtran el Radar y la Biblioteca UPM.' },
    { eyebrow: 'Paso 2 de 3', title: 'Temas que te importan', desc: 'Seleccioná los ejes que querés ver primero.' },
    { eyebrow: 'Paso 3 de 3', title: 'Frecuencia de actualización', desc: 'Decidí cuándo querés que el Radar te avise.' },
  ][step]

  return (
    <FullBleedShell>
      <div className="glass-strong animate-fade-up flex w-full max-w-2xl flex-col gap-6 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-upm-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-upm-700">
            <Sparkles size={12} /> {stepInfo.eyebrow}
          </div>
          {step > 0 && (
            <button
              onClick={() => setStep(prev => (prev - 1) as 0 | 1)}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold text-ink-500 hover:bg-ink-50 hover:text-ink-900"
            >
              <ChevronLeft size={14} /> Atrás
            </button>
          )}
        </div>

        <div>
          <h2 className="text-[26px] font-bold tracking-tight text-ink-900">{stepInfo.title}</h2>
          <p className="mt-1 text-[14px] text-ink-500">
            {operator ? `Hola ${operator.name}. ` : ''}
            {stepInfo.desc}
          </p>
        </div>

        {step === 0 && (
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map(c => (
              <Chip key={c.code} active={countries.includes(c.code)} onClick={() => toggleCountry(c.code)}>
                <span aria-hidden>{c.flag}</span>
                {c.name}
              </Chip>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {TOPICS.map(t => (
                <Chip key={t.id} active={topics.includes(t.id)} onClick={() => toggleTopic(t.id)}>
                  <Tag size={11} />
                  {t.label}
                </Chip>
              ))}
            </div>
            {topics.length === 0 && (
              <p className="text-[11.5px] text-ink-500">
                Seleccioná al menos un tema para continuar.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-2.5">
            {FREQS.map(f => {
              const active = frequency === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFrequency(f.id)}
                  className={
                    'flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200 ' +
                    (active
                      ? 'border-upm-500 bg-upm-50 ring-1 ring-upm-200 shadow-card'
                      : 'border-transparent bg-white ring-1 ring-ink-100 hover:border-upm-200 hover:bg-upm-50/50')
                  }
                >
                  <div className={'grid h-10 w-10 place-items-center rounded-xl ' + (active ? 'bg-upm-500 text-white' : 'bg-upm-50 text-upm-600')}>
                    <f.icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] font-bold text-ink-900">{f.label}</div>
                    <div className="text-[12.5px] text-ink-500">{f.desc}</div>
                  </div>
                  <span className={'h-4 w-4 rounded-full border-2 ' + (active ? 'border-upm-500 bg-upm-500' : 'border-ink-200')} />
                </button>
              )
            })}
          </div>
        )}

        {/* Resumen */}
        <div className="rounded-2xl bg-upm-50/60 p-4 ring-1 ring-upm-100">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">Tu configuración</div>
          <div className="mt-2 grid grid-cols-3 gap-3 text-[12.5px]">
            <div>
              <div className="flex items-center gap-1 text-ink-500"><MapPin size={11} /> Países</div>
              <div className="mt-0.5 font-semibold text-ink-900 tabular-nums">{countries.length}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-ink-500"><Tag size={11} /> Temas</div>
              <div className="mt-0.5 font-semibold text-ink-900 tabular-nums">{topics.length}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-ink-500"><CalendarCheck size={11} /> Frecuencia</div>
              <div className="mt-0.5 font-semibold capitalize text-ink-900">{frequency}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={skip}
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-500 underline-offset-2 hover:text-upm-700 hover:underline"
          >
            Saltar por ahora
          </button>
          {step < 2 ? (
            <Button
              size="lg"
              onClick={() => setStep(prev => (prev + 1) as 1 | 2)}
              disabled={(step === 0 && !countries.length) || (step === 1 && !topics.length)}
            >
              Siguiente <ArrowRight size={17} />
            </Button>
          ) : (
            <Button size="lg" onClick={finish}>
              Configurar mi Radar <ArrowRight size={17} />
            </Button>
          )}
        </div>
      </div>
    </FullBleedShell>
  )
}
