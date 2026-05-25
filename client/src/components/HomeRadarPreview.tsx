import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Radar, Sparkles } from 'lucide-react'
import type { NewsItem, Preferences } from '@/lib/types'
import { countryByCode, topicById } from '@/lib/data'
import { buildRelevanceHint, type RelevanceHint } from './RelevanciaPanel'

// HomeRadarPreview · Muestra 3 ítems del Radar filtrados por las preferencias
// del usuario (topics + countries). Si no hay prefs, muestra alta relevancia.
// Click en un item → navega al detalle. CTA "Ver todo el Radar" abajo.

const HINT_STYLES: Record<RelevanceHint['tone'], { bg: string; text: string; icon: string }> = {
  urgent:      { bg: 'bg-danger-bg/40',  text: 'text-danger-fg',  icon: '🔥' },
  priority:    { bg: 'bg-upm-50',        text: 'text-upm-800',    icon: '⭐' },
  cross:       { bg: 'bg-info-bg/40',    text: 'text-info-fg',    icon: '🔗' },
  comparative: { bg: 'bg-info-bg/30',    text: 'text-info-fg',    icon: '↔️' },
  fiscal:      { bg: 'bg-warning-bg/40', text: 'text-warning-fg', icon: '💰' },
  neutral:     { bg: 'bg-ink-50',        text: 'text-ink-700',    icon: '·' },
}

export function HomeRadarPreview({ items, prefs }: { items: NewsItem[]; prefs: Preferences | null }) {
  const navigate = useNavigate()

  // Filtrar por prefs · si no hay prefs, fallback a alta relevancia
  const filtered = useMemo(() => {
    const userTopics = new Set(prefs?.topics ?? [])
    const userCountries = new Set(prefs?.countries ?? [])
    let list = items
    if (userTopics.size > 0 || userCountries.size > 0) {
      list = items.filter(n =>
        (userTopics.size === 0 || userTopics.has(n.topic)) &&
        (userCountries.size === 0 || userCountries.has(n.country)),
      )
    }
    // Ordenar por relevancia + fecha desc
    return [...list]
      .sort((a, b) => {
        const weight = (n: NewsItem) => (n.relevance === 'alta' ? 3 : n.relevance === 'media' ? 2 : 1)
        const dw = weight(b) - weight(a)
        if (dw !== 0) return dw
        return (b.date ?? '').localeCompare(a.date ?? '')
      })
      .slice(0, 3)
  }, [items, prefs])

  if (filtered.length === 0) return null

  const hasPrefs = (prefs?.topics?.length ?? 0) > 0 || (prefs?.countries?.length ?? 0) > 0
  const prefTopicsLabels = (prefs?.topics ?? []).map(t => topicById(t).shortLabel).slice(0, 3).join(' · ')

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <Sparkles size={11} /> En tu radar
          {hasPrefs && (
            <span className="rounded-full bg-upm-50 px-1.5 py-0.5 normal-case font-semibold text-[10px] text-upm-700">
              {prefTopicsLabels}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/radar?preset=mi-comision')}
          className="inline-flex items-center gap-1 text-[11.5px] font-bold text-upm-700 hover:text-upm-800"
        >
          Ver todo <ArrowRight size={11} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map(item => {
          const country = countryByCode(item.country)
          const topic = topicById(item.topic)
          const hint = buildRelevanceHint(item, prefs)
          return (
            <button
              key={item.id}
              onClick={() => navigate(`/radar/${item.id}`)}
              className="group flex items-start gap-3 rounded-2xl bg-white p-3.5 text-left ring-1 ring-ink-100 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-floating hover:ring-upm-100"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-upm-50 text-upm-700">
                <Radar size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                  <span className="rounded-md bg-upm-50 px-1.5 py-0.5 font-bold text-upm-700 ring-1 ring-upm-100">
                    {country.flag} {country.code}
                  </span>
                  <span className="text-ink-500">{topic.shortLabel}</span>
                </div>
                <h4 className="mt-1 text-[13.5px] font-bold leading-snug text-ink-900 line-clamp-2 group-hover:text-upm-800">
                  {item.title}
                </h4>
                {hint && (() => {
                  const s = HINT_STYLES[hint.tone]
                  return (
                    <div className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${s.bg} ${s.text}`}>
                      <span aria-hidden>{s.icon}</span>
                      <span>{hint.text}</span>
                    </div>
                  )
                })()}
              </div>
              <ArrowRight size={13} className="mt-1 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-upm-600" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
