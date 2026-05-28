import { useState, useEffect, type FormEvent } from 'react'
import { BellRing, CalendarCheck, MapPin, Tag, Check } from 'lucide-react'
import { Chip } from '@/components/ui'
import { Drawer } from '@/components/Drawer'
import { COUNTRIES, TOPICS } from '@/lib/data'
import { store, useStore } from '@/lib/store'
import type { CountryCode, Frequency, Topic } from '@/lib/types'

// PreferencesDrawer · edición inline de preferencias del Radar sin salir del Perfil.
// Reemplaza la redirección a /onboarding para usuarios que ya completaron el setup.

const FREQS: { id: Frequency; label: string; desc: string }[] = [
  { id: 'diario', label: 'Diario', desc: 'Resumen al inicio del día' },
  { id: 'semanal', label: 'Semanal', desc: 'Cada lunes a la mañana' },
  { id: 'alertas', label: 'Solo alertas', desc: 'Solo cuando algo sea urgente' },
]

export function PreferencesDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const prefs = useStore(s => s.prefs)

  const [countries, setCountries] = useState<CountryCode[]>(prefs?.countries ?? ['AR', 'BR', 'UY'])
  const [topics, setTopics] = useState<Topic[]>(prefs?.topics ?? [])
  const [frequency, setFrequency] = useState<Frequency>(prefs?.frequency ?? 'diario')

  const toggleCountry = (c: CountryCode) =>
    setCountries(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]))

  const toggleTopic = (t: Topic) =>
    setTopics(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]))

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    const hasChanges =
      JSON.stringify([...countries].sort()) !== JSON.stringify([...(prefs?.countries ?? [])].sort()) ||
      JSON.stringify([...topics].sort()) !== JSON.stringify([...(prefs?.topics ?? [])].sort()) ||
      frequency !== (prefs?.frequency ?? 'diario')
    store.setPrefs({ countries, topics, frequency, language: prefs?.language ?? 'es', notifications: prefs?.notifications ?? true })
    if (hasChanges) {
      store.pushToast('success', 'Preferencias actualizadas · el Radar ya las aplica')
    } else {
      store.pushToast('info', 'Sin cambios · todo sigue igual')
    }
    onClose()
  }

  // Sincronizar con prefs actuales cada vez que el drawer se abre
  useEffect(() => {
    if (!open) return
    setCountries(prefs?.countries ?? ['AR', 'BR', 'UY'])
    setTopics(prefs?.topics ?? [])
    setFrequency(prefs?.frequency ?? 'diario')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={<span className="flex items-center gap-2"><MapPin size={15} className="text-upm-600" /> Preferencias del Radar</span>}
      description="Ajustá países, temas y frecuencia. El Radar y Mi comisión usan esta configuración."
      width="md"
    >
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {/* Países */}
        <section>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">
            <MapPin size={11} /> Países seguidos
            <span className="ml-1 rounded-full bg-upm-100 px-1.5 py-0.5 text-[10px] font-bold text-upm-700">{countries.length}</span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {COUNTRIES.map(c => (
              <Chip key={c.code} active={countries.includes(c.code)} onClick={() => toggleCountry(c.code)} size="sm">
                <span aria-hidden>{c.flag}</span> {c.name}
              </Chip>
            ))}
          </div>
        </section>

        {/* Temas */}
        <section>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">
            <Tag size={11} /> Temas de interés
            <span className="ml-1 rounded-full bg-upm-100 px-1.5 py-0.5 text-[10px] font-bold text-upm-700">{topics.length}</span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {TOPICS.map(t => (
              <Chip key={t.id} active={topics.includes(t.id)} onClick={() => toggleTopic(t.id)} size="sm">
                {t.label}
              </Chip>
            ))}
          </div>
        </section>

        {/* Frecuencia */}
        <section>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">
            <BellRing size={11} /> Frecuencia
          </div>
          <div className="mt-2.5 flex flex-col gap-2">
            {FREQS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFrequency(f.id)}
                className={
                  'flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all ' +
                  (frequency === f.id
                    ? 'border-upm-400 bg-upm-50 shadow-card'
                    : 'border-transparent bg-white ring-1 ring-ink-100 hover:border-upm-200')
                }
              >
                <div className={'grid h-8 w-8 shrink-0 place-items-center rounded-xl ' + (frequency === f.id ? 'bg-upm-500 text-white' : 'bg-upm-50 text-upm-600')}>
                  <CalendarCheck size={15} />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-ink-900">{f.label}</div>
                  <div className="text-[11.5px] text-ink-500">{f.desc}</div>
                </div>
                {frequency === f.id && <Check size={14} className="text-upm-600" />}
              </button>
            ))}
          </div>
        </section>

        {/* Resumen + Guardar */}
        <div className="rounded-2xl bg-upm-50/60 px-4 py-3 ring-1 ring-upm-100 text-[12.5px] text-ink-700">
          <span className="font-bold text-ink-900">{countries.length}</span> países ·{' '}
          <span className="font-bold text-ink-900">{topics.length}</span> temas ·{' '}
          <span className="font-bold text-ink-900 capitalize">{frequency}</span>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink-700 ring-1 ring-ink-100 hover:bg-ink-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full bg-upm-700 px-4 py-2 text-[13px] font-bold text-white shadow-cta hover:bg-upm-800"
          >
            <Check size={13} /> Guardar preferencias
          </button>
        </div>
      </form>
    </Drawer>
  )
}
