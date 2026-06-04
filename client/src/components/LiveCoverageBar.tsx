import { useMemo, useRef } from 'react'
import { Globe2, Radio, ScrollText } from 'lucide-react'
import { CountUp } from './CountUp'
import { COUNTRIES } from '@/lib/data'
import type { AggregatedFeed } from '@/lib/sources'
import type { CountryCode } from '@/lib/types'

// LiveCoverageBar · "centro de comando" del Home.
// Comunica en 5 segundos la ESCALA de cobertura + el TIEMPO REAL:
//   🟢 en vivo · N países · N fuentes oficiales · N normas en el corpus · hace X
// + un pulso regional (banderas con su contador) que vende la amplitud.
//
// Robusto: países y fuentes (hechos de cobertura del producto) se muestran
// apenas hay feed; el corpus y el pulso aparecen cuando cargan los items
// (no muestra "0" feo durante la sincronización progresiva).

function relTime(iso: string | undefined, now: number): string {
  if (!iso) return ''
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return ''
  const mins = Math.max(0, Math.round((now - d) / 60000))
  if (mins < 1) return 'recién'
  if (mins < 60) return `hace ${mins} min`
  const h = Math.round(mins / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} d`
}

export function LiveCoverageBar({ feed }: { feed: AggregatedFeed | null }) {
  // High-water · el feed en vivo fluctúa (un refresh parcial reemplaza al
  // completo). Acumulamos lo MÁXIMO visto por país, por fuentes y por total
  // para que los números SOLO crezcan, nunca caigan (1.706 → 298) ni "bajen"
  // la cobertura (8 países → 7 / 45 → 44). El pulso usa el mismo máximo por
  // país → el conteo de países siempre coincide con las banderas mostradas.
  const lastRef = useRef<AggregatedFeed | null>(null)
  const hwByCountry = useRef<Record<string, number>>({})
  const hwFuentes = useRef(0)
  const hwNormas = useRef(0)
  if (feed) {
    lastRef.current = feed
    const by: Record<string, number> = { ...(feed.byCountry ?? {}) }
    if (Object.keys(by).length === 0) {
      for (const it of feed.items ?? []) by[it.country] = (by[it.country] ?? 0) + 1
    }
    for (const code of Object.keys(by)) {
      hwByCountry.current[code] = Math.max(hwByCountry.current[code] ?? 0, by[code])
    }
    hwFuentes.current = Math.max(hwFuentes.current, feed.sources?.length ?? 0)
    hwNormas.current = Math.max(hwNormas.current, feed.items?.length ?? 0)
  }
  const f = lastRef.current

  const now = useMemo(() => Date.now(), [f?.fetchedAt])

  const porPais = COUNTRIES
    .map(c => ({ code: c.code as CountryCode, flag: c.flag, name: c.name, count: hwByCountry.current[c.code] ?? 0 }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)
  // Países = amplitud del corpus (lo que UPM monitorea), estable y coherente
  // con el login y Estadísticas. El "Pulso regional" de abajo muestra los que
  // tuvieron actividad (puede ser menos: otra métrica, otra etiqueta).
  const paises = COUNTRIES.length
  const fuentes = hwFuentes.current
  const totalNormas = hwNormas.current

  // Skeleton solo en el arranque frío real (sin feed todavía)
  if (!f || fuentes === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-upm-50/80 via-white to-white p-4 ring-1 ring-upm-100 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="skeleton h-6 w-20 rounded-full" />
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-4 w-40 rounded" />
          <div className="skeleton h-4 w-36 rounded" />
        </div>
        <div className="mt-3 flex items-center gap-1.5 border-t border-ink-100/70 pt-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-5 w-12 rounded-full" />
          ))}
        </div>
      </div>
    )
  }

  const updated = relTime(f.fetchedAt, now)
  const syncing = totalNormas === 0

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-upm-50/80 via-white to-white p-4 ring-1 ring-upm-100 shadow-card">
      {/* glow sutil de fondo */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-upm-200/30 blur-3xl" />

      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Badge en vivo */}
        <div className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-success-bg shadow-card">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-success-fg">En vivo</span>
        </div>

        {/* Métricas de cobertura */}
        <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1.5">
          <Metric icon={<Globe2 size={14} />} value={paises} label="países" animate={false} />
          <span className="hidden h-4 w-px bg-ink-100 sm:block" />
          <Metric icon={<Radio size={14} />} value={fuentes} label="fuentes oficiales" />
          <span className="hidden h-4 w-px bg-ink-100 sm:block" />
          {syncing ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-400">
              <ScrollText size={14} className="text-upm-600" />
              <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-upm-400" />
              sincronizando corpus…
            </span>
          ) : (
            <Metric icon={<ScrollText size={14} />} value={totalNormas} label="normas en el corpus" highlight />
          )}
        </div>

        {/* Actualizado */}
        {updated && <span className="text-[11px] font-medium text-ink-400">actualizado {updated}</span>}
      </div>

      {/* Pulso regional · banderas con contador */}
      {porPais.length > 0 && (
        <div className="relative mt-3 flex flex-wrap items-center gap-1.5 border-t border-ink-100/70 pt-3">
          <span className="mr-0.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-400">Pulso regional</span>
          {porPais.map(c => (
            <span
              key={c.code}
              title={`${c.name}: ${c.count.toLocaleString('es-AR')} normas`}
              className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-700 ring-1 ring-ink-100 transition hover:ring-upm-200"
            >
              <span aria-hidden>{c.flag}</span>
              <CountUp value={c.count} className="tabular-nums text-ink-900" />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({
  icon,
  value,
  label,
  highlight,
  animate = true,
}: {
  icon: React.ReactNode
  value: number
  label: string
  highlight?: boolean
  animate?: boolean
}) {
  const numClass = 'font-bold tabular-nums ' + (highlight ? 'text-[18px] text-upm-800' : 'text-[16px] text-ink-900')
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={highlight ? 'text-upm-600' : 'text-ink-400'}>{icon}</span>
      {animate ? (
        <CountUp value={value} className={numClass} />
      ) : (
        <span className={numClass}>{value.toLocaleString('es-AR')}</span>
      )}
      <span className="text-[11.5px] text-ink-500">{label}</span>
    </span>
  )
}
