import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Calendar, ArrowDown } from 'lucide-react'
import { useCitationGraph } from '@/lib/use-citations'
import { extractLawNumberFromId } from '@/lib/citations'
import { extractArticleModifications } from '@/lib/genealogy'
import { formatDate } from '@/lib/format'
import { countryByCode } from '@/lib/data'
import type { NewsItem } from '@/lib/types'

// Timeline vertical de modificatorias · solo aplicable a leyes nacionales.
// Muestra TODAS las normas que modificaron esta ley a lo largo del tiempo,
// con el detalle de QUÉ artículos cambiaron.
//
// Visualmente: línea vertical con dots por norma modificatoria, fechas a la
// izquierda y card con detalle a la derecha.
export function ModificatoriasTimeline({ item }: { item: NewsItem }) {
  const { graph } = useCitationGraph()
  const num = extractLawNumberFromId(item.id)

  const modificatorias = useMemo(() => {
    if (!num || !graph) return []
    const backlinks = graph.backlinks.get(num) ?? []
    // Filtrar solo los items cuyo fullText menciona una modificación al artículo
    // de esta ley. Reusamos extractArticleModifications sobre cada backlink.
    const result: { item: NewsItem; mods: string[] }[] = []
    for (const bl of backlinks) {
      const mods = extractArticleModifications(bl.item)
      const targets = mods.filter(m => m.leyDestino === num)
      if (targets.length === 0) continue
      // Sub-label: lista de artículos tocados
      const artSet = new Set<string>()
      const verbSet = new Set<string>()
      for (const t of targets) {
        artSet.add(`Art. ${t.articuloDestino}`)
        verbSet.add(t.accion)
      }
      const summary = `${Array.from(verbSet).join(' / ')} ${Array.from(artSet).slice(0, 4).join(', ')}`
      result.push({ item: bl.item, mods: [summary] })
    }
    // Ordenar por fecha asc · cronología
    result.sort((a, b) => (a.item.date ?? '').localeCompare(b.item.date ?? ''))
    return result
  }, [num, graph])

  const navigate = useNavigate()

  if (!num || modificatorias.length === 0) return null

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <History size={11} /> Cronología de modificatorias
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-upm-50 px-2.5 py-0.5 text-[10.5px] font-bold text-upm-700 ring-1 ring-upm-100">
          {modificatorias.length} {modificatorias.length === 1 ? 'modificatoria' : 'modificatorias'} de la Ley {num}
        </span>
      </div>

      <div className="mt-4 relative">
        {/* Línea vertical de fondo */}
        <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-upm-500 to-upm-200" />

        {/* Punto inicial · ley raíz */}
        <div className="relative flex items-start gap-3 pb-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-upm-700 text-white shadow-cta ring-4 ring-white">
            <Calendar size={14} />
          </div>
          <div className="flex-1 rounded-2xl bg-upm-700 p-3 text-white">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">Versión original</div>
            <p className="mt-1 text-[12.5px] font-bold leading-snug">{item.title}</p>
            <p className="mt-0.5 text-[10.5px] text-white/70 tabular-nums">{formatDate(item.date)}</p>
          </div>
        </div>

        {/* Cada modificatoria */}
        {modificatorias.map((m, idx) => {
          const c = countryByCode(m.item.country)
          return (
            <div key={m.item.id} className="relative flex items-start gap-3 pb-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-warning-bg text-warning-fg shadow-card ring-4 ring-white">
                <ArrowDown size={14} />
              </div>
              <button
                onClick={() => navigate(`/radar/${m.item.id}`)}
                className="group flex-1 rounded-2xl bg-white p-3 text-left ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:ring-upm-300 hover:shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-warning-fg">
                    {idx + 1}ª modificación
                  </div>
                  <span className="text-[10.5px] tabular-nums text-ink-500">{formatDate(m.item.date)}</span>
                </div>
                <p className="mt-1 text-[12.5px] font-bold leading-snug text-ink-900 group-hover:text-upm-800 line-clamp-2">
                  {c.flag} {m.item.title}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {m.mods.map((mod, i) => (
                    <span key={i} className="inline-flex items-center rounded-full bg-warning-bg/40 px-2 py-0.5 text-[10.5px] font-semibold text-warning-fg ring-1 ring-warning-bg">
                      {mod}
                    </span>
                  ))}
                </div>
              </button>
            </div>
          )
        })}
      </div>

      <p className="mt-2 text-[10.5px] italic text-ink-500">
        La línea vertical sigue el orden cronológico · cada nodo es una norma que modificó
        artículos específicos de la Ley {num}.
      </p>
    </div>
  )
}
