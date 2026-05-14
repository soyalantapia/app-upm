import { useEffect, useState, useMemo } from 'react'
import { X, GitCompareArrows, Sparkles, FileText, Building2, Timer, DollarSign, MapPin } from 'lucide-react'
import { countryByCode, topicById } from '@/lib/data'
import { formatDate } from '@/lib/format'
import { extractContext } from '@/lib/extract-context'
import { getOrBuildIndex } from '@/lib/use-similarity'
import { findSimilarItems } from '@/lib/similarity'
import type { NewsItem } from '@/lib/types'

// Modal full-screen para comparar la ley activa contra su match TF-IDF #1
// cross-país. Side-by-side: resumen, organismos, plazos, montos, lugares.
export function LawComparator({
  source,
  onClose,
}: {
  source: NewsItem
  onClose: () => void
}) {
  const [counterpart, setCounterpart] = useState<NewsItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [alternatives, setAlternatives] = useState<NewsItem[]>([])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getOrBuildIndex()
      .then(index => {
        if (!mounted) return
        const sims = findSimilarItems(source.id, index, { topK: 10, preferCrossCountry: true })
        // Preferir match en otro país; si no hay cross-país, caer al top match.
        const chosen = sims.find(s => s.item.country !== source.country) ?? sims[0]
        const chosenId = chosen?.item.id
        setCounterpart(chosen?.item ?? null)
        setAlternatives(
          sims
            .filter(s => s.item.id !== chosenId)
            .slice(0, 4)
            .map(s => s.item),
        )
        setLoading(false)
      })
      .catch(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [source.id])

  // Prevent body scroll cuando el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="animate-fade-up w-full max-w-[1100px] rounded-3xl bg-ink-50 p-4 ring-1 ring-ink-200 shadow-floating sm:p-6"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-upm-700 text-white">
              <GitCompareArrows size={16} />
            </div>
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
                <Sparkles size={10} className="inline" /> Comparador regional · Match TF·IDF
              </div>
              <h2 className="text-[16px] font-bold text-ink-900">
                Cómo se aborda este tema en otro país del Mercosur
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
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="skeleton h-[480px] rounded-2xl" />
            <div className="skeleton h-[480px] rounded-2xl" />
          </div>
        ) : !counterpart ? (
          <div className="mt-6 rounded-2xl bg-white p-8 text-center text-[13px] text-ink-500 ring-1 ring-ink-100">
            No se encontró una contraparte regional con score suficiente.
            Esta norma puede ser muy específica del ordenamiento nacional.
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <CompareCol item={source} side="A" />
              <CompareCol item={counterpart} side="B" />
            </div>

            {/* Diferencia clave · organismos en uno y no en otro */}
            <DiffSummary a={source} b={counterpart} />

            {alternatives.length > 0 && (
              <div className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-ink-100">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
                  Otras opciones de comparación
                </div>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {alternatives.map(alt => {
                    const c = countryByCode(alt.country)
                    return (
                      <li key={alt.id}>
                        <button
                          onClick={() => setCounterpart(alt)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-upm-50 px-2.5 py-1 text-[11px] font-semibold text-upm-800 ring-1 ring-upm-100 hover:bg-upm-100"
                        >
                          {c.flag} {c.code} · <span className="max-w-[280px] truncate">{alt.title.slice(0, 60)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CompareCol({ item, side }: { item: NewsItem; side: 'A' | 'B' }) {
  const country = countryByCode(item.country)
  const topic = topicById(item.topic)
  const ctx = useMemo(() => extractContext(item.fullText), [item.fullText])

  return (
    <div className={`flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink-100 ${side === 'A' ? '' : 'ring-upm-100'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-upm-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-upm-700 ring-1 ring-upm-100">
          {country.flag} {country.name}
        </span>
        <span className="text-[10.5px] tabular-nums text-ink-500">{formatDate(item.date)}</span>
      </div>
      <h3 className="text-[14px] font-bold leading-snug text-ink-900">{item.title}</h3>
      <div className="flex flex-wrap items-center gap-1 text-[10.5px]">
        <span className="rounded-md bg-ink-50 px-1.5 py-0.5 font-bold text-ink-700 ring-1 ring-ink-100">{topic.label}</span>
        {item.tipoDocumento && (
          <span className="rounded-md bg-ink-50 px-1.5 py-0.5 font-semibold text-ink-600 ring-1 ring-ink-100">{item.tipoDocumento}</span>
        )}
      </div>

      {ctx.resumen && (
        <div className="rounded-xl bg-upm-50/30 p-2.5 ring-1 ring-upm-100">
          <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-upm-700">Resumen</div>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-800 line-clamp-5">{ctx.resumen}</p>
        </div>
      )}

      <CompareSection icon={Building2} label="Organismos" items={ctx.instituciones.slice(0, 5)} />
      <CompareSection icon={MapPin} label="Lugares" items={ctx.provincias.slice(0, 5)} />
      <CompareSection icon={Timer} label="Plazos" items={ctx.plazos.slice(0, 4)} />
      <CompareSection icon={DollarSign} label="Montos" items={ctx.montos.slice(0, 4)} />

      <div className="mt-auto flex items-center gap-2 border-t border-ink-100 pt-2 text-[10.5px] text-ink-500">
        <FileText size={10} /> {ctx.totalPalabras} palabras · Complejidad{' '}
        <span className="font-bold">{ctx.complejidad}</span>
      </div>
    </div>
  )
}

function CompareSection({ icon: Icon, label, items }: { icon: typeof Building2; label: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
        <Icon size={10} /> {label}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.map((s, i) => (
          <span
            key={`it-${i}-${s.slice(0, 8)}`}
            className="inline-flex items-center rounded-full bg-upm-50/60 px-2 py-0.5 text-[10.5px] font-semibold text-upm-800 ring-1 ring-upm-100"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

function DiffSummary({ a, b }: { a: NewsItem; b: NewsItem }) {
  const ctxA = extractContext(a.fullText)
  const ctxB = extractContext(b.fullText)
  const onlyA = ctxA.instituciones.filter(i => !ctxB.instituciones.includes(i))
  const onlyB = ctxB.instituciones.filter(i => !ctxA.instituciones.includes(i))
  if (onlyA.length === 0 && onlyB.length === 0) return null
  return (
    <div className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-ink-100">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
        Diferencia clave · organismos en uno y no en el otro
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {onlyA.length > 0 && (
          <div>
            <span className="text-[10px] font-bold text-success-fg">Solo en {countryByCode(a.country).code}:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {onlyA.slice(0, 4).map((o, i) => (
                <span key={`a-${i}`} className="rounded-full bg-success-bg/40 px-2 py-0.5 text-[10.5px] font-semibold text-success-fg ring-1 ring-success-bg">
                  {o}
                </span>
              ))}
            </div>
          </div>
        )}
        {onlyB.length > 0 && (
          <div>
            <span className="text-[10px] font-bold text-upm-700">Solo en {countryByCode(b.country).code}:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {onlyB.slice(0, 4).map((o, i) => (
                <span key={`b-${i}`} className="rounded-full bg-upm-50 px-2 py-0.5 text-[10.5px] font-semibold text-upm-800 ring-1 ring-upm-100">
                  {o}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
