import { useMemo } from 'react'
import { DollarSign, FileText } from 'lucide-react'
import { detectBudget, BUDGET_TYPE_META, CONTRACT_TYPE_META } from '@/lib/budget'
import type { NewsItem } from '@/lib/types'

// Panel "Inversión y contrataciones" · muestra montos detectados en
// contexto presupuestario + referencias a licitaciones y contrataciones.
export function BudgetPanel({ item }: { item: NewsItem }) {
  const report = useMemo(() => detectBudget(item), [item])

  if (!report.hasFiscalImpact) return null

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-success-fg">
        <DollarSign size={11} /> Inversión, contrataciones y impacto fiscal
      </div>

      {report.budgetRefs.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
            Referencias presupuestarias ({report.budgetRefs.length})
          </div>
          <ul className="mt-2 flex flex-col gap-2">
            {report.budgetRefs.map((ref, i) => {
              const meta = BUDGET_TYPE_META[ref.type]
              return (
                <li key={`b-${i}-${ref.amount}`} className="rounded-2xl bg-success-bg/30 p-3 ring-1 ring-success-bg">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px]">{meta.emoji}</span>
                    <span className="text-[10.5px] font-bold uppercase tracking-wide text-success-fg">{meta.label}</span>
                    <span className="ml-auto rounded-full bg-white px-2.5 py-0.5 text-[13px] font-bold text-success-fg ring-1 ring-success-bg">
                      {ref.amount}
                    </span>
                    <span className="text-[10px] text-ink-500">{ref.currency !== 'unknown' ? ref.currency : ''}</span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] italic leading-relaxed text-ink-700 line-clamp-2">
                    « …{ref.context}… »
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {report.contractRefs.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
            Contrataciones derivadas ({report.contractRefs.length})
          </div>
          <ul className="mt-2 flex flex-col gap-2">
            {report.contractRefs.map((ref, i) => {
              const meta = CONTRACT_TYPE_META[ref.type]
              return (
                <li key={`c-${i}-${(ref.detail ?? '').slice(0, 16)}`} className="rounded-2xl bg-white p-3 ring-1 ring-ink-100">
                  <div className="flex items-center gap-2">
                    <FileText size={11} className="text-ink-500" />
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1 ${meta.color}`}>
                      {meta.label}
                    </span>
                    {ref.detail && (
                      <span className="text-[11px] font-bold tabular-nums text-ink-800">{ref.detail}</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] italic leading-relaxed text-ink-600 line-clamp-2">
                    « …{ref.context}… »
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
