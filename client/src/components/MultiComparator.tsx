import { useEffect, useMemo, useState } from 'react'
import { X, Sparkles, GitCompareArrows, Building2, MapPin, Timer, DollarSign, FileText } from 'lucide-react'
import { countryByCode, topicById } from '@/lib/data'
import { formatDate } from '@/lib/format'
import { extractContext } from '@/lib/extract-context'
import { getOrBuildIndex } from '@/lib/use-similarity'
import { findSimilarItems } from '@/lib/similarity'
import type { CountryCode, NewsItem } from '@/lib/types'

// Multi-país Comparator · modal que compara la norma activa con sus matches
// TF-IDF en HASTA 3 países distintos cross-país. Muestra los 3 lado a lado.
export function MultiComparator({ source, onClose }: { source: NewsItem; onClose: () => void }) {
  const [matches, setMatches] = useState<Map<CountryCode, NewsItem>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getOrBuildIndex()
      .then(index => {
        if (!mounted) return
        const sims = findSimilarItems(source.id, index, { topK: 20, preferCrossCountry: true })
        // Tomar el primer match por cada país distinto al source
        const byCountry = new Map<CountryCode, NewsItem>()
        for (const s of sims) {
          if (s.item.country === source.country) continue
          if (byCountry.has(s.item.country)) continue
          byCountry.set(s.item.country, s.item)
          if (byCountry.size >= 3) break
        }
        setMatches(byCountry)
        setLoading(false)
      })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [source.id])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const allItems = useMemo(() => [source, ...Array.from(matches.values())], [source, matches])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="animate-fade-up w-full max-w-[1400px] rounded-3xl bg-ink-50 p-4 ring-1 ring-ink-200 shadow-floating sm:p-6"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-upm-700 text-white">
              <GitCompareArrows size={16} />
            </div>
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
                <Sparkles size={10} className="inline" /> Comparador multi-país · 3 contrapartes regionales
              </div>
              <h2 className="text-[16px] font-bold text-ink-900">
                Cómo se aborda este tema en hasta 3 países del Mercosur al mismo tiempo
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-ink-100 transition hover:bg-ink-50"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-[480px] rounded-2xl" />)}
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ComparatorCol item={source} role="source" />
              {Array.from(matches.entries()).map(([country, item]) => (
                <ComparatorCol key={country} item={item} role="match" />
              ))}
              {matches.size === 0 && (
                <div className="col-span-3 rounded-2xl bg-white p-8 text-center text-[13px] text-ink-500 ring-1 ring-ink-100">
                  No se encontraron contrapartes en otros países con score suficiente.
                </div>
              )}
            </div>

            {matches.size >= 1 && (
              <MultiDiff items={allItems} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ComparatorCol({ item, role }: { item: NewsItem; role: 'source' | 'match' }) {
  const country = countryByCode(item.country)
  const topic = topicById(item.topic)
  const ctx = useMemo(() => extractContext(item.fullText), [item.fullText])

  return (
    <div className={`flex flex-col gap-2.5 rounded-2xl bg-white p-3 ring-1 ${role === 'source' ? 'ring-upm-300' : 'ring-ink-100'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${role === 'source' ? 'bg-upm-700 text-white ring-upm-700' : 'bg-upm-50 text-upm-700 ring-upm-100'}`}>
          {country.flag} {country.code}
          {role === 'source' && <span className="ml-0.5 text-[8.5px] opacity-80">(origen)</span>}
        </span>
        <span className="text-[10px] tabular-nums text-ink-500">{formatDate(item.date)}</span>
      </div>
      <h3 className="text-[12.5px] font-bold leading-snug text-ink-900 line-clamp-3">{item.title}</h3>
      <div className="flex flex-wrap items-center gap-1 text-[9.5px]">
        <span className="rounded-md bg-ink-50 px-1.5 py-0.5 font-bold text-ink-700 ring-1 ring-ink-100">{topic.shortLabel}</span>
        {item.tipoDocumento && (
          <span className="rounded-md bg-ink-50 px-1.5 py-0.5 font-semibold text-ink-600 ring-1 ring-ink-100">{item.tipoDocumento.slice(0, 20)}</span>
        )}
      </div>
      {ctx.resumen && (
        <div className="rounded-xl bg-upm-50/30 p-2 ring-1 ring-upm-100">
          <div className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-upm-700">Resumen</div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink-800 line-clamp-4">{ctx.resumen}</p>
        </div>
      )}
      <CompactSection icon={Building2} label="Organismos" items={ctx.instituciones.slice(0, 3)} />
      <CompactSection icon={MapPin} label="Lugares" items={ctx.provincias.slice(0, 3)} />
      <CompactSection icon={Timer} label="Plazos" items={ctx.plazos.slice(0, 2)} />
      <CompactSection icon={DollarSign} label="Montos" items={ctx.montos.slice(0, 2)} />
      <div className="mt-auto flex items-center gap-2 border-t border-ink-100 pt-1.5 text-[9.5px] text-ink-500">
        <FileText size={9} /> {ctx.totalPalabras}w · {ctx.complejidad}
      </div>
    </div>
  )
}

function CompactSection({ icon: Icon, label, items }: { icon: typeof Building2; label: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <div className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
        <Icon size={8} /> {label}
      </div>
      <div className="mt-0.5 flex flex-wrap gap-0.5">
        {items.map((s, i) => (
          <span key={`it-${i}-${s.slice(0, 6)}`} className="inline-flex items-center rounded-full bg-upm-50/60 px-1.5 py-0.5 text-[9.5px] font-semibold text-upm-800 ring-1 ring-upm-100">
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

// Resumen comparativo · organismos en común vs únicos por país
function MultiDiff({ items }: { items: NewsItem[] }) {
  const contexts = items.map(item => ({
    item,
    ctx: extractContext(item.fullText),
  }))
  // Organismos comunes a todos
  const commonOrgs = contexts.reduce<string[]>((acc, c, i) => {
    if (i === 0) return [...c.ctx.instituciones]
    return acc.filter(o => c.ctx.instituciones.includes(o))
  }, [])

  return (
    <div className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-ink-100">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
        Análisis comparativo regional
      </div>
      {commonOrgs.length > 0 ? (
        <div className="mt-2">
          <p className="text-[11px] font-semibold text-ink-700">
            Organismos involucrados en común ({commonOrgs.length}):
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {commonOrgs.slice(0, 8).map((o, i) => (
              <span key={`co-${i}`} className="rounded-full bg-success-bg/40 px-2 py-0.5 text-[10.5px] font-semibold text-success-fg ring-1 ring-success-bg">
                {o}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] italic text-ink-500">
          Sin organismos compartidos · cada país tiene su propio andamiaje institucional para este tema.
        </p>
      )}
    </div>
  )
}
