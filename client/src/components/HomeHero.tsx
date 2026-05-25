import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Calendar, Flame, Search } from 'lucide-react'
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

function formatToday(): string {
  return new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long' })
}

function computeStats(items: NewsItem[]) {
  const now = Date.now()
  const week = now + 7 * 24 * 60 * 60 * 1000
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Alertas urgentes: alta relevancia + dataPublicacao hoy o futuro
  const urgentes = items.filter(n => {
    if (n.relevance !== 'alta') return false
    const d = new Date(n.dataPublicacao ?? n.date ?? '').getTime()
    return !Number.isNaN(d) && d >= today.getTime()
  }).length

  // Votaciones esta semana
  const votaciones = items.filter(n => {
    const blob = ((n.status ?? '') + ' ' + (n.tipoConteudo ?? '') + ' ' + (n.title ?? '')).toLowerCase()
    if (!/votaci[óo]n|votação|voto\s+nominal/i.test(blob)) return false
    const d = new Date(n.dataPublicacao ?? n.date ?? '').getTime()
    return !Number.isNaN(d) && d >= now && d <= week
  }).length

  // Audiencias / sesiones próximas
  const audiencias = items.filter(n => {
    const blob = ((n.status ?? '') + ' ' + (n.tipoConteudo ?? '') + ' ' + (n.tipoDocumento ?? '') + ' ' + (n.title ?? '')).toLowerCase()
    if (!/audi[eê]ncia\s+p[uú]blica|audiencia\s+p[uú]blica|sess[ãa]o|sesi[óo]n/i.test(blob)) return false
    const d = new Date(n.dataPublicacao ?? n.date ?? '').getTime()
    return !Number.isNaN(d) && d >= now && d <= week
  }).length

  return { urgentes, votaciones, audiencias }
}

export function HomeHero({ items, userName }: { items: NewsItem[]; userName: string }) {
  const navigate = useNavigate()
  const [searchValue, setSearchValue] = useState('')
  const stats = useMemo(() => computeStats(items), [items])

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
          <p className="mt-0.5 text-[12.5px] text-ink-500">
            {formatToday()} · {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Search prominente */}
      <form onSubmit={handleSearch} className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-upm-600" />
        <input
          type="search"
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          placeholder="Buscar normativa, ley, tema o número…"
          className="w-full rounded-2xl bg-white px-12 py-3.5 text-[14px] text-ink-900 ring-1 ring-ink-100 shadow-card placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-upm-500"
        />
      </form>

      {/* HOY · 3 stats accionables */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 px-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
          Hoy · qué pasa que te afecta
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => navigate('/radar?preset=hot')}
            className="group flex flex-col gap-1.5 rounded-2xl bg-white p-3 ring-1 ring-danger/20 shadow-card transition hover:-translate-y-0.5 hover:shadow-floating hover:ring-danger/40"
          >
            <div className="flex items-center gap-1.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-danger text-white">
                <Flame size={13} />
              </div>
              <span className="text-[20px] font-bold tabular-nums text-ink-900">
                {stats.urgentes.toLocaleString('es-AR')}
              </span>
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
            className="group flex flex-col gap-1.5 rounded-2xl bg-white p-3 ring-1 ring-warning/20 shadow-card transition hover:-translate-y-0.5 hover:shadow-floating hover:ring-warning/40"
          >
            <div className="flex items-center gap-1.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-warning text-warning-fg">
                <AlertTriangle size={13} />
              </div>
              <span className="text-[20px] font-bold tabular-nums text-ink-900">
                {stats.votaciones.toLocaleString('es-AR')}
              </span>
            </div>
            <div className="text-[11px] font-semibold leading-tight text-ink-700">
              Por votar
            </div>
            <div className="text-[10px] leading-tight text-ink-500">
              Esta semana
            </div>
          </button>

          <button
            onClick={() => navigate('/briefing')}
            className="group flex flex-col gap-1.5 rounded-2xl bg-white p-3 ring-1 ring-upm-200 shadow-card transition hover:-translate-y-0.5 hover:shadow-floating hover:ring-upm-400"
          >
            <div className="flex items-center gap-1.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-upm-600 text-white">
                <Calendar size={13} />
              </div>
              <span className="text-[20px] font-bold tabular-nums text-ink-900">
                {stats.audiencias.toLocaleString('es-AR')}
              </span>
            </div>
            <div className="text-[11px] font-semibold leading-tight text-ink-700">
              Audiencias / sesiones
            </div>
            <div className="text-[10px] leading-tight text-ink-500">
              Próximos 7 días
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
