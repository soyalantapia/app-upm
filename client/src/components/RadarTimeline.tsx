import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { countryByCode } from '@/lib/data'
import { formatDate } from '@/lib/format'
import type { CountryCode, NewsItem } from '@/lib/types'

// Timeline view del Radar.
// Eje X: fechas. Lanes (filas): países. Dots: normas, tamaño = relevancia.
// Click en un dot → navega al detalle.
//
// Diseño compacto: muestra hasta los últimos ~12 meses agrupados por mes,
// y eventos en cada celda. Optimizado para legibilidad, no para precisión
// temporal exacta (eso es lo que muestra la lista).
export function RadarTimeline({ items }: { items: NewsItem[] }) {
  const navigate = useNavigate()

  const { months, byCountryAndMonth, countriesPresent } = useMemo(() => {
    // Detectar últimos N meses con actividad
    const monthSet = new Set<string>()
    const map = new Map<string, NewsItem[]>() // `${country}-${YYYY-MM}` → items
    const countries = new Set<CountryCode>()

    for (const item of items) {
      const d = item.dataPublicacao ?? item.date
      if (!d) continue
      const yyyyMm = d.slice(0, 7)
      if (!/^\d{4}-\d{2}$/.test(yyyyMm)) continue
      monthSet.add(yyyyMm)
      countries.add(item.country)
      const key = `${item.country}-${yyyyMm}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }

    // Mostrar últimos 12 meses (desde el más reciente con data)
    const sortedMonths = Array.from(monthSet).sort()
    const last12 = sortedMonths.slice(-12)
    const orderedCountries: CountryCode[] = ['AR', 'BR', 'UY', 'CO', 'PY', 'BO', 'PE', 'CL']
      .filter(c => countries.has(c as CountryCode)) as CountryCode[]

    return { months: last12, byCountryAndMonth: map, countriesPresent: orderedCountries }
  }, [items])

  if (months.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center text-[13px] text-ink-500 ring-1 ring-ink-100">
        Sin datos temporales suficientes para construir un timeline.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-3xl bg-white p-4 ring-1 ring-ink-100 sm:p-6">
      <div className="min-w-[800px]">
        {/* Header con meses */}
        <div className="flex">
          <div className="w-16 shrink-0" />
          {months.map(m => {
            const label = new Date(m + '-01').toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
            return (
              <div key={m} className="flex-1 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-ink-500">
                {label}
              </div>
            )
          })}
        </div>

        {/* Lanes por país */}
        <div className="mt-2 flex flex-col gap-1">
          {countriesPresent.map(code => {
            const c = countryByCode(code)
            return (
              <div key={code} className="flex items-center">
                <div className="w-16 shrink-0 text-[11px] font-bold text-ink-700">
                  <span className="mr-1">{c.flag}</span>
                  {c.code}
                </div>
                {months.map(m => {
                  const items = byCountryAndMonth.get(`${code}-${m}`) ?? []
                  const alta = items.filter(i => i.relevance === 'alta').length
                  const media = items.filter(i => i.relevance === 'media').length
                  const baja = items.filter(i => i.relevance === 'baja').length
                  return (
                    <div
                      key={`${code}-${m}`}
                      className="flex-1 border-l border-ink-100 px-1 py-1.5 first:border-l-0"
                    >
                      <TimelineCell
                        items={items}
                        alta={alta}
                        media={media}
                        baja={baja}
                        onPick={(it) => navigate(`/radar/${it.id}`)}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Leyenda */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-3 text-[10.5px] text-ink-500">
          <span className="font-bold uppercase tracking-[0.12em]">Leyenda</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-danger-fg" /> Alta</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning-fg" /> Media</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-upm-400" /> Baja</span>
          <span className="ml-auto text-ink-400">Tamaño proporcional a cantidad · click en cualquier celda para abrir</span>
        </div>
      </div>
    </div>
  )
}

function TimelineCell({
  items,
  alta,
  media,
  baja,
  onPick,
}: {
  items: NewsItem[]
  alta: number
  media: number
  baja: number
  onPick: (item: NewsItem) => void
}) {
  if (items.length === 0) {
    return <div className="h-6 rounded bg-ink-50/30" />
  }
  // Resumen: 1 punto grande si hay alta, varios chicos si media/baja, total entre paréntesis
  const total = items.length
  const size = total >= 20 ? 'h-3.5 w-3.5' : total >= 10 ? 'h-3 w-3' : total >= 4 ? 'h-2.5 w-2.5' : 'h-2 w-2'
  const color = alta > 0 ? 'bg-danger-fg' : media > 0 ? 'bg-warning-fg' : 'bg-upm-400'

  // Pick el item de relevancia más alta para el click
  const target = items.sort((a, b) => {
    const w = { alta: 3, media: 2, baja: 1 }
    return w[b.relevance] - w[a.relevance]
  })[0]

  return (
    <button
      onClick={() => onPick(target)}
      className="group flex h-6 w-full items-center justify-center gap-1 rounded transition hover:bg-ink-50"
      title={`${total} normas · ${alta} alta · ${media} media · ${baja} baja · ${formatDate(target.date)}`}
    >
      <span className={`rounded-full transition group-hover:scale-125 ${size} ${color}`} />
      <span className="text-[9.5px] font-bold tabular-nums text-ink-500">{total}</span>
    </button>
  )
}
