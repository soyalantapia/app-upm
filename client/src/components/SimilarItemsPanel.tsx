import { Link } from 'react-router-dom'
import { GitCompareArrows, Globe, Sparkles } from 'lucide-react'
import { countryByCode, topicById } from '@/lib/data'
import { formatDate } from '@/lib/format'
import { useSimilarItems } from '@/lib/use-similarity'
import type { NewsItem } from '@/lib/types'

// Panel "Normas equivalentes en la región" · usa TF-IDF + coseno cross-país
// para mostrar las 6 normas más similares en cualquier país del Mercosur.
//
// basePath aparece en la API por compatibilidad pero los links siempre apuntan
// a /radar/:id (la única ruta de detalle dinámico que renderiza cualquier item).
export function SimilarItemsPanel({
  itemId,
}: {
  itemId: string
  basePath?: '/radar' | '/leyes'
}) {
  const { similar, loading } = useSimilarItems(itemId, 6)

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <GitCompareArrows size={11} /> Normas equivalentes en la región
        </div>
        <div className="rounded-2xl bg-upm-50/30 p-4 ring-1 ring-upm-100">
          <p className="text-[12px] text-ink-500 inline-flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-upm-400" />
            Calculando similaridad TF·IDF sobre los 1601 ítems del corpus regional…
          </p>
        </div>
      </div>
    )
  }

  if (similar.length === 0) {
    return null
  }

  // Calcular cuántos países distintos hay (excluyendo el del item original) · métrica de cobertura
  const paisesUnicos = new Set(similar.map(s => s.item.country))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <GitCompareArrows size={11} /> Normas equivalentes en la región
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-upm-50 px-2 py-0.5 text-[10px] font-bold text-upm-700 ring-1 ring-upm-100">
          <Sparkles size={9} /> Match TF·IDF
        </span>
      </div>
      <p className="text-[11.5px] text-ink-500">
        {similar.length} normas en {paisesUnicos.size} {paisesUnicos.size === 1 ? 'país' : 'países'} con
        contenido normativo similar a este texto, ordenadas por afinidad semántica.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {similar.map(({ item, score }) => (
          <li key={item.id}>
            <SimilarCard item={item} score={score} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function SimilarCard({
  item,
  score,
}: {
  item: NewsItem
  score: number
}) {
  const country = countryByCode(item.country)
  const topic = topicById(item.topic)
  const pct = Math.round(score * 100)
  // Color del badge por nivel de match
  const matchTone =
    pct >= 40 ? 'bg-success-bg/60 text-success-fg ring-success-bg' :
    pct >= 25 ? 'bg-upm-50 text-upm-700 ring-upm-100' :
    'bg-ink-50 text-ink-600 ring-ink-100'

  return (
    <Link
      to={`/radar/${item.id}`}
      className="group block h-full rounded-2xl bg-white p-3 ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:ring-upm-300 hover:shadow-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-md bg-upm-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-upm-700 ring-1 ring-upm-100">
            <Globe size={8} /> {country.flag} {country.code}
          </span>
          <span className="inline-flex rounded-md bg-ink-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-ink-600 ring-1 ring-ink-100">
            {topic.label}
          </span>
        </div>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ring-1 ${matchTone}`}>
          {pct}%
        </span>
      </div>
      <h4 className="mt-2 text-[13px] font-semibold leading-snug text-ink-900 line-clamp-2 group-hover:text-upm-800">
        {item.title}
      </h4>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-ink-500 tabular-nums">
        <span>{formatDate(item.date)}</span>
        {item.tipoDocumento && (
          <>
            <span>·</span>
            <span className="line-clamp-1">{item.tipoDocumento}</span>
          </>
        )}
      </div>
    </Link>
  )
}
