import { useMemo } from 'react'
import {
  Activity,
  Building2,
  ExternalLink,
  FileText,
  Gavel,
  GitCompareArrows,
  Hash,
  MapPin,
  Network,
  Scale,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useCitationGraph } from '@/lib/use-citations'
import { useFallosForItem } from '@/lib/use-jurisprudencia'
import { computeImpact } from '@/lib/impact'
import { groupSectorsByCategory, SECTOR_META } from '@/lib/sectors'
import { extractGlossary } from '@/lib/glossary'
import { formatDate } from '@/lib/format'
import type { NewsItem } from '@/lib/types'

// Mapa de la Ley · panel maestro que ensambla en un solo lugar
// genealogía + reglamentación + jurisprudencia + impacto + sectores + glosario.
export function LawMap({ item }: { item: NewsItem }) {
  const { graph } = useCitationGraph()
  const { fallos, loading: fallosLoading } = useFallosForItem(item.id)

  const impact = useMemo(() => computeImpact(item, graph), [item, graph])
  const sectoresByCat = useMemo(() => groupSectorsByCategory(impact.sectoresDetectados), [impact.sectoresDetectados])
  const glosario = useMemo(() => extractGlossary(item), [item])

  const scoreColor =
    impact.scoreLabel === 'masivo' ? 'text-danger-fg bg-danger-bg/40 ring-danger-bg' :
    impact.scoreLabel === 'alto' ? 'text-warning-fg bg-warning-bg/40 ring-warning-bg' :
    impact.scoreLabel === 'medio' ? 'text-upm-700 bg-upm-50 ring-upm-100' :
    'text-ink-600 bg-ink-50 ring-ink-100'

  return (
    <div className="flex flex-col gap-5">
      {/* Card · Análisis de impacto */}
      <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <TrendingUp size={11} /> Análisis de impacto regulatorio
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${scoreColor}`}>
            <Sparkles size={10} /> Impacto {impact.scoreLabel} · {impact.scoreImpacto}/100
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          <Metric icon={Hash} label="Modifica artículos" value={impact.articulosModificados} />
          <Metric icon={Network} label="Cita leyes" value={impact.leyesCitadasOut} />
          <Metric icon={GitCompareArrows} label="La citan" value={impact.citasIn} accent />
          <Metric icon={FileText} label="Decretos reglament." value={impact.decretosReglamentarios} />
          <Metric icon={Gavel} label="Resoluciones aplic." value={impact.resolucionesAplicativas} />
          <Metric icon={Scale} label="Fallos asociados" value={fallosLoading ? '…' : fallos.length} accent />
          <Metric icon={MapPin} label="Provincias" value={impact.provincias} />
          <Metric icon={Building2} label="Organismos" value={impact.organismos} />
          <Metric icon={Users} label="Sectores" value={impact.sectores} />
          <Metric icon={Activity} label="Países menc." value={impact.paisesMencionados} />
          <Metric icon={FileText} label="Palabras" value={impact.totalPalabras} small />
        </div>
      </div>

      {/* Card · Sectores afectados (si hay) */}
      {impact.sectoresDetectados.length > 0 && (
        <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <Users size={11} /> Sectores y actores mencionados
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {Array.from(sectoresByCat.entries()).map(([cat, sectors]) => {
              const meta = SECTOR_META[cat]
              return (
                <div key={cat} className="flex flex-wrap items-baseline gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-ink-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-ink-700 ring-1 ring-ink-100 shrink-0">
                    {meta.emoji} {meta.label}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {sectors.map(s => (
                      <span key={`${cat}-${s.name}`} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${meta.color}`}>
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Card · Modificaciones específicas (si las hay) */}
      {impact.modificaciones.length > 0 && (
        <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <Network size={11} /> Modificaciones legislativas que introduce
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {impact.modificaciones.slice(0, 10).map((m, i) => (
              <li key={`mod-${i}-${m.leyDestino}-${m.articuloDestino}`} className="flex items-start gap-2 rounded-xl bg-ink-50/40 px-3 py-2 ring-1 ring-ink-100">
                <span className={
                  'mt-0.5 inline-flex h-4 shrink-0 items-center rounded px-1.5 text-[9px] font-bold uppercase tracking-wide ring-1 ' +
                  (m.accion === 'sustituye' ? 'bg-warning-bg/60 text-warning-fg ring-warning-bg' :
                   m.accion === 'incorpora' ? 'bg-success-bg/60 text-success-fg ring-success-bg' :
                   m.accion === 'deroga' ? 'bg-danger-bg/60 text-danger-fg ring-danger-bg' :
                   'bg-upm-50 text-upm-700 ring-upm-100')
                }>
                  {m.accion}
                </span>
                <p className="text-[12.5px] leading-snug text-ink-800">
                  Art. <span className="font-bold">{m.articuloDestino}</span> de la <span className="font-bold">Ley {m.leyDestino}</span>
                </p>
              </li>
            ))}
            {impact.modificaciones.length > 10 && (
              <li className="text-[11px] italic text-ink-500 px-3">
                + {impact.modificaciones.length - 10} modificaciones más en el articulado
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Card · Jurisprudencia asociada */}
      {fallos.length > 0 && (
        <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
              <Scale size={11} /> Jurisprudencia · CSJN
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-upm-700 px-2.5 py-0.5 text-[11px] font-bold text-white">
              {fallos.length} {fallos.length === 1 ? 'fallo' : 'fallos'}
            </span>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {fallos.slice(0, 6).map(f => (
              <li key={f.id} className="rounded-2xl bg-ink-50/40 p-3 ring-1 ring-ink-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-ink-900 line-clamp-2">{f.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-ink-500">
                      <span className="tabular-nums">{formatDate(f.fecha)}</span>
                      <span>·</span>
                      <span>{f.sala}</span>
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-ink-700 line-clamp-3">{f.sumario}</p>
                    {f.tags && f.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {f.tags.slice(0, 4).map(t => (
                          <span key={`${f.id}-tag-${t}`} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-600 ring-1 ring-ink-100">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {f.url && (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-upm-700 ring-1 ring-upm-100 hover:bg-upm-50"
                    >
                      <ExternalLink size={10} /> Ver
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {fallos.length > 6 && (
            <p className="mt-2 text-[11px] italic text-ink-500">
              + {fallos.length - 6} fallos adicionales aplican esta ley
            </p>
          )}
        </div>
      )}

      {/* Card · Glosario (definiciones legales detectadas) */}
      {glosario.length > 0 && (
        <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <FileText size={11} /> Glosario · definiciones del articulado
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {glosario.slice(0, 8).map((g, i) => (
              <div key={`gl-${i}-${g.term.slice(0, 8)}`} className="rounded-xl bg-ink-50/40 p-3 ring-1 ring-ink-100">
                <dt className="text-[12px] font-bold text-ink-900">{g.term}</dt>
                <dd className="mt-1 text-[11.5px] leading-relaxed text-ink-700 line-clamp-4">{g.definition}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  accent,
  small,
}: {
  icon: typeof Hash
  label: string
  value: number | string
  accent?: boolean
  small?: boolean
}) {
  return (
    <div className={'flex flex-col gap-0.5 rounded-2xl p-2.5 ring-1 ' + (accent ? 'bg-upm-50 ring-upm-100' : 'bg-ink-50/40 ring-ink-100')}>
      <div className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wide text-ink-500">
        <Icon size={9} /> {label}
      </div>
      <div className={(small ? 'text-[14px]' : 'text-[18px]') + ' font-bold tabular-nums text-ink-900'}>{value}</div>
    </div>
  )
}
