import { useMemo, useRef } from 'react'
import { Flame, Gavel, GitCompareArrows, ArrowRight } from 'lucide-react'
import type { NewsItem } from '@/lib/types'
import { countryByCode } from '@/lib/data'
import { cleanTitle } from '@/lib/pt-es'
import { CountUp } from './CountUp'
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
  // Ventana de 30 días · alineada con el preset 'recent-sancionadas' del Radar
  // (antes 7 días → casi siempre 0 porque hay pocas sanciones en una semana).
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000

  // Sancionadas recientes (últimos 30 días)
  const sancionadasItems = items.filter(n => {
    const isLey = /^(?:ar|uy|co)-ley-/.test(n.id) || /sancion|promulgad|aprobad/i.test(n.status ?? '')
    const d = new Date(n.dataPublicacao ?? n.date ?? '').getTime()
    return isLey && !Number.isNaN(d) && d >= monthAgo
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
  // Limpia el título (traduce PT→ES + dedup) y trunca a algo legible
  const clean = cleanTitle(item.title)
  const title = clean.length > 50 ? clean.slice(0, 50) + '…' : clean
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

  // High-water · una vez que un contador muestra un valor, no cae aunque el feed
  // fluctúe al refrescar → el "Pulso de hoy" nunca vuelve a 0 a la vista.
  const hwRef = useRef({ sancionadas: 0, porVotar: 0, cruzadas: 0 })
  const dCounts = {
    sancionadas: Math.max(stats.sancionadas.count, hwRef.current.sancionadas),
    porVotar: Math.max(stats.porVotar.count, hwRef.current.porVotar),
    cruzadas: Math.max(stats.cruzadas.count, hwRef.current.cruzadas),
  }
  hwRef.current = dCounts

  const cards = [
    {
      key: 'sancionadas' as const,
      preset: 'recent-sancionadas' as FilterPresetId,
      icon: Flame,
      label: 'Recién sancionadas',
      sub: 'leyes promulgadas en los últimos 30 días',
      count: dCounts.sancionadas,
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
      count: dCounts.porVotar,
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
      count: dCounts.cruzadas,
      example: formatExample(stats.cruzadas.example),
      gradient: 'from-upm-500 to-upm-700',
      ring: 'ring-upm-200',
      tint: 'bg-upm-50',
      iconBg: 'bg-upm-600 text-white',
    },
  ]

  return (
    <div className="flex flex-col gap-2">
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
                  <CountUp value={card.count} className="text-[26px] font-bold tabular-nums leading-none text-ink-900" />
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
