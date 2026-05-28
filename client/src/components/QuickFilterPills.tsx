import { Flame, Zap, GitCompareArrows, CalendarDays, Activity, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Presets de filtros que aplican varios criterios a la vez.
// El padre (Radar) recibe el id del preset activo y los traduce a state.
export type FilterPresetId = 'all' | 'mi-comision' | 'hot' | 'recent-sancionadas' | 'crossborder' | 'this-week' | 'with-tramite'

const PRESETS: { id: FilterPresetId; label: string; icon: LucideIcon; tone: string; activeTone?: string; special?: boolean }[] = [
  // "Mi comisión" · destacado · usa prefs.topics + prefs.countries del usuario.
  // Va primero y tiene tratamiento visual distintivo.
  // Inactivo: card light con borde azul (invita a clickear).
  // Activo: gradient azul→morado con sparkle (claramente seleccionado).
  {
    id: 'mi-comision',
    label: 'Mi comisión',
    icon: Sparkles,
    tone: 'bg-upm-50 text-upm-800 ring-upm-300 hover:bg-upm-100',
    activeTone: 'bg-gradient-to-r from-upm-600 via-upm-700 to-info text-white ring-upm-700 shadow-floating',
    special: true,
  },
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
            title={preset.special ? 'Filtra según los países y temas configurados en tu Perfil' : undefined}
            className={
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold transition ring-1 hover:-translate-y-0.5 ' +
              (isActive
                ? (preset.activeTone ?? 'bg-upm-700 text-white shadow-cta ring-upm-700')
                : preset.tone)
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
