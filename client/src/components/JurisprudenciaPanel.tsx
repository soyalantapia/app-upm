import { Gavel, ExternalLink, Calendar } from 'lucide-react'
import { useFallosForItem } from '@/lib/use-jurisprudencia'
import { formatDate } from '@/lib/format'
import { countryByCode } from '@/lib/data'

// JurisprudenciaPanel · panel del detalle de Leyes que muestra los fallos
// de cortes supremas (CSJN AR, STF BR, SCJ UY) que interpretan ESTA ley.
// Lazy fetch desde public/data via useFallosForItem.
//
// Si no hay fallos relacionados, no renderiza nada.

const TRIBUNAL_LABEL: Record<string, string> = {
  CSJN: 'Corte Suprema Argentina',
  STF: 'Supremo Tribunal Federal Brasil',
  SCJ: 'Suprema Corte Uruguay',
}

export function JurisprudenciaPanel({ itemId }: { itemId: string }) {
  const { fallos, loading } = useFallosForItem(itemId)

  if (loading) return null
  if (fallos.length === 0) return null

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <Gavel size={11} /> Fallos que aplican esta ley
        </div>
        <span className="text-[11px] font-bold tabular-nums text-ink-500">
          {fallos.length} fallos
        </span>
      </div>

      <ul className="mt-3 flex flex-col gap-2.5">
        {fallos.slice(0, 5).map(f => {
          const c = countryByCode(f.country)
          return (
            <li
              key={f.id}
              className="group rounded-2xl bg-ink-50/40 p-3 ring-1 ring-ink-100 transition hover:bg-upm-50 hover:ring-upm-100"
            >
              <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                <span className="rounded-md bg-upm-700 px-1.5 py-0.5 font-bold text-white">
                  {f.tribunal}
                </span>
                <span className="text-ink-500">{c.flag} {TRIBUNAL_LABEL[f.tribunal] ?? f.tribunal}</span>
                {f.sala && (
                  <span className="text-ink-400">· {f.sala}</span>
                )}
                <span className="ml-auto inline-flex items-center gap-1 text-ink-500">
                  <Calendar size={9} /> {formatDate(f.fecha)}
                </span>
              </div>
              <h4 className="mt-1.5 text-[13px] font-bold leading-snug text-ink-900 line-clamp-2">
                {f.title}
              </h4>
              {f.sumario && (
                <p className="mt-1 text-[12px] leading-relaxed text-ink-700 line-clamp-3">
                  {f.sumario}
                </p>
              )}
              {f.tags && f.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {f.tags.slice(0, 4).map(tag => (
                    <span key={tag} className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-ink-600 ring-1 ring-ink-100">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {f.url && (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-upm-700 hover:underline"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink size={10} /> Ver fallo completo
                </a>
              )}
            </li>
          )
        })}
      </ul>

      {fallos.length > 5 && (
        <p className="mt-3 text-center text-[11px] text-ink-500">
          + {fallos.length - 5} fallos adicionales relacionados con esta ley
        </p>
      )}
    </div>
  )
}
