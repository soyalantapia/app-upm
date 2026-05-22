import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, TrendingUp } from 'lucide-react'
import { useLiveFeed } from '@/lib/use-live-feed'
import { detectBudget } from '@/lib/budget'
import { countryByCode } from '@/lib/data'
import type { NewsItem } from '@/lib/types'

// Ranking de normas por impacto presupuestario · cuenta cantidad de referencias
// presupuestarias + contrataciones detectadas en cada item del corpus.
export function BudgetRanking() {
  const navigate = useNavigate()
  const { feed } = useLiveFeed()

  const ranked = useMemo(() => {
    const items = feed?.items ?? []
    const out: { item: NewsItem; budgetCount: number; contractCount: number; total: number }[] = []
    for (const item of items) {
      const r = detectBudget(item)
      if (!r.hasFiscalImpact) continue
      const total = r.budgetRefs.length + r.contractRefs.length
      out.push({
        item,
        budgetCount: r.budgetRefs.length,
        contractCount: r.contractRefs.length,
        total,
      })
    }
    out.sort((a, b) => b.total - a.total)
    return out.slice(0, 15)
  }, [feed?.items])

  if (ranked.length === 0) return null

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-success-fg">
        <DollarSign size={11} /> Top normas con mayor impacto presupuestario
      </div>
      <p className="mt-1 text-[11px] text-ink-500">
        Ranking según cantidad de referencias a inversión, partidas, subsidios y contrataciones detectadas en el texto.
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {ranked.map((r, idx) => {
          const c = countryByCode(r.item.country)
          return (
            <li key={r.item.id}>
              <button
                onClick={() => navigate(`/radar/${r.item.id}`)}
                className="group flex w-full items-center gap-3 rounded-2xl bg-ink-50/40 p-3 text-left ring-1 ring-ink-100 transition hover:bg-success-bg/30 hover:ring-success-bg"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-success-fg text-[11px] font-bold text-white">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10.5px]">
                    <span className="rounded-md bg-white px-1.5 py-0.5 font-bold text-ink-700 ring-1 ring-ink-100">
                      {c.flag} {c.code}
                    </span>
                    {r.item.tipoDocumento && (
                      <span className="rounded-md bg-white px-1.5 py-0.5 font-semibold text-ink-600 ring-1 ring-ink-100">
                        {r.item.tipoDocumento}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-bg/60 px-1.5 py-0.5 font-bold text-success-fg ring-1 ring-success-bg">
                      <TrendingUp size={9} /> {r.budgetCount} presup. · {r.contractCount} contrat.
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] font-bold leading-snug text-ink-900 line-clamp-1 group-hover:text-success-fg">
                    {r.item.title}
                  </p>
                </div>
                <span className="rounded-full bg-success-fg px-2 py-0.5 text-[12px] font-bold tabular-nums text-white">
                  {r.total}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
