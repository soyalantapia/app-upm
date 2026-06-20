import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Calendar, Flame, Search } from 'lucide-react'
import { CountUp } from './CountUp'
import { LiveCoverageBar } from './LiveCoverageBar'
import type { AggregatedFeed } from '@/lib/sources'
import type { NewsItem } from '@/lib/types'

// HomeHero · header compacto + search prominente + 3 stats HOY.
// Reemplaza el hero gigante "1747 novedades" por información decisional:
// cuántas urgencias hay hoy, cuántas votaciones esta semana, cuántas
// audiencias próximas. Cada stat es clickeable y aplica filtros al Radar.

function todayPrefix(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function computeStats(items: NewsItem[], now: number) {
  const day = 24 * 60 * 60 * 1000
  const dateOf = (n: NewsItem) => new Date(n.dataPublicacao ?? n.date ?? '').getTime()

  // Alta relevancia "para revisar ya" · alta relevancia reciente (últimos 7 días)
  // o futura. (Antes pedía solo hoy-o-futuro → siempre 0 porque las novedades
  // recientes están fechadas en días anteriores.)
  const urgentes = items.filter(n => {
    if (n.relevance !== 'alta') return false
    const d = dateOf(n)
    return !Number.isNaN(d) && d >= now - 7 * day
  }).length

  // Por votar / en trámite · activo en las últimas 2 semanas o próximo
  const votaciones = items.filter(n => {
    const blob = ((n.status ?? '') + ' ' + (n.tipoConteudo ?? '') + ' ' + (n.title ?? '')).toLowerCase()
    if (!/votaci[óo]n|votaç|voto\s+nominal|en\s+tr[aá]mite|tramitaç|deliberativ/i.test(blob)) return false
    const d = dateOf(n)
    return !Number.isNaN(d) && d >= now - 14 * day
  }).length

  // Audiencias / sesiones · próximos / muy recientes (±2 semanas)
  const audiencias = items.filter(n => {
    const blob = ((n.status ?? '') + ' ' + (n.tipoConteudo ?? '') + ' ' + (n.tipoDocumento ?? '') + ' ' + (n.title ?? '')).toLowerCase()
    if (!/audi[eê]ncia|audiencia|sess[ãa]o|sesi[óo]n|reuni[ãa]o|reuni[óo]n/i.test(blob)) return false
    const d = dateOf(n)
    return !Number.isNaN(d) && d >= now - 2 * day && d <= now + 14 * day
  }).length

  return { urgentes, votaciones, audiencias }
}

export function HomeHero({ items, userName, feed, loading }: { items: NewsItem[]; userName: string; feed?: AggregatedFeed | null; loading?: boolean }) {
  const navigate = useNavigate()
  const [searchValue, setSearchValue] = useState('')
  // Now estable por mount · evita Date.now() durante render (react-hooks/purity)
  const now = useMemo(() => Date.now(), [])
  const stats = useMemo(() => computeStats(items, now), [items, now])
  // High-water de los 3 stats · una vez que muestran un valor, no caen (el feed
  // fluctúa al refrescar) → el hero "HOY" nunca vuelve a 0/0/0 a la vista.
  const hwRef = useRef({ urgentes: 0, votaciones: 0, audiencias: 0 })
  const dStats = {
    urgentes: Math.max(stats.urgentes, hwRef.current.urgentes),
    votaciones: Math.max(stats.votaciones, hwRef.current.votaciones),
    audiencias: Math.max(stats.audiencias, hwRef.current.audiencias),
  }
  hwRef.current = dStats

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      navigate(`/radar?q=${encodeURIComponent(searchValue.trim())}`)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Saludo compacto */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-ink-900 sm:text-[26px]">
            {todayPrefix()}, {userName}
          </h1>
        </div>
      </div>

      {/* Centro de comando · cobertura en vivo + pulso regional */}
      <LiveCoverageBar feed={feed ?? null} />

      {/* Search prominente */}
      <form onSubmit={handleSearch} className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-upm-600" />
        <input
          type="search"
          aria-label="Buscar normativa, ley, tema o número"
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          placeholder="Buscar normativa, ley, tema o número…"
          className="w-full rounded-2xl bg-white px-12 py-3.5 text-[16px] text-ink-900 ring-1 ring-ink-100 shadow-card placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-upm-500"
        />
      </form>

      {/* HOY · 3 stats accionables */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => navigate('/radar?preset=hot')}
            title="Normas de alta relevancia detectadas en los últimos días en los países de tu Radar"
            className="group flex flex-col gap-1.5 rounded-2xl bg-white p-3 ring-1 ring-danger/20 shadow-card transition hover:-translate-y-0.5 hover:shadow-floating hover:ring-danger/40"
          >
            <div className="flex items-center gap-1.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-danger text-white">
                <Flame size={13} />
              </div>
              {loading ? <span className="skeleton my-1 inline-block h-5 w-7 rounded" /> : <CountUp value={dStats.urgentes} className="text-[20px] font-bold tabular-nums text-ink-900" />}
            </div>
            <div className="text-[11px] font-semibold leading-tight text-ink-700">
              Alta relevancia
            </div>
            <div className="text-[10px] leading-tight text-ink-500">
              Para revisar ya
            </div>
          </button>

          <button
            onClick={() => navigate('/radar?preset=with-tramite')}
            title="Normas con votación o tramitación activa en los países de tu Radar — esta semana"
            className="group flex flex-col gap-1.5 rounded-2xl bg-white p-3 ring-1 ring-warning/20 shadow-card transition hover:-translate-y-0.5 hover:shadow-floating hover:ring-warning/40"
          >
            <div className="flex items-center gap-1.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-warning text-warning-fg">
                <AlertTriangle size={13} />
              </div>
              {loading ? <span className="skeleton my-1 inline-block h-5 w-7 rounded" /> : <CountUp value={dStats.votaciones} className="text-[20px] font-bold tabular-nums text-ink-900" />}
            </div>
            <div className="text-[11px] font-semibold leading-tight text-ink-700">
              Por votar
            </div>
            <div className="text-[10px] leading-tight text-ink-500">
              Esta semana
            </div>
          </button>

          <button
            onClick={() => navigate('/radar?q=audiencia')}
            title="Audiencias y sesiones agendadas en las próximas dos semanas"
            className="group flex flex-col gap-1.5 rounded-2xl bg-white p-3 ring-1 ring-upm-200 shadow-card transition hover:-translate-y-0.5 hover:shadow-floating hover:ring-upm-400"
          >
            <div className="flex items-center gap-1.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-upm-600 text-white">
                <Calendar size={13} />
              </div>
              {loading ? <span className="skeleton my-1 inline-block h-5 w-7 rounded" /> : <CountUp value={dStats.audiencias} className="text-[20px] font-bold tabular-nums text-ink-900" />}
            </div>
            <div className="text-[11px] font-semibold leading-tight text-ink-700">
              Audiencias / sesiones
            </div>
            <div className="text-[10px] leading-tight text-ink-500">
              Próximas 2 semanas
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
