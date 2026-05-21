import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, TrendingUp, Sparkles, ArrowUpRight } from 'lucide-react'
import { useCitationGraph } from '@/lib/use-citations'
import { useLiveFeed } from '@/lib/use-live-feed'
import { computeTrendingLaws, computeTrendingTopics } from '@/lib/trending'
import { topicById, countryByCode } from '@/lib/data'
import type { CountryCode } from '@/lib/types'

// Panel "🔥 Tendencias" en Home · usa trending.ts para detectar:
// · Top leyes con tracción reciente (citaciones nuevas últimos 30 días)
// · Top temas en alza (concentración vs baseline)
export function TrendingPanel() {
  const navigate = useNavigate()
  const { graph } = useCitationGraph()
  const { feed } = useLiveFeed()

  const items = feed?.items ?? []

  const trendingLaws = useMemo(() => {
    if (!graph || items.length === 0) return []
    return computeTrendingLaws(graph, items, 5, 60)
  }, [graph, items])

  const trendingTopics = useMemo(() => {
    if (items.length === 0) return []
    return computeTrendingTopics(items, 5, 30)
  }, [items])

  // No mostrar si nada para mostrar (evita panel vacío)
  if (trendingLaws.length === 0 && trendingTopics.length === 0) return null

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {/* Leyes trending */}
      {trendingLaws.length > 0 && (
        <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-warning-fg">
              <Flame size={11} /> Leyes con tracción reciente
            </div>
            <span className="text-[10.5px] text-ink-500">últimos 60 días</span>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {trendingLaws.map((tl, idx) => (
              <li key={tl.numero}>
                <button
                  onClick={() => {
                    if (tl.law) navigate(`/radar/${tl.law.id}`)
                  }}
                  className="group flex w-full items-start gap-3 rounded-2xl bg-ink-50/40 p-3 text-left ring-1 ring-ink-100 transition hover:bg-warning-bg/30 hover:ring-warning-bg"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-warning-bg text-[11px] font-bold text-warning-fg">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning-fg ring-1 ring-warning-bg">
                        Ley {tl.numero}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-warning-bg/60 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-warning-fg ring-1 ring-warning-bg">
                        <Flame size={9} /> {tl.citasRecientes} cita{tl.citasRecientes === 1 ? '' : 's'} nuevas
                      </span>
                      <span className="text-[10px] text-ink-500 tabular-nums">/ {tl.citasTotal} total</span>
                    </div>
                    {tl.law && (
                      <p className="mt-1 text-[12.5px] font-semibold leading-snug text-ink-900 line-clamp-1 group-hover:text-warning-fg">
                        {tl.law.title}
                      </p>
                    )}
                    {tl.topCitantes.length > 0 && (
                      <p className="mt-0.5 text-[10.5px] text-ink-500 line-clamp-1">
                        Citada por: {tl.topCitantes.map(c => countryByCode(c.country).flag + ' ' + (c.tipoDocumento ?? c.type)).join(' · ')}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Temas trending */}
      {trendingTopics.length > 0 && (
        <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <TrendingUp size={11} /> Temas en alza
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {trendingTopics.map((tt, idx) => {
              const meta = topicById(tt.topic)
              const growthPct = Math.round((tt.growth - 1) * 100)
              return (
                <li
                  key={tt.topic}
                  className="flex items-center gap-2 rounded-xl bg-ink-50/40 px-3 py-2 ring-1 ring-ink-100"
                >
                  <span className="text-[12px] font-bold tabular-nums text-ink-400">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-ink-900 line-clamp-1">{meta.label}</p>
                    <p className="text-[10.5px] text-ink-500 tabular-nums">
                      {tt.countRecent} en últimos 30d · {tt.countTotal} total
                    </p>
                  </div>
                  <span
                    className={
                      'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ring-1 ' +
                      (growthPct > 30
                        ? 'bg-success-bg/60 text-success-fg ring-success-bg'
                        : growthPct > 0
                          ? 'bg-upm-50 text-upm-700 ring-upm-100'
                          : 'bg-ink-50 text-ink-600 ring-ink-100')
                    }
                  >
                    <Sparkles size={9} /> {growthPct > 0 ? '+' : ''}{growthPct}%
                  </span>
                </li>
              )
            })}
          </ul>
          <button
            onClick={() => navigate('/radar')}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-upm-50 px-3 py-1.5 text-[11.5px] font-bold text-upm-700 ring-1 ring-upm-100 transition hover:bg-upm-100"
          >
            Ver Radar completo <ArrowUpRight size={11} />
          </button>
        </div>
      )}
    </div>
  )
}

// Helper opcional para mostrar bandera + country code (no usado pero exporto por si)
export function CountryFlag({ code }: { code: CountryCode }) {
  const c = countryByCode(code)
  return <span>{c.flag}</span>
}
