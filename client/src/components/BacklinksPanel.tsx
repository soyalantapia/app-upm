import { Link } from 'react-router-dom'
import { Network, ArrowUpRight, Globe } from 'lucide-react'
import { countryByCode } from '@/lib/data'
import { formatDate } from '@/lib/format'
import { useBacklinks } from '@/lib/use-citations'
import { backlinksByCountry, extractLawNumberFromId } from '@/lib/citations'
import type { CountryCode } from '@/lib/types'

// Panel "¿Quién cita esta ley?" · backlinks invertidos del corpus completo.
// Solo aparece si el item es una ley nacional (id matchea ar-ley-XXXX o uy-ley-XXXX).
export function BacklinksPanel({ itemId }: { itemId: string }) {
  const lawNum = extractLawNumberFromId(itemId)
  const { backlinks, loading } = useBacklinks(itemId)

  // Si no es una ley nacional · no mostrar nada
  if (!lawNum) return null

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <Network size={11} /> Reconstruyendo grafo regulatorio…
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {[0, 1].map(i => (
            <li key={`bl-sk-${i}`} className="skeleton h-[72px] rounded-2xl" />
          ))}
        </ul>
      </div>
    )
  }

  if (backlinks.length === 0) {
    return (
      <div className="rounded-2xl bg-ink-50/50 p-3 ring-1 ring-ink-100">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
          <Network size={11} /> ¿Quién cita esta ley?
        </div>
        <p className="mt-1 text-[12px] text-ink-500">
          Ninguna otra norma del corpus regional (1601 ítems) cita explícitamente la Ley {lawNum}.
        </p>
      </div>
    )
  }

  const byCountry = backlinksByCountry(backlinks)
  // Top 8 visibles, resto en "ver más" silencioso
  const visible = backlinks.slice(0, 8)
  const remaining = backlinks.length - visible.length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <Network size={11} /> ¿Quién cita la Ley {lawNum}?
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-upm-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-cta">
          <ArrowUpRight size={11} /> {backlinks.length} {backlinks.length === 1 ? 'norma' : 'normas'}
        </span>
      </div>

      {/* Distribución por país · siempre visible */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-600">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Distribución</span>
        {Array.from(byCountry.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([country, count]) => {
            const c = countryByCode(country as CountryCode)
            return (
              <span key={country} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 ring-1 ring-ink-100">
                <span>{c.flag}</span>
                <span className="font-semibold text-ink-700">{c.code}</span>
                <span className="tabular-nums text-ink-500">· {count}</span>
              </span>
            )
          })}
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {visible.map(({ item, occurrences }) => {
          const country = countryByCode(item.country)
          return (
            <li key={item.id}>
              <Link
                to={`/radar/${item.id}`}
                className="group block h-full rounded-2xl bg-white p-3 ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:ring-upm-300 hover:shadow-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="inline-flex items-center gap-1 rounded-md bg-upm-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-upm-700 ring-1 ring-upm-100">
                      <Globe size={8} /> {country.flag} {country.code}
                    </span>
                    {item.tipoDocumento && (
                      <span className="inline-flex rounded-md bg-ink-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-ink-600 ring-1 ring-ink-100">
                        {item.tipoDocumento}
                      </span>
                    )}
                  </div>
                  {occurrences > 1 && (
                    <span className="shrink-0 rounded-full bg-warning-bg/60 px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums text-warning-fg ring-1 ring-warning-bg">
                      ×{occurrences}
                    </span>
                  )}
                </div>
                <h4 className="mt-2 text-[12.5px] font-semibold leading-snug text-ink-900 line-clamp-2 group-hover:text-upm-800">
                  {item.title}
                </h4>
                <p className="mt-1 text-[10.5px] text-ink-500 tabular-nums">{formatDate(item.date)}</p>
              </Link>
            </li>
          )
        })}
      </ul>

      {remaining > 0 && (
        <p className="text-[11px] text-ink-500">
          + {remaining} {remaining === 1 ? 'norma adicional' : 'normas adicionales'} citan la Ley {lawNum} en el corpus.
        </p>
      )}
    </div>
  )
}
