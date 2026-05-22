import { useMemo } from 'react'
import { Building2 } from 'lucide-react'
import { useLiveFeed } from '@/lib/use-live-feed'
import { detectSectors, SECTOR_META, type Sector, type SectorCategory } from '@/lib/sectors'

// Heatmap de sectores económicos · ranking de qué entidades/sectores aparecen
// más mencionados en el corpus completo. Bar chart horizontal con conteo y
// distribución por categoría.
export function SectorHeatmap() {
  const { feed } = useLiveFeed()
  const items = feed?.items ?? []

  const { ranked, byCategory } = useMemo(() => {
    const counts = new Map<string, { sector: Sector; count: number }>()
    for (const item of items) {
      const sectors = detectSectors(item)
      for (const s of sectors) {
        const key = `${s.category}|${s.name}`
        const existing = counts.get(key)
        if (existing) existing.count++
        else counts.set(key, { sector: s, count: 1 })
      }
    }
    const ranked = Array.from(counts.values()).sort((a, b) => b.count - a.count)
    // Por categoría
    const byCategory = new Map<SectorCategory, number>()
    for (const r of ranked) {
      byCategory.set(r.sector.category, (byCategory.get(r.sector.category) ?? 0) + r.count)
    }
    return { ranked, byCategory }
  }, [items])

  if (ranked.length === 0) return null

  const maxCount = ranked[0]?.count ?? 1
  const top30 = ranked.slice(0, 30)
  const catRanked = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])
  const maxCat = catRanked[0]?.[1] ?? 1

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
        <Building2 size={11} /> Sectores y actores más regulados del corpus
      </div>

      {/* Por categoría · primero */}
      <div className="mt-3">
        <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-500">Por categoría</div>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {catRanked.map(([cat, count]) => {
            const meta = SECTOR_META[cat]
            const pct = (count / maxCat) * 100
            return (
              <li key={cat} className="flex items-center gap-2 text-[11.5px]">
                <span className="text-[13px] w-5">{meta.emoji}</span>
                <span className="font-bold w-24 text-ink-700">{meta.label}</span>
                <div className="flex-1 h-2 rounded-full bg-ink-50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-upm-500 to-upm-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="font-bold tabular-nums w-10 text-right text-ink-800">{count}</span>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Top 30 entidades · cards densas */}
      <div className="mt-4">
        <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
          Top entidades mencionadas ({top30.length})
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {top30.map(r => {
            const meta = SECTOR_META[r.sector.category]
            // Tamaño de fuente proporcional al count (estilo tag cloud light)
            const size = r.count >= maxCount * 0.7 ? 'text-[13px]' :
                         r.count >= maxCount * 0.4 ? 'text-[12px]' :
                         r.count >= maxCount * 0.2 ? 'text-[11px]' :
                         'text-[10.5px]'
            return (
              <span
                key={`${r.sector.category}-${r.sector.name}`}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-bold ring-1 ${meta.color} ${size}`}
                title={`${meta.label} · mencionada en ${r.count} normas`}
              >
                <span>{meta.emoji}</span>
                <span>{r.sector.name}</span>
                <span className="tabular-nums opacity-70">{r.count}</span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
