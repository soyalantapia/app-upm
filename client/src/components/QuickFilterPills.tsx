import { Flame, Zap, GitCompareArrows, CalendarDays, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Presets de filtros que aplican varios criterios a la vez.
// El padre (Radar) recibe el id del preset activo y los traduce a state.
export type FilterPresetId = 'all' | 'hot' | 'recent-sancionadas' | 'crossborder' | 'this-week' | 'with-tramite'

const PRESETS: { id: FilterPresetId; label: string; icon: LucideIcon; tone: string }[] = [
  { id: 'all', label: 'Todas', icon: Activity, tone: 'bg-white text-ink-700 ring-ink-100' },
  { id: 'hot', label: 'Alta relevancia hoy', icon: Flame, tone: 'bg-danger-bg/40 text-danger-fg ring-danger-bg' },
  { id: 'recent-sancionadas', label: 'Recién sancionadas', icon: Zap, tone: 'bg-success-bg/40 text-success-fg ring-success-bg' },
  { id: 'crossborder', label: 'Cuestiones cruzadas', icon: GitCompareArrows, tone: 'bg-upm-50 text-upm-700 ring-upm-100' },
  { id: 'this-week', label: 'Esta semana', icon: CalendarDays, tone: 'bg-warning-bg/40 text-warning-fg ring-warning-bg' },
  { id: 'with-tramite', label: 'En trámite activo', icon: Activity, tone: 'bg-ink-50 text-ink-700 ring-ink-100' },
]

export function QuickFilterPills({
  active,
  onChange,
  counts,
}: {
  active: FilterPresetId
  onChange: (id: FilterPresetId) => void
  counts?: Partial<Record<FilterPresetId, number>>
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map(preset => {
        const Icon = preset.icon
        const isActive = active === preset.id
        const count = counts?.[preset.id]
        return (
          <button
            key={preset.id}
            onClick={() => onChange(preset.id)}
            className={
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold transition ring-1 ' +
              (isActive
                ? 'bg-upm-700 text-white shadow-cta ring-upm-700 hover:-translate-y-0.5'
                : `${preset.tone} hover:-translate-y-0.5`)
            }
          >
            <Icon size={11} />
            <span>{preset.label}</span>
            {count !== undefined && count > 0 && (
              <span className={'rounded-full px-1 text-[10px] tabular-nums ' + (isActive ? 'bg-white/20' : 'bg-black/5')}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
