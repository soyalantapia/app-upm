import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, TrendingUp, Network, MapPin, Tag, Activity, Flame, Radio, CheckCircle2, XCircle } from 'lucide-react'
import { useLiveFeed } from '@/lib/use-live-feed'
import { useCitationGraph } from '@/lib/use-citations'
import { computeTrendingLaws } from '@/lib/trending'
import { COUNTRIES, TOPICS } from '@/lib/data'
import { ActivityHeatmap } from '@/components/ActivityHeatmap'
import { MercosurChoropleth } from '@/components/MercosurChoropleth'
import { SectorHeatmap } from '@/components/SectorHeatmap'
import { BudgetRanking } from '@/components/BudgetRanking'
import { TermFrequency } from '@/components/TermFrequency'
import type { CountryCode, NewsItem, Topic } from '@/lib/types'

// /estadisticas · Dashboard global del corpus.
// Métricas: distribución por país/tema/año/tipo, top citadas, salud del corpus.
export function StatsPage() {
  const navigate = useNavigate()
  const { feed } = useLiveFeed()
  const { graph } = useCitationGraph()
  const items: NewsItem[] = feed?.items ?? []

  // Total de backlinks en el grafo de citas (suma de backlinks por ley)
  const totalBacklinks = useMemo(() => {
    if (!graph) return 0
    let total = 0
    for (const list of graph.backlinks.values()) total += list.length
    return total
  }, [graph])
  const stats = useMemo(() => computeStats(items, totalBacklinks), [items, totalBacklinks])
  const topCitadas = useMemo(() => {
    if (!graph) return []
    return computeTrendingLaws(graph, items, 8, 365)
  }, [graph, items])

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div>
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <BarChart3 size={11} /> Estadísticas
        </div>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight text-ink-900 sm:text-[26px]">
          El estado del Mercosur regulatorio
        </h1>
        <p className="mt-0.5 text-[11.5px] text-ink-500">
          Métricas en vivo sobre {feed?.sources?.length ?? 0} fuentes oficiales · qué se está moviendo y dónde.
        </p>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BigStat label="Items en corpus" value={items.length} icon={Activity} accent />
        <BigStat label="Alta relevancia" value={stats.altaRelevancia} icon={Flame} />
        <BigStat label="Países cubiertos" value={stats.paisesActivos} icon={MapPin} />
        <BigStat label="Conexiones entre normas" value={stats.totalBacklinks} icon={Network} />
      </div>

      {/* Heatmap calendario · actividad regulatoria por día */}
      <ActivityHeatmap />

      {/* Mapa coroplético · ya está en Home pero también acá */}
      <MercosurChoropleth />

      {/* Sectores económicos más regulados */}
      <SectorHeatmap />

      {/* Top normas por impacto presupuestario */}
      <BudgetRanking />

      {/* Análisis de frecuencia de términos */}
      <TermFrequency items={items} topN={20} />

      {/* Distribución por país */}
      <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <MapPin size={11} /> Distribución por país
        </div>
        <ul className="mt-3 flex flex-col gap-1.5">
          {COUNTRIES.map(c => {
            const count = stats.byCountry.get(c.code) ?? 0
            const pct = items.length > 0 ? (count / items.length) * 100 : 0
            return (
              <li key={c.code} className="flex items-center gap-2 text-[12px]">
                <span className="w-5">{c.flag}</span>
                <span className="font-bold w-12">{c.code}</span>
                <div className="flex-1 h-2 rounded-full bg-ink-50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-upm-500 to-upm-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="font-bold tabular-nums w-12 text-right text-ink-800">{count}</span>
                <span className="text-[10.5px] text-ink-500 tabular-nums w-12 text-right">{pct.toFixed(1)}%</span>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Distribución por tema */}
      <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <Tag size={11} /> Distribución por tema
        </div>
        <ul className="mt-3 flex flex-col gap-1.5">
          {TOPICS
            .map(t => ({ topic: t, count: stats.byTopic.get(t.id) ?? 0 }))
            .sort((a, b) => b.count - a.count)
            .map(({ topic, count }) => {
              const pct = items.length > 0 ? (count / items.length) * 100 : 0
              return (
                <li key={topic.id} className="flex items-center gap-2 text-[12px]">
                  <span className="font-bold w-32 text-ink-700 line-clamp-1">{topic.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-ink-50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-warning to-warning-fg"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-bold tabular-nums w-12 text-right text-ink-800">{count}</span>
                  <span className="text-[10.5px] text-ink-500 tabular-nums w-12 text-right">{pct.toFixed(1)}%</span>
                </li>
              )
            })}
        </ul>
      </div>

      {/* Por año */}
      <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <Activity size={11} /> Actividad por año
        </div>
        <div className="mt-3 flex h-32 items-end gap-1">
          {stats.byYear.map(({ year, count }) => {
            const maxCount = Math.max(...stats.byYear.map(y => y.count), 1)
            const heightPct = (count / maxCount) * 100
            return (
              <div key={year} className="group flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-bold tabular-nums text-ink-500 opacity-0 group-hover:opacity-100 transition">{count}</span>
                <div
                  className="w-full rounded-t bg-upm-500 transition group-hover:bg-upm-700"
                  style={{ height: `${heightPct}%`, minHeight: count > 0 ? '4px' : '0' }}
                  title={`${year}: ${count} normas`}
                />
                <span className="text-[9.5px] font-bold tabular-nums text-ink-500">{year.slice(2)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Panel de fuentes activas */}
      {feed && feed.sources.length > 0 && (
        <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
              <Radio size={11} /> Fuentes del corpus · {feed.sources.length} activas
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1 text-success-fg">
                <CheckCircle2 size={11} /> {feed.sources.filter(s => s.ok).length} ok
              </span>
              <span className="flex items-center gap-1 text-ink-400">
                <XCircle size={11} /> {feed.sources.filter(s => !s.ok).length} con error
              </span>
            </div>
          </div>
          <div className="mt-3 grid gap-1 sm:grid-cols-2">
            {feed.sources.map(s => {
              const c = COUNTRIES.find(co => co.code === s.country)
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 ring-1 ${
                    s.ok ? 'bg-success-bg/20 ring-success-bg' : 'bg-danger-bg/10 ring-ink-50'
                  }`}
                >
                  <span className="text-[12px]">{c?.flag ?? '🌐'}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-ink-700">{s.label}</span>
                  {s.ok ? (
                    <span className="shrink-0 text-[10px] font-bold tabular-nums text-success-fg">{s.count}</span>
                  ) : (
                    <XCircle size={11} className="shrink-0 text-danger" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top citadas */}
      {topCitadas.length > 0 && (
        <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <TrendingUp size={11} /> Leyes más citadas del corpus
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {topCitadas.slice(0, 8).map((tc, idx) => (
              <li key={tc.numero}>
                <button
                  onClick={() => {
                    if (tc.law) navigate(`/radar/${tc.law.id}`)
                  }}
                  className="group flex w-full items-center gap-3 rounded-2xl bg-ink-50/40 p-3 text-left ring-1 ring-ink-100 transition hover:bg-upm-50 hover:ring-upm-100"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-upm-700 text-[11px] font-bold text-white">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[10.5px]">
                      <span className="rounded-md bg-white px-1.5 py-0.5 font-bold text-upm-700 ring-1 ring-upm-100">Ley {tc.numero}</span>
                      <span className="text-ink-500">{tc.citasTotal} citaciones totales</span>
                    </div>
                    {tc.law && (
                      <p className="mt-0.5 text-[12px] font-bold text-ink-900 line-clamp-1 group-hover:text-upm-800">
                        {tc.law.title}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function BigStat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: typeof Activity
  accent?: boolean
}) {
  return (
    <div className={'flex flex-col gap-1 rounded-3xl p-4 ring-1 shadow-card ' + (accent ? 'bg-upm-700 text-white ring-upm-800' : 'bg-white ring-ink-100')}>
      <div className={'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ' + (accent ? 'text-white/70' : 'text-ink-500')}>
        <Icon size={11} /> {label}
      </div>
      <div className="text-[28px] font-bold tabular-nums">{value.toLocaleString('es-AR')}</div>
    </div>
  )
}

type ComputedStats = {
  altaRelevancia: number
  paisesActivos: number
  totalBacklinks: number
  byCountry: Map<CountryCode, number>
  byTopic: Map<Topic, number>
  byYear: { year: string; count: number }[]
}

function computeStats(items: NewsItem[], totalBacklinks: number = 0): ComputedStats {
  const byCountry = new Map<CountryCode, number>()
  const byTopic = new Map<Topic, number>()
  const byYearMap = new Map<string, number>()
  let altaRelevancia = 0

  for (const item of items) {
    byCountry.set(item.country, (byCountry.get(item.country) ?? 0) + 1)
    byTopic.set(item.topic, (byTopic.get(item.topic) ?? 0) + 1)
    if (item.relevance === 'alta') altaRelevancia++
    const year = (item.date ?? '').slice(0, 4)
    if (/^\d{4}$/.test(year)) {
      byYearMap.set(year, (byYearMap.get(year) ?? 0) + 1)
    }
  }

  const byYear = Array.from(byYearMap.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year.localeCompare(b.year))
    .slice(-12) // últimos 12 años

  return {
    altaRelevancia,
    paisesActivos: byCountry.size,
    totalBacklinks, // calculado real desde el grafo de citas
    byCountry,
    byTopic,
    byYear,
  }
}
