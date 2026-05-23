import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronRight, Globe, Users } from 'lucide-react'
import { cn } from '@/lib/cn'

type MercosurEvent = {
  id: string
  date: string          // YYYY-MM-DD
  title: string
  type: 'cumbre' | 'reunion' | 'sesion' | 'plazo' | 'foro'
  countries?: string[]  // flags
  description: string
  link?: string
}

// Agenda institucional del MERCOSUR y organismos asociados.
// Actualizable por los editores de UPM.
const AGENDA: MercosurEvent[] = [
  {
    id: 'ev-001',
    date: '2026-06-05',
    title: 'Reunión del Grupo Mercado Común (GMC) · XC Reunión Ordinaria',
    type: 'reunion',
    countries: ['🇧🇷', '🇦🇷', '🇺🇾', '🇵🇾'],
    description: 'Agenda: protocolo de compras gubernamentales, asimetrías y AEC para bienes de capital.',
  },
  {
    id: 'ev-002',
    date: '2026-06-12',
    title: 'Sesión Plenaria del PARLASUR · Mayo-Junio 2026',
    type: 'sesion',
    countries: ['🇧🇷', '🇦🇷', '🇺🇾', '🇵🇾'],
    description: 'Tratamiento de normas sobre corredores bioceánicos, género y seguridad regional.',
  },
  {
    id: 'ev-003',
    date: '2026-06-18',
    title: 'Cumbre MERCOSUR-UE · Ratificación del Acuerdo de Asociación',
    type: 'cumbre',
    countries: ['🇧🇷', '🇦🇷', '🇺🇾', '🇵🇾', '🇪🇺'],
    description: 'Firma y ratificación del Acuerdo de Asociación MERCOSUR-Unión Europea, 25 años de negociaciones.',
  },
  {
    id: 'ev-004',
    date: '2026-06-25',
    title: 'Plazo: presentación de informes de cumplimiento del Acuerdo de Escazú',
    type: 'plazo',
    countries: ['🇦🇷', '🇺🇾', '🇨🇴'],
    description: 'Vencimiento del plazo para presentar informes nacionales de cumplimiento ante la COP de Escazú.',
  },
  {
    id: 'ev-005',
    date: '2026-07-07',
    title: 'Foro Parlamentario sobre el Corredor Bioceánico · Asunción',
    type: 'foro',
    countries: ['🇵🇾', '🇦🇷', '🇧🇷', '🇺🇾', '🇨🇱'],
    description: 'Debate de la Declaración de Asunción sobre infraestructura, financiamiento y soberanía en el corredor.',
  },
  {
    id: 'ev-006',
    date: '2026-07-15',
    title: 'Reunión del Consejo del Mercado Común (CMC) · XLIII Reunión',
    type: 'reunion',
    countries: ['🇧🇷', '🇦🇷', '🇺🇾', '🇵🇾'],
    description: 'Decisiones sobre libre circulación de personas, Venezuela y negociaciones con Canadá y Corea.',
  },
  {
    id: 'ev-007',
    date: '2026-07-28',
    title: 'Cumbre de Presidentes del MERCOSUR · Presidencia Pro Témpore Brasil 2026',
    type: 'cumbre',
    countries: ['🇧🇷', '🇦🇷', '🇺🇾', '🇵🇾'],
    description: 'Cumbre semestral bajo presidencia pro témpore de Brasil. Agenda: seguridad, integración productiva y clima.',
  },
  {
    id: 'ev-008',
    date: '2026-08-10',
    title: 'Sesión Ordinaria del Senado de la República del Uruguay · Presupuesto quinquenal',
    type: 'sesion',
    countries: ['🇺🇾'],
    description: 'Debate y votación del Presupuesto Quinquenal 2025-2030 en primera lectura.',
  },
]

const TYPE_META: Record<MercosurEvent['type'], { label: string; color: string }> = {
  cumbre: { label: 'Cumbre', color: 'bg-upm-600 text-white' },
  reunion: { label: 'Reunión', color: 'bg-upm-50 text-upm-700 ring-1 ring-upm-200' },
  sesion: { label: 'Sesión', color: 'bg-warning-bg text-warning-dark ring-1 ring-warning/30' },
  plazo: { label: 'Plazo', color: 'bg-danger-bg text-danger ring-1 ring-danger/30' },
  foro: { label: 'Foro', color: 'bg-ink-50 text-ink-600 ring-1 ring-ink-200' },
}

export function AgendaMercosur() {
  const navigate = useNavigate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming = useMemo(() => {
    return AGENDA
      .filter(e => new Date(e.date) >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (upcoming.length === 0) return null

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <CalendarDays size={11} /> Agenda Mercosur
        </div>
        <button
          onClick={() => navigate('/briefing')}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-upm-600 hover:text-upm-700"
        >
          Ver briefing <ChevronRight size={12} />
        </button>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {upcoming.map(ev => {
          const d = new Date(ev.date)
          const daysUntil = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          const typeMeta = TYPE_META[ev.type]
          const dayLabel = d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })

          return (
            <li
              key={ev.id}
              className="group flex items-start gap-3 rounded-2xl p-2.5 transition-colors hover:bg-upm-50/60"
            >
              {/* Fecha */}
              <div className="flex w-10 shrink-0 flex-col items-center rounded-xl bg-upm-50 p-1.5 ring-1 ring-upm-100">
                <span className="text-[9px] font-bold uppercase tracking-wide text-upm-500">
                  {dayLabel.split(' ')[1]}
                </span>
                <span className="text-[16px] font-bold leading-none text-upm-800">
                  {dayLabel.split(' ')[0]}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[9.5px] font-bold', typeMeta.color)}>
                    {typeMeta.label}
                  </span>
                  {ev.countries && (
                    <span className="text-[11px]">{ev.countries.join(' ')}</span>
                  )}
                  <span className={cn(
                    'ml-auto text-[10px] font-bold tabular-nums',
                    daysUntil <= 7 ? 'text-danger' : daysUntil <= 14 ? 'text-warning-dark' : 'text-ink-400',
                  )}>
                    en {daysUntil}d
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] font-semibold leading-snug text-ink-800">{ev.title}</p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-400">{ev.description}</p>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-3 flex items-center gap-1.5 border-t border-ink-50 pt-3">
        <Globe size={11} className="text-ink-400" />
        <span className="text-[10.5px] text-ink-400">
          {AGENDA.length} eventos institucionales del MERCOSUR en agenda
        </span>
        <Users size={11} className="ml-auto text-ink-300" />
        <span className="text-[10.5px] text-ink-400">5 países</span>
      </div>
    </div>
  )
}
