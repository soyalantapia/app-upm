import { useMemo } from 'react'
import { ArrowRight, GitBranch, Sparkles } from 'lucide-react'
import type { NewsItem } from '@/lib/types'
import {
  extractArticleModifications,
  buildArticleBacklinkIndex,
  type ArticleBacklink,
} from '@/lib/genealogy'

// GenealogyBreadcrumb · Muestra arriba del detalle la línea de descendencia
// regulatoria de la ley: madres (leyes que esta modifica) → ESTA → hijas
// (leyes que modifican a esta). Click en un nodo navega a esa ley.
//
// Si la ley no tiene madres ni hijas detectables, no renderiza nada.

type Node = {
  ley: NewsItem
  // Cuántos artículos involucra la relación (para mostrar como badge)
  count: number
}

function findLawByNumber(laws: NewsItem[], num: string): NewsItem | undefined {
  return laws.find(l =>
    l.id === `ar-ley-${num}` ||
    l.id === `uy-ley-${num}` ||
    l.id === `ar-ley-infoleg-${num}`,
  )
}

export function GenealogyBreadcrumb({
  item,
  laws,
  onSelect,
}: {
  item: NewsItem
  laws: NewsItem[]
  onSelect: (lawId: string) => void
}) {
  // Madres · leyes que ESTA ley modifica (outbound)
  const madres: Node[] = useMemo(() => {
    const mods = extractArticleModifications(item)
    const byLey = new Map<string, number>()
    for (const m of mods) {
      byLey.set(m.leyDestino, (byLey.get(m.leyDestino) ?? 0) + 1)
    }
    const out: Node[] = []
    for (const [leyNum, count] of byLey) {
      const ley = findLawByNumber(laws, leyNum)
      if (ley) out.push({ ley, count })
    }
    return out.sort((a, b) => b.count - a.count).slice(0, 3)
  }, [item, laws])

  // Hijas · leyes que modifican a ESTA (inbound)
  const hijas: Node[] = useMemo(() => {
    // Solo construimos el index si la ley activa tiene un número detectable
    const num = item.id.match(/^(?:ar|uy)-ley(?:-infoleg)?-(\d{4,5})$/)?.[1]
    if (!num) return []
    // Construir índice solo de las leyes que potencialmente podrían citar
    // (filtramos por las que tienen "ley {num}" en su fullText para perf).
    const candidates = laws.filter(l => {
      if (l.id === item.id) return false
      const t = (l.fullText ?? '') + ' ' + (l.title ?? '')
      return new RegExp(`ley\\s+(?:n[°º\\.]?\\s*)?${num.slice(0,2)}[\\.\\s]?${num.slice(2)}`, 'i').test(t)
    })
    if (candidates.length === 0) return []
    const index = buildArticleBacklinkIndex(candidates)
    const byLey = new Map<string, { modifier: NewsItem; count: number }>()
    for (const [key, backlinks] of index) {
      const [leyNum] = key.split('|')
      if (leyNum !== num) continue
      for (const bl of backlinks) {
        const ex = byLey.get(bl.modifier.id)
        if (ex) ex.count++
        else byLey.set(bl.modifier.id, { modifier: bl.modifier, count: 1 })
      }
    }
    return [...byLey.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(({ modifier, count }) => ({ ley: modifier, count }))
  }, [item, laws])

  // Si no hay nada que mostrar, no renderizar
  if (madres.length === 0 && hijas.length === 0) return null

  const lawShortName = (l: NewsItem) => {
    const m = l.id.match(/^(?:ar|uy)-ley(?:-infoleg)?-(\d{4,5})$/)
    return m ? `Ley ${m[1]}` : (l.tipoDocumento ?? l.title.slice(0, 30))
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-upm-50/80 to-white p-3.5 ring-1 ring-upm-100 shadow-card">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
        <GitBranch size={11} /> Genealogía regulatoria
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-2 text-[12px]">
        {/* Madres */}
        {madres.length > 0 && (
          <>
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-500">Modifica:</span>
            {madres.map(m => (
              <button
                key={m.ley.id}
                onClick={() => onSelect(m.ley.id)}
                className="group inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11.5px] font-bold text-upm-800 ring-1 ring-upm-200 transition hover:-translate-y-0.5 hover:bg-upm-50"
                title={m.ley.title}
              >
                {lawShortName(m.ley)}
                {m.count > 1 && (
                  <span className="rounded bg-upm-100 px-1 text-[10px] tabular-nums text-upm-700">{m.count} arts</span>
                )}
              </button>
            ))}
            <ArrowRight size={13} className="text-ink-400" />
          </>
        )}

        {/* ESTA ley */}
        <span className="inline-flex items-center gap-1 rounded-full bg-upm-700 px-2.5 py-1 text-[11.5px] font-bold text-white ring-1 ring-upm-700 shadow-cta">
          <Sparkles size={11} />
          {lawShortName(item)} <span className="opacity-70">· esta ley</span>
        </span>

        {/* Hijas */}
        {hijas.length > 0 && (
          <>
            <ArrowRight size={13} className="text-ink-400" />
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-500">Modificada por:</span>
            {hijas.map(h => (
              <button
                key={h.ley.id}
                onClick={() => onSelect(h.ley.id)}
                className="group inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11.5px] font-bold text-warning-fg ring-1 ring-warning/30 transition hover:-translate-y-0.5 hover:bg-warning-bg/30"
                title={h.ley.title}
              >
                {lawShortName(h.ley)}
                {h.count > 1 && (
                  <span className="rounded bg-warning-bg px-1 text-[10px] tabular-nums">{h.count} arts</span>
                )}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export type { ArticleBacklink }
