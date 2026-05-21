import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ArrowUpRight, Sparkles } from 'lucide-react'
import { useLiveFeed } from '@/lib/use-live-feed'
import { useCitationGraph, getCitationCount } from '@/lib/use-citations'
import { detectUpdates } from '@/lib/watchlist'
import { countryByCode } from '@/lib/data'

// Panel "Mis seguidas" para Home · muestra las normas que el legislador sigue
// + detecta cambios desde que se sumó cada una (status, nuevas citaciones).
export function WatchlistPanel() {
  const navigate = useNavigate()
  const { feed } = useLiveFeed()
  const { graph } = useCitationGraph()
  const items = feed?.items ?? []

  const updates = useMemo(() => {
    if (items.length === 0) return []
    // Construir índice rápido de citaciones in por itemId
    const citasIndex = new Map<string, number>()
    for (const item of items) {
      const c = getCitationCount(item.id, graph)
      if (c > 0) citasIndex.set(item.id, c)
    }
    return detectUpdates(items, citasIndex)
  }, [items, graph])

  if (updates.length === 0) return null

  const withChanges = updates.filter(u => u.changes.statusChanged || (u.changes.newCitations ?? 0) > 0)

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-warning-fg">
          <Bell size={11} /> Tus normas seguidas
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg/60 px-2.5 py-0.5 text-[10.5px] font-bold text-warning-fg ring-1 ring-warning-bg">
          {updates.length} seguida{updates.length === 1 ? '' : 's'}
          {withChanges.length > 0 && (
            <span className="ml-1">· {withChanges.length} con cambios</span>
          )}
        </span>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {updates.slice(0, 6).map(u => {
          if (!u.item) return null
          const c = countryByCode(u.item.country)
          const hasChanges = u.changes.statusChanged || (u.changes.newCitations ?? 0) > 0
          return (
            <li key={u.entry.itemId}>
              <button
                onClick={() => navigate(`/radar/${u.entry.itemId}`)}
                className={
                  'group flex w-full items-start gap-3 rounded-2xl p-3 text-left ring-1 transition hover:-translate-y-0.5 ' +
                  (hasChanges
                    ? 'bg-warning-bg/30 ring-warning-bg hover:bg-warning-bg/50'
                    : 'bg-ink-50/40 ring-ink-100 hover:bg-upm-50 hover:ring-upm-100')
                }
              >
                <div className="flex shrink-0 items-center gap-1">
                  <span>{c.flag}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-ink-600">{c.code}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold text-ink-900 line-clamp-1 group-hover:text-upm-800">
                    {u.item.title}
                  </p>
                  {hasChanges && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {u.changes.statusChanged && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-warning-fg ring-1 ring-warning-bg">
                          <Sparkles size={9} /> Estado: {u.changes.statusChanged.to}
                        </span>
                      )}
                      {u.changes.newCitations && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-upm-700 ring-1 ring-upm-100">
                          +{u.changes.newCitations} nuevas citaciones
                        </span>
                      )}
                    </div>
                  )}
                  {!hasChanges && (
                    <p className="mt-0.5 text-[10.5px] text-ink-500">Sin cambios desde que la seguís</p>
                  )}
                </div>
                <ArrowUpRight size={13} className="mt-0.5 text-ink-400 transition group-hover:text-upm-600" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
