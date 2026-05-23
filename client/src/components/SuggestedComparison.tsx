import { GitCompareArrows, Sparkles, ArrowRight } from 'lucide-react'
import type { NewsItem } from '@/lib/types'
import { countryByCode } from '@/lib/data'
import { useSimilarItems } from '@/lib/use-similarity'

// SuggestedComparison · Mini-hero arriba del detalle de Leyes que destaca
// la mejor equivalente cross-país detectada automáticamente (TF-IDF).
// 1 click → abre el LawComparator side-by-side.
//
// Hace lo que SimilarItemsPanel hace abajo, pero como CTA destacado para que
// el legislador descubra la feature sin tener que scrollear.

export function SuggestedComparison({
  item,
  onCompare,
}: {
  item: NewsItem
  onCompare: () => void
}) {
  const { similar, loading } = useSimilarItems(item.id, 8)

  if (loading) return null

  // Buscar el mejor match cross-country
  const crossMatch = similar.find(s => s.item.country !== item.country)
  if (!crossMatch) return null

  const sourceCountry = countryByCode(item.country)
  const matchCountry = countryByCode(crossMatch.item.country)
  // Score 0-1 → porcentaje legible
  const matchPct = Math.round(crossMatch.score * 100)

  return (
    <button
      onClick={onCompare}
      className="group flex w-full items-center gap-3 rounded-2xl bg-gradient-to-br from-warning-bg/30 to-upm-50/50 p-3.5 text-left ring-1 ring-warning/20 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-floating"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning text-warning-fg">
        <GitCompareArrows size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-warning-fg">
          <Sparkles size={10} /> Equivalente en la región · {matchPct}% similar
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[13px] font-bold text-ink-900">
          <span className="shrink-0">{sourceCountry.flag}</span>
          <span className="text-ink-500">←→</span>
          <span className="shrink-0">{matchCountry.flag}</span>
          <span className="line-clamp-1">{crossMatch.item.title}</span>
        </div>
        <div className="mt-0.5 line-clamp-1 text-[11px] text-ink-500">
          {crossMatch.item.source}
        </div>
      </div>
      <div className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-bold text-upm-700">
        Comparar <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
      </div>
    </button>
  )
}
