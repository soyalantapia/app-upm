import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  ExternalLink,
  Flame,
  Hash,
  Network,
  ScrollText,
  Sparkles,
} from 'lucide-react'
import { Badge, Card } from '@/components/ui'
import { countryByCode, topicById } from '@/lib/data'
import { formatDate, formatDateTime } from '@/lib/format'
import { extractContext } from '@/lib/extract-context'
import { buildRelevanceHint, type RelevanceHint } from '@/components/RelevanciaPanel'
import type { NewsItem, Preferences } from '@/lib/types'

const HINT_STYLES: Record<RelevanceHint['tone'], { bg: string; ring: string; text: string; icon: string }> = {
  urgent:      { bg: 'bg-danger-bg/40',  ring: 'ring-danger/30',  text: 'text-danger-fg',  icon: '🔥' },
  priority:    { bg: 'bg-upm-50',        ring: 'ring-upm-200',    text: 'text-upm-800',    icon: '⭐' },
  cross:       { bg: 'bg-info-bg/40',    ring: 'ring-info/30',    text: 'text-info-fg',    icon: '🔗' },
  comparative: { bg: 'bg-info-bg/30',    ring: 'ring-info/20',    text: 'text-info-fg',    icon: '↔️' },
  fiscal:      { bg: 'bg-warning-bg/40', ring: 'ring-warning/30', text: 'text-warning-fg', icon: '💰' },
  neutral:     { bg: 'bg-ink-50',        ring: 'ring-ink-100',    text: 'text-ink-700',    icon: '·' },
}

const RELEVANCE: Record<string, { label: string; tone: 'danger' | 'warning' | 'info' }> = {
  alta: { label: 'alta', tone: 'danger' },
  media: { label: 'media', tone: 'warning' },
  baja: { label: 'baja', tone: 'info' },
}

