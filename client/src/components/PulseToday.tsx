import { useMemo } from 'react'
import { Flame, Gavel, GitCompareArrows, ArrowRight } from 'lucide-react'
import type { NewsItem } from '@/lib/types'
import { countryByCode } from '@/lib/data'
import type { FilterPresetId } from './QuickFilterPills'

// PulseToday · Hero de Radar.
// Responde en 3 segundos: ¿qué pasó hoy importante?
// 3 cards: (1) Sancionadas reciente · (2) Por votar · (3) Cruzadas MERCOSUR.
// Click → aplica el preset correspondiente al Radar.

const OTHER_COUNTRIES = /\b(Brasil|Uruguay|Argentina|Paraguay|Chile|Bolivia|Colombia|MERCOSUR|MERCOSUL)\b/i

type Stats = {
  sancionadas: { count: number; example?: NewsItem }
  porVotar: { count: number; example?: NewsItem }
  cruzadas: { count: number; example?: NewsItem }
}

function computeStats(items: NewsItem[]): Stats {
  const now = Date.now()
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000

  // Sancionadas en últimos 7 días
  const sancionadasItems = items.filter(n => {
    const isLey = /^(?:ar|uy|co)-ley-/.test(n.id) || /sancion|promulgad|aprobad/i.test(n.status ?? '')
    const d = new Date(n.dataPublicacao ?? n.date ?? '').getTime()
    return isLey && !Number.isNaN(d) && d >= weekAgo
  })

  // Por votar / agendado / convocada
  const porVotarItems = items.filter(n => {
    const s = (n.status ?? '').toLowerCase()
    return /convocad|agendad|por\s+votar|en\s+debate|comisi[óo]n|orden\s+del\s+d[íi]a|pleno/i.test(s) ||
      (n.tramitaciones?.length ?? 0) > 0
  })

  // Cruzadas: mencionan a otros países del bloque
  const cruzadasItems = items.filter(n =>
    OTHER_COUNTRIES.test((n.fullText ?? '') + ' ' + (n.title ?? '')),
  )

  return {
    sancionadas: {
      count: sancionadasItems.length,
      example: sancionadasItems.sort((a, b) => (b.dataPublicacao ?? b.date).localeCompare(a.dataPublicacao ?? a.date))[0],
    },
    porVotar: {
      count: porVotarItems.length,
      example: porVotarItems.sort((a, b) => b.date.localeCompare(a.date))[0],
    },
    cruzadas: {
      count: cruzadasItems.length,
      example: cruzadasItems.filter(n => n.relevance === 'alta').sort((a, b) => b.date.localeCompare(a.date))[0]
        ?? cruzadasItems.sort((a, b) => b.date.localeCompare(a.date))[0],
    },
  }
}

function formatExample(item?: NewsItem): { country: string; title: string } | null {
  if (!item) return null
  const c = countryByCode(item.country)
  // Truncar título a algo legible
  const title = item.title.length > 50 ? item.title.slice(0, 50) + '…' : item.title
  return { country: `${c.flag} ${c.code}`, title }
}

export function PulseToday({
  items,
  onPresetClick,
}: {
  items: NewsItem[]
  onPresetClick: (preset: FilterPresetId) => void
}) {
  const stats = useMemo(() => computeStats(items), [items])

  const cards = [
    {
      key: 'sancionadas' as const,
      preset: 'recent-sancionadas' as FilterPresetId,
      icon: Flame,
      label: 'Sancionadas esta semana',
      sub: 'leyes promulgadas en últimos 7 días',
      count: stats.sancionadas.count,
      example: formatExample(stats.sancionadas.example),
      gradient: 'from-danger to-warning',
      ring: 'ring-danger/20',
      tint: 'bg-danger-bg/30',
      iconBg: 'bg-danger text-white',
    },
    {
      key: 'porVotar' as const,
      preset: 'with-tramite' as FilterPresetId,
      icon: Gavel,
      label: 'Por votar / en trámite',
      sub: 'votaciones pendientes o comisión',
      count: stats.porVotar.count,
      example: formatExample(stats.porVotar.example),
      gradient: 'from-warning to-warning-fg',
      ring: 'ring-warning/30',
      tint: 'bg-warning-bg/30',
      iconBg: 'bg-warning text-warning-fg',
    },
    {
      key: 'cruzadas' as const,
      preset: 'crossborder' as FilterPresetId,
      icon: GitCompareArrows,
      label: 'Cuestiones cruzadas MERCOSUR',
      sub: 'normas que mencionan a otros países',
      count: stats.cruzadas.count,
      example: formatExample(stats.cruzadas.example),
      gradient: 'from-upm-500 to-upm-700',
      ring: 'ring-upm-200',
      tint: 'bg-upm-50',
      iconBg: 'bg-upm-600 text-white',
    },
  ]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 px-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
        Pulso de hoy · qué pasó importante
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <button
              key={card.key}
              onClick={() => onPresetClick(card.preset)}
              className={
                'group relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-white p-3.5 text-left ring-1 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-floating ' +
                card.ring
              }
            >
              <div className={'absolute inset-0 opacity-[0.04] bg-gradient-to-br ' + card.gradient} />
              <div className="relative flex items-start justify-between gap-2">
                <div className={'grid h-9 w-9 shrink-0 place-items-center rounded-xl ' + card.iconBg}>
                  <Icon size={16} />
                </div>
                <div className="text-right">
                  <div className="text-[26px] font-bold tabular-nums leading-none text-ink-900">
                    {card.count.toLocaleString('es-AR')}
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="text-[12.5px] font-bold leading-tight text-ink-900">{card.label}</div>
                <div className="mt-0.5 text-[10.5px] leading-tight text-ink-500">{card.sub}</div>
              </div>
              {card.example && (
                <div className={'relative mt-1 rounded-lg px-2.5 py-1.5 ' + card.tint}>
                  <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-500">Último</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-800">
                    <span className="shrink-0 font-semibold">{card.example.country}</span>
                    <span className="line-clamp-1">{card.example.title}</span>
                  </div>
                </div>
              )}
              <div className="relative mt-auto flex items-center gap-1 text-[10.5px] font-bold text-upm-700">
                Ver todas <ArrowRight size={11} className="transition group-hover:translate-x-0.5" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
