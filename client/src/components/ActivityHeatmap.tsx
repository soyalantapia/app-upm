import { useMemo, useState } from 'react'
import { CalendarDays, Activity } from 'lucide-react'
import { useLiveFeed } from '@/lib/use-live-feed'
import { TOPICS, topicById } from '@/lib/data'
import type { Topic, NewsItem } from '@/lib/types'

// Heatmap calendario estilo GitHub: 365 cuadraditos verdes con la actividad
// regulatoria por día. Filtrable por país y tema.
//
// Layout: 53 columnas (semanas) × 7 filas (días), comenzando hace 1 año.
export function ActivityHeatmap() {
  const { feed } = useLiveFeed()
  const items = feed?.items ?? []
  const [topic, setTopic] = useState<Topic | 'all'>('all')
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; items: NewsItem[] } | null>(null)

  const { max, weeks } = useMemo(() => buildCalendar(items, topic), [items, topic])

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <CalendarDays size={11} /> Calendario de actividad regulatoria
        </div>
        <select
          value={topic}
          onChange={e => setTopic(e.target.value as Topic | 'all')}
          className="rounded-full bg-ink-50 px-3 py-1 text-[11.5px] font-bold text-ink-700 ring-1 ring-ink-100 focus:outline-none focus:ring-upm-300"
        >
          <option value="all">Todos los temas</option>
          {TOPICS.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Heatmap SVG · 53 semanas × 7 días */}
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[750px]">
          <svg
            viewBox="0 0 780 110"
            className="w-full"
            onMouseLeave={() => setHoveredDay(null)}
          >
            {/* Labels de meses arriba */}
            {weeks.monthLabels.map(({ x, label }, i) => (
              <text
                key={`m-${i}`}
                x={x}
                y={10}
                className="fill-ink-500 text-[10px] font-bold uppercase tracking-wide"
              >
                {label}
              </text>
            ))}

            {/* Labels de días al lado */}
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
              i % 2 === 0 ? (
                <text
                  key={`d-${i}`}
                  x={2}
                  y={28 + i * 14}
                  className="fill-ink-400 text-[9px] font-bold"
                >
                  {d}
                </text>
              ) : null
            ))}

            {/* Cuadraditos · uno por día */}
            {weeks.cells.map((cell, i) => {
              const intensity = max > 0 ? cell.count / max : 0
              const color =
                cell.count === 0 ? '#F1F5F9' :
                intensity < 0.2 ? '#DBEAFE' :
                intensity < 0.4 ? '#93C5FD' :
                intensity < 0.6 ? '#3B82F6' :
                intensity < 0.8 ? '#1D4ED8' :
                '#1E3A8A'
              return (
                <rect
                  key={`c-${i}`}
                  x={cell.x}
                  y={cell.y}
                  width={11}
                  height={11}
                  rx={2}
                  fill={color}
                  className="cursor-pointer transition hover:stroke-upm-700 hover:stroke-2"
                  onMouseEnter={() => setHoveredDay({ date: cell.date, count: cell.count, items: cell.items })}
                />
              )
            })}
          </svg>
        </div>
      </div>

      {/* Tooltip + escala */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {hoveredDay ? (
          <div className="rounded-2xl bg-upm-700 px-3 py-2 text-white text-[11.5px]">
            <span className="font-bold tabular-nums">{new Date(hoveredDay.date).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
            {' · '}
            <span className="font-bold">{hoveredDay.count}</span> normas
            {hoveredDay.items.length > 0 && (
              <span className="ml-1 text-white/70">· primer item: {hoveredDay.items[0].title.slice(0, 50)}…</span>
            )}
          </div>
        ) : (
          <p className="text-[11px] italic text-ink-500">
            Hover sobre cada día para ver detalles
            {topic !== 'all' && ` · Filtrado por ${topicById(topic).label}`}
          </p>
        )}
        <div className="flex items-center gap-1 text-[10px] text-ink-500">
          <Activity size={9} /> Menos
          {['#F1F5F9', '#DBEAFE', '#93C5FD', '#3B82F6', '#1D4ED8', '#1E3A8A'].map((c, i) => (
            <span key={`legend-${i}`} className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
          ))}
          Más
        </div>
      </div>
    </div>
  )
}

type Cell = { x: number; y: number; date: string; count: number; items: NewsItem[] }
type Calendar = { byDay: Map<string, NewsItem[]>; max: number; weeks: { cells: Cell[]; monthLabels: { x: number; label: string }[] } }

function buildCalendar(items: NewsItem[], topic: Topic | 'all'): Calendar {
  // Acumular por día (YYYY-MM-DD)
  const byDay = new Map<string, NewsItem[]>()
  for (const item of items) {
    if (topic !== 'all' && item.topic !== topic) continue
    const day = (item.dataPublicacao ?? item.date ?? '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(item)
  }

  // Generar grilla últimas 53 semanas
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 52 * 7 - today.getDay()) // arrancar lunes hace 53 semanas

  const cells: Cell[] = []
  const monthLabels: { x: number; label: string }[] = []
  let lastMonthShown = -1
  let max = 0

  for (let w = 0; w < 53; w++) {
    const x = 18 + w * 14
    // ¿comienza un mes nuevo?
    const dayOfWeekStart = new Date(startDate)
    dayOfWeekStart.setDate(startDate.getDate() + w * 7)
    const m = dayOfWeekStart.getMonth()
    if (m !== lastMonthShown) {
      monthLabels.push({
        x,
        label: dayOfWeekStart.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase().replace('.', ''),
      })
      lastMonthShown = m
    }

    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + w * 7 + d)
      if (date > today) continue
      const dayKey = date.toISOString().slice(0, 10)
      const dayItems = byDay.get(dayKey) ?? []
      if (dayItems.length > max) max = dayItems.length
      cells.push({
        x,
        y: 20 + d * 14,
        date: dayKey,
        count: dayItems.length,
        items: dayItems,
      })
    }
  }

  return { byDay, max, weeks: { cells, monthLabels } }
}