// Smart Card · evolución de la card del Radar. Suma:
// · Resumen 1-line extraído del articulado (extract-context)
// · Badge "cita N leyes" (extract-context.leyesCitadas)
// · Badge "citada por N normas" (citation graph backlinks)
// · Indicador 🔥 trending si backlinks >= 5
// · Chip de complejidad (extract-context.complejidad)
// · Highlight de search query en title/excerpt
//
// El parent (Radar) computa citationCount una sola vez con useCitationGraph
// y se lo pasa al card, así no hacemos N llamadas al grafo.
export function RadarSmartCard({
  item,
  index,
  citationCount,
  isSaved,
  density,
  searchQuery,
  prefs,
}: {
  item: NewsItem
  index: number
  citationCount: number
  isSaved: boolean
  density: 'comfortable' | 'compact'
  searchQuery?: string
  prefs?: Preferences | null
}) {
  const navigate = useNavigate()
  // Hint inline · 1-línea "¿por qué importa?" según prefs del usuario.
  // null → no se muestra (cuando no hay nada relevante para destacar).
  const hint = useMemo(() => buildRelevanceHint(item, prefs ?? null), [item, prefs])
  const country = countryByCode(item.country)
  const topicMeta = topicById(item.topic)
  const rel = RELEVANCE[item.relevance]

  // Extraer contexto · resumen 1-line + métricas
  const ctx = useMemo(() => extractContext(item.fullText ?? item.excerpt ?? ''), [item.fullText, item.excerpt])
  // Tomar primera oración del resumen (más conciso que el resumen entero)
  const oneLine = useMemo(() => {
    if (!ctx.resumen) return null
    const sentence = ctx.resumen.split(/[.;]\s/)[0]
    return sentence.length > 180 ? sentence.slice(0, 177) + '…' : sentence
  }, [ctx.resumen])

  const trending = citationCount >= 5
  const citasIn = ctx.leyesCitadas.length

  const dateLabel = (() => {
    const conHora = [item.dataAtualizacao, item.dataPublicacao].find(
      d => d && (d.includes('T') || /\d{2}:\d{2}/.test(d)),
    )
    if (conHora) return formatDateTime(conHora)
    return formatDate(item.dataPublicacao ?? item.date)
  })()

  // Compact density · más denso, menos padding
  const cardPaddingClass = density === 'compact' ? 'p-3' : ''

  return (
    <Card
      interactive
      onClick={() => navigate(`/radar/${item.id}`)}
      style={{ animationDelay: `${Math.min(index, 20) * 25}ms` }}
      className={`animate-fade-up ${cardPaddingClass}`}
    >
      <div className={`flex ${density === 'compact' ? 'gap-2' : 'flex-col gap-3 sm:flex-row sm:items-start'}`}>
        {density !== 'compact' && (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-upm-50 text-upm-700">
            <ScrollText size={18} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="brand">{country.flag} {country.code}</Badge>
            <Badge tone="ghost">{topicMeta.shortLabel}</Badge>
            <Badge tone={rel.tone}>Relevancia {rel.label}</Badge>
            <span className="text-[11px] font-bold text-ink-500 tabular-nums">{dateLabel}</span>
            {trending && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-warning-fg ring-1 ring-warning-bg">
                <Flame size={9} /> Citada {citationCount}×
              </span>
            )}
            {!trending && citationCount >= 2 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-upm-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-upm-700 ring-1 ring-upm-100">
                <Network size={9} /> Citada {citationCount}×
              </span>
            )}
            {citasIn > 0 && density !== 'compact' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-600 ring-1 ring-ink-100">
                <Hash size={9} /> Cita {citasIn} ley{citasIn === 1 ? '' : 'es'}
              </span>
            )}
            {density !== 'compact' && ctx.complejidad !== 'simple' && (
              <span
                className={
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ring-1 ' +
                  (ctx.complejidad === 'compleja'
                    ? 'bg-danger-bg/40 text-danger-fg ring-danger-bg'
                    : 'bg-warning-bg/40 text-warning-fg ring-warning-bg')
                }
              >
                <Sparkles size={9} /> {ctx.complejidad}
              </span>
            )}
            {isSaved && <Badge tone="success">Guardado</Badge>}
          </div>

          <h3
            className={
              'mt-2 font-bold leading-snug text-ink-900 ' +
              (density === 'compact' ? 'text-[14.5px]' : 'text-[16px]')
            }
          >
            <Highlighted text={item.title} query={searchQuery} />
          </h3>

          {/* Resumen 1-line · solo en comfortable, suplanta al excerpt original */}
          {density !== 'compact' && oneLine && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600 line-clamp-2">
              <Highlighted text={oneLine} query={searchQuery} />
            </p>
          )}
          {density !== 'compact' && !oneLine && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600 line-clamp-2">
              <Highlighted text={item.excerpt ?? ''} query={searchQuery} />
            </p>
          )}

          {/* Hint de relevancia · 1-línea que responde "¿por qué importa?"
              basado en prefs del usuario + heurística del contenido. */}
          {hint && (() => {
            const style = HINT_STYLES[hint.tone]
            return (
              <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${style.bg} ${style.ring} ${style.text}`}>
                <span aria-hidden>{style.icon}</span>
                <span>{hint.text}</span>
              </div>
            )
          })()}

          {/* Fuente + autoría · simplificada en compact */}
          {density !== 'compact' && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-full bg-success-bg/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-success-fg ring-1 ring-success-bg">
                <BadgeCheck size={9} /> Oficial
              </span>
              <span className="text-ink-500 line-clamp-1 max-w-[300px]">{item.source}</span>
              {item.authors && (
                <span className="text-ink-500 line-clamp-1 max-w-[260px]">· {item.authors}</span>
              )}
              {item.status && (
                <span className="inline-flex items-center gap-1 rounded-md bg-ink-50 px-1.5 py-0.5 text-[10px] font-semibold text-ink-700 ring-1 ring-ink-100">
                  {item.status}
                </span>
              )}
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-upm-700 hover:underline"
                >
                  <ExternalLink size={9} /> ver
                </a>
              )}
            </div>
          )}

          {/* CTA · solo comfortable */}
          {density !== 'compact' && (
            <div className="mt-3 flex justify-end">
              <span className="group/abrir inline-flex items-center gap-1.5 rounded-full bg-upm-50 px-3 py-1.5 text-[12px] font-bold text-upm-700 ring-1 ring-upm-100 transition group-hover:bg-upm-100">
                Abrir detalle
                <ArrowRight size={13} className="transition group-hover/abrir:translate-x-0.5" />
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

// Highlighted: subraya las ocurrencias de la query dentro del texto.
function Highlighted({ text, query }: { text: string; query?: string }) {
  if (!query || query.trim().length < 2) return <>{text}</>
  const q = query.trim()
  // Escape regex specials
  const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Split con flag 'gi' captura todos los matches. Para el test() usamos un
  // regex SIN flag 'g' por part (un regex con 'g' es stateful: re.lastIndex
  // persiste entre llamadas y test() alterna true/false sobre el mismo string).
  const splitRe = new RegExp(`(${safeQ})`, 'gi')
  const matchRe = new RegExp(`^${safeQ}$`, 'i')
  const parts = text.split(splitRe)
  return (
    <>
      {parts.map((p, i) =>
        matchRe.test(p) ? (
          <mark key={`h-${i}-${p.length}`} className="rounded bg-warning-bg/60 px-0.5 text-ink-900">
            {p}
          </mark>
        ) : (
          <span key={`t-${i}-${p.length}`}>{p}</span>
        ),
      )}
    </>
  )
}
