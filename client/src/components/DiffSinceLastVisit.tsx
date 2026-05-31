import { useNavigate } from 'react-router-dom'
import { Bell, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { computeDiff, writeSnapshot } from '@/lib/visit-tracker'
import { countryByCode } from '@/lib/data'
import { dedupeRepeats } from '@/lib/pt-es'
import type { CountryCode, NewsItem } from '@/lib/types'

// Banner "Desde tu última visita" · solo aparece si hay snapshot previo
// y al menos 1 ítem nuevo.
export function DiffSinceLastVisit({ items }: { items: NewsItem[] }) {
  const navigate = useNavigate()
  const { newItems, sinceTs, hadSnapshot } = computeDiff(items)

  // Sin snapshot previo · primer uso, no mostrar nada (la app aún no se conoce)
  if (!hadSnapshot || newItems.length === 0) return null

  // Distribución por país de los nuevos
  const countryDist = new Map<CountryCode, number>()
  for (const i of newItems) countryDist.set(i.country, (countryDist.get(i.country) ?? 0) + 1)

  // Top 3 highlights ordenados por relevancia + fecha
  const relevWeight = { alta: 3, media: 2, baja: 1 } as const
  const topNew = [...newItems]
    .sort((a, b) => {
      const r = relevWeight[b.relevance] - relevWeight[a.relevance]
      if (r !== 0) return r
      return (b.date ?? '').localeCompare(a.date ?? '')
    })
    .slice(0, 3)

  const sinceLabel = (() => {
    if (!sinceTs) return ''
    const days = Math.floor((Date.now() - sinceTs) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'desde hace unas horas'
    if (days === 1) return 'desde ayer'
    if (days < 7) return `desde hace ${days} días`
    if (days < 30) return `desde hace ${Math.floor(days / 7)} ${Math.floor(days / 7) === 1 ? 'semana' : 'semanas'}`
    return `desde hace ${Math.floor(days / 30)} ${Math.floor(days / 30) === 1 ? 'mes' : 'meses'}`
  })()

  const handleMarkRead = () => {
    writeSnapshot(items)
    // Forzar re-render del Home; el snapshot cambió y el componente desaparecerá.
    // Hack simple: navegar al mismo path para refrescar.
    navigate(0)
  }

  return (
    <div className="animate-fade-up rounded-3xl bg-gradient-to-br from-upm-700 via-upm-800 to-upm-900 p-5 text-white shadow-floating ring-1 ring-upm-500/30 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Bell size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/80 ring-1 ring-white/20">
              Diff regulatorio
            </div>
            <h3 className="mt-2 text-[18px] font-bold tracking-tight sm:text-[20px]">
              {newItems.length} {newItems.length === 1 ? 'norma nueva' : 'normas nuevas'} {sinceLabel}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-white/85">
              {Array.from(countryDist.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([code, count]) => {
                  const c = countryByCode(code as CountryCode)
                  return (
                    <span key={code} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 ring-1 ring-white/20">
                      <span>{c.flag}</span>
                      <span className="font-bold">{c.code}</span>
                      <span className="text-white/70">· {count}</span>
                    </span>
                  )
                })}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <button
            onClick={() => navigate('/radar')}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-bold text-upm-800 shadow-cta transition hover:-translate-y-0.5"
          >
            Ver en Radar <ArrowUpRight size={13} />
          </button>
          <button
            onClick={handleMarkRead}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90 ring-1 ring-white/20 hover:bg-white/15"
          >
            <CheckCircle2 size={11} /> Marcar como leídas
          </button>
        </div>
      </div>

      {/* Top 3 destacadas */}
      {topNew.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {topNew.map(item => {
            const c = countryByCode(item.country)
            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(`/radar/${item.id}`)}
                  className="group block w-full rounded-2xl bg-white/10 p-3 text-left ring-1 ring-white/15 backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/20"
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/75">
                    <span>{c.flag}</span>
                    <span>{c.code}</span>
                    {item.relevance === 'alta' && (
                      <span className="rounded-full bg-danger-fg/80 px-1.5 py-0.5 text-[9px] text-white">Alta</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[12.5px] font-semibold leading-snug text-white line-clamp-2 group-hover:text-white">
                    {dedupeRepeats(item.title)}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
