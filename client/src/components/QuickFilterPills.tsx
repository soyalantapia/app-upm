import { Flame, Zap, Activity, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Presets de filtros · 4 vistas rápidas esenciales. El padre (Radar) traduce
// el id activo a state. "Mi comisión" usa prefs.topics + prefs.countries del
// usuario. Mantenemos el type con todos los ids por compatibilidad del padre.
export type FilterPresetId =
  | 'all'
  | 'mi-comision'
  | 'hot'
  | 'recent-sancionadas'
  | 'crossborder'
  | 'this-week'
  | 'with-tramite'

const PRESETS: { id: FilterPresetId; label: string; icon: LucideIcon; special?: boolean }[] = [
  { id: 'all', label: 'Todas', icon: Activity },
  { id: 'mi-comision', label: 'Mi comisión', icon: Sparkles, special: true },
  { id: 'hot', label: 'Alta relevancia', icon: Flame },
  { id: 'recent-sancionadas', label: 'Recién sancionadas', icon: Zap },
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
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold transition ring-1 ' +
              (isActive
                ? 'bg-upm-700 text-white shadow-cta ring-upm-700'
                : preset.special
                  ? 'bg-upm-50 text-upm-800 ring-upm-200 hover:bg-upm-100'
                  : 'bg-white text-ink-600 ring-ink-100 hover:bg-upm-50 hover:text-upm-700')
            }
          >
            <Icon size={12} className={isActive ? '' : preset.special ? 'text-upm-600' : 'text-ink-400'} />
            <span>{preset.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={
                  'rounded-full px-1.5 text-[10px] tabular-nums ' +
                  (isActive ? 'bg-white/20' : 'bg-black/5 text-ink-500')
                }
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
