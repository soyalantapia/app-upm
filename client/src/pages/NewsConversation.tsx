import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Activity,
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarDays,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  MapPin,
  MessageSquareText,
  ScrollText,
  Share2,
  Sparkles,
  Tag,
  Timer,
  Users,
} from 'lucide-react'
import { Badge, Eyebrow } from '@/components/ui'
import { countryByCode, topicById } from '@/lib/data'
import { formatDate, formatDateTime } from '@/lib/format'
import { store, useStore } from '@/lib/store'
import { shareLink } from '@/lib/share'
import { useNewsItem } from '@/lib/use-news-item'
import { extractContext } from '@/lib/extract-context'
import { SimilarItemsPanel } from '@/components/SimilarItemsPanel'
import { BacklinksPanel } from '@/components/BacklinksPanel'
import { LawMap } from '@/components/LawMap'
import { RegulatoryConstellation } from '@/components/RegulatoryConstellation'
import { AuthorChips } from '@/components/AuthorChips'
import { NotesPanel } from '@/components/NotesPanel'
import { ExportLawButton } from '@/components/ExportLawButton'
import { WatchToggleButton } from '@/components/WatchToggleButton'
import { TramitacionFlow } from '@/components/TramitacionFlow'
import { BudgetPanel } from '@/components/BudgetPanel'
import { VotosBRPanel } from '@/components/VotosBRPanel'
import { ModificatoriasTimeline } from '@/components/ModificatoriasTimeline'

export function NewsConversationPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { item, loading, enriching } = useNewsItem(id)
  const isSaved = useStore(s => (item ? s.saved.some(i => i.ref === item.id) : false))
  // Contexto extraído antes de early returns para respetar Rules of Hooks
  const ctx = useMemo(() => extractContext(item?.fullText), [item?.fullText])

  if (loading) {
    return (
      <div className="animate-fade-up mx-auto flex w-full max-w-[820px] flex-col gap-4 px-4 py-6">
        <div className="flex items-center gap-2 text-[12.5px] text-ink-500">
          <span className="h-2 w-2 animate-pulse-soft rounded-full bg-upm-400" />
          Cargando información completa de la novedad…
        </div>
        <div className="skeleton h-64 w-full rounded-3xl" />
      </div>
    )
  }

  if (!item) {
    // Si la URL apunta a una ley nacional (id `ar-ley-XXXX` o `uy-ley-XXXX`) que
    // no está en el corpus, ofrecemos buscar en /leyes con ese número.
    const leyMatch = id?.match(/^(?:ar|uy)-ley-(\d{4,5})$/)
    const numero = leyMatch?.[1]
    return (
      <div className="animate-fade-up mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-10">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-ink-100 shadow-card sm:p-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-warning-fg ring-1 ring-warning-bg">
            Norma no indexada
          </div>
          <h1 className="mt-3 text-[22px] font-bold leading-tight tracking-tight text-ink-900">
            {numero
              ? `La Ley ${numero} no está en el corpus actual`
              : 'Esta norma no está disponible en el corpus'}
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">
            {numero
              ? `Probablemente sea anterior al rango cubierto por nuestras fuentes oficiales (HCDN AR cubre desde la Ley 25.000+, Parlamento UY desde la 19.000+). Aunque no podamos abrir su ficha, otras normas en el corpus pueden citarla.`
              : 'El identificador no matchea ninguna norma del feed actual. Volvé al Radar para buscar.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/radar"
              className="inline-flex items-center gap-1.5 rounded-full bg-upm-700 px-4 py-2 text-[12.5px] font-semibold text-white shadow-cta transition hover:-translate-y-0.5"
            >
              <ArrowLeft size={13} /> Volver al Radar
            </Link>
            {numero && (
              <button
                onClick={() => navigate(`/leyes?q=${numero}`)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12.5px] font-semibold text-upm-700 ring-1 ring-upm-100 transition hover:bg-upm-50"
              >
                Buscar Ley {numero} en /leyes
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const news = item
  const country = countryByCode(news.country)
  const topic = topicById(news.topic)
  const relTone = news.relevance === 'alta' ? 'danger' : news.relevance === 'media' ? 'warning' : 'info'

  const handleSave = () => {
    if (isSaved) {
      const i = store.getSnapshot().saved.find(x => x.ref === news.id)
      if (i) {
        store.removeSaved(i.id)
        store.pushToast('info', 'Eliminado de tu carpeta')
      }
    } else {
      store.saveItem({
        id: 'sav-news-' + news.id,
        type: 'novedad',
        title: news.title,
        ref: news.id,
        meta: { country: news.country, topic: news.topic, relevance: news.relevance, date: news.date },
      })
      store.pushToast('success', 'Novedad guardada en tu carpeta')
    }
  }

  const fmt = (d?: string) => (d ? formatDate(d) : null)

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[820px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/radar" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-upm-700 hover:text-upm-800">
          <ArrowLeft size={14} /> Volver al Radar
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => shareLink(news.title, `/radar/${news.id}`)}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 hover:text-upm-700"
          >
            <Share2 size={12} /> Compartir
          </button>
          <WatchToggleButton item={news} variant="compact" />
          <ExportLawButton item={news} variant="compact" />
          <button
            onClick={handleSave}
            className={
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ' +
              (isSaved
                ? 'bg-success-bg text-success-fg ring-1 ring-success-bg hover:bg-success-bg/80'
                : 'bg-white text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 hover:text-upm-700')
            }
          >
            {isSaved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
            {isSaved ? 'Guardado' : 'Guardar'}
          </button>
          <button
            onClick={() => {
              store.pushToast('info', 'El Asistente preparó preguntas sobre este tema')
              navigate('/asistente')
            }}
            className="group inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-upm-500 to-upm-700 px-3 py-1.5 text-[12px] font-semibold text-white shadow-cta transition hover:-translate-y-0.5 hover:shadow-floating"
          >
            <MessageSquareText size={12} />
            <span className="hidden sm:inline">Hablar con Asistente</span>
            <span className="sm:hidden">Asistente</span>
            <span className="transition group-hover:translate-x-0.5">→</span>
          </button>
        </div>
      </div>

      {/* Identificación + Fuente verificada · barra compacta sobre el article */}
      <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 ring-1 ring-ink-100 shadow-card sm:p-3.5">
        {/* Chips de metadata oficial · siempre incluye fecha de publicación */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px]">
          {/* Fecha de publicación · siempre visible (usa dataPublicacao si está, sino date del feed) */}
          <MetaChip
            icon={CalendarDays}
            label="Publicación"
            value={fmt(news.dataPublicacao ?? news.date) ?? formatDate(news.date)}
          />
          {news.tipoDocumento && (
            <MetaChip icon={Hash} label="Identificación" value={news.tipoDocumento} />
          )}
          {news.tipoConteudo && news.tipoConteudo !== news.tipoDocumento && (
            <MetaChip icon={FileText} label="Tipo" value={news.tipoConteudo} />
          )}
          {news.authors && (
            <MetaChip icon={Users} label="Autoría" value={news.authors} truncate />
          )}
          {fmt(news.dataAtualizacao) && fmt(news.dataAtualizacao) !== fmt(news.dataPublicacao ?? news.date) && (
            <MetaChip icon={Clock} label="Actualización" value={fmt(news.dataAtualizacao)!} />
          )}
        </div>

        {/* Fuente verificada · línea verde */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-success-bg/40 px-3 py-2 ring-1 ring-success-bg">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-success-fg">
              <BadgeCheck size={11} /> Fuente oficial
            </span>
            <span className="text-[12.5px] font-semibold text-ink-800 line-clamp-1">{news.source}</span>
            <span className="text-[11px] text-ink-500 tabular-nums">{formatDate(news.date)}</span>
          </div>
          {news.sourceUrl && (
            <a
              href={news.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-[11.5px] font-semibold text-upm-700 ring-1 ring-upm-100 hover:bg-upm-50"
            >
              <ExternalLink size={11} /> {news.pdfUrl ? 'Documento oficial' : 'Ver fuente'}
            </a>
          )}
        </div>
      </div>

      {/* Cabecera con título y badges */}
      <article className="flex flex-col gap-4 rounded-3xl bg-white p-6 ring-1 ring-ink-100 shadow-card sm:p-8">
        <div className="flex items-center justify-between">
          <Eyebrow icon={<ScrollText size={11} />}>Novedad normativa</Eyebrow>
          {enriching && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-upm-50 px-2 py-1 text-[10.5px] font-semibold text-upm-700">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-upm-400" />
              Enriqueciendo con detalle oficial…
            </span>
          )}
        </div>

        <h1 className="text-[24px] font-bold leading-tight tracking-tight text-ink-900 sm:text-[28px]">
          {news.title}
        </h1>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="brand"><Globe size={10} /> {country.flag} {country.name}</Badge>
          <Badge tone="ghost"><Tag size={10} /> {topic.label}</Badge>
          <Badge tone="info">{news.type}</Badge>
          <Badge tone={relTone}>Relevancia {news.relevance}</Badge>
          {news.status && <Badge tone="success">{news.status}</Badge>}
        </div>

        {/* Resumen ejecutivo extraído del articulado */}
        {ctx.resumen && ctx.resumen.length > 50 && (
          <div className="rounded-2xl bg-upm-50/40 p-4 ring-1 ring-upm-100">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
              <Sparkles size={11} /> Resumen ejecutivo
            </div>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-800">{ctx.resumen}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-500">
              <span className="inline-flex items-center gap-1">
                <FileText size={10} /> {ctx.totalPalabras} palabras
              </span>
              <span className="inline-flex items-center gap-1">
                <Activity size={10} /> Complejidad{' '}
                <span className={
                  ctx.complejidad === 'compleja' ? 'font-bold text-danger-fg'
                    : ctx.complejidad === 'media' ? 'font-bold text-warning-fg'
                    : 'font-bold text-success-fg'
                }>{ctx.complejidad}</span>
              </span>
              {ctx.articulos.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Hash size={10} /> {ctx.articulos.length} artículos
                </span>
              )}
            </div>
          </div>
        )}

        {/* Grid de contexto extraído · 4 columnas en desktop, stack en mobile */}
        {(ctx.decretos.length > 0 || ctx.resoluciones.length > 0 || ctx.montos.length > 0 || ctx.plazos.length > 0 || ctx.provincias.length > 0 || ctx.instituciones.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {ctx.instituciones.length > 0 && (
              <ContextSection icon={Building2} label="Organismos mencionados">
                {ctx.instituciones.map(i => (
                  <Chip2 key={i}>{i}</Chip2>
                ))}
              </ContextSection>
            )}
            {ctx.provincias.length > 0 && (
              <ContextSection icon={MapPin} label="Lugares afectados">
                {ctx.provincias.map(p => (
                  <Chip2 key={p}>{p}</Chip2>
                ))}
              </ContextSection>
            )}
            {ctx.plazos.length > 0 && (
              <ContextSection icon={Timer} label="Plazos">
                {ctx.plazos.map((p, i) => (
                  <Chip2 key={`p-${i}-${p}`}>{p}</Chip2>
                ))}
              </ContextSection>
            )}
            {ctx.montos.length > 0 && (
              <ContextSection icon={DollarSign} label="Montos">
                {ctx.montos.map((m, i) => (
                  <Chip2 key={`m-${i}-${m}`}>{m}</Chip2>
                ))}
              </ContextSection>
            )}
            {ctx.decretos.length > 0 && (
              <ContextSection icon={ScrollText} label="Decretos relacionados">
                {ctx.decretos.map(d => (
                  <Chip2 key={d}>{d}</Chip2>
                ))}
              </ContextSection>
            )}
            {ctx.resoluciones.length > 0 && (
              <ContextSection icon={FileText} label="Resoluciones citadas">
                {ctx.resoluciones.map(r => (
                  <Chip2 key={r}>{r}</Chip2>
                ))}
              </ContextSection>
            )}
          </div>
        )}

        {/* Articulado (si fue parseable) */}
        {ctx.articulos.length >= 2 && (
          <div>
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
              <Hash size={11} /> Articulado ({ctx.articulos.length})
            </div>
            <ol className="mt-3 space-y-2">
              {ctx.articulos.slice(0, 10).map((a, i) => (
                <li key={`art-${i}-${a.numero}`} className="rounded-2xl bg-white p-3 ring-1 ring-ink-100">
                  <div className="flex items-baseline gap-2">
                    <span className="rounded-md bg-upm-50 px-2 py-0.5 text-[11px] font-bold text-upm-800 ring-1 ring-upm-100">
                      Art. {a.numero}
                    </span>
                    <p className="flex-1 text-[13.5px] leading-relaxed text-ink-800 line-clamp-3">
                      {a.texto}
                    </p>
                  </div>
                </li>
              ))}
              {ctx.articulos.length > 10 && (
                <li className="text-[11.5px] text-ink-500 italic">
                  + {ctx.articulos.length - 10} artículos más en el texto completo
                </li>
              )}
            </ol>
          </div>
        )}

        {/* Mapa de la Ley · análisis de impacto + sectores + modificaciones +
            jurisprudencia + glosario. Panel maestro de información conectada. */}
        <LawMap item={news} />

        {/* Legisladores autores · si detectamos firmas conocidas */}
        <AuthorChips authorsString={news.authors} />

        {/* Flujo de tramitación · stepper visual */}
        <TramitacionFlow item={news} />

        {/* Inversión, contrataciones e impacto fiscal */}
        <BudgetPanel item={news} />

        {/* Votos nominales BR · solo aparece si el item es br-votacao-* */}
        <VotosBRPanel itemId={news.id} />

        {/* Cronología de modificatorias · solo si es una ley nacional */}
        <ModificatoriasTimeline item={news} />

        {/* Anotaciones personales del legislador (localStorage) */}
        <NotesPanel itemId={news.id} />

        {/* Constelación regulatoria · visualización SVG radial */}
        <RegulatoryConstellation item={news} />

        {/* Normas equivalentes en la región · TF-IDF cross-país */}
        <SimilarItemsPanel itemId={news.id} basePath="/radar" />

        {/* Backlinks invertidos · solo para leyes nacionales (renderiza null si no aplica) */}
        <BacklinksPanel itemId={news.id} />

        {/* Texto completo (ementa o ementaDetalhada) */}
        {news.fullText && news.fullText.length > 0 && (
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Texto completo</div>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-800">
              {news.fullText}
            </p>
          </div>
        )}

        {!news.fullText && (
          <p className="text-[15px] leading-relaxed text-ink-700">{news.excerpt}</p>
        )}

        {/* Leyes relacionadas · extraídas con regex del texto completo */}
        {(() => {
          const text = news.fullText ?? news.excerpt ?? ''
          // Match patrones tipo "Ley 27.541", "Ley N° 24.076", "Ley Nº 27541",
          // "Ley N.° 24.076", "Leyes\nN.° 24.076 y N.° 27.742", etc.
          const re = /Ley(?:es)?\s*[\s\n]*(?:N[°º\.\s]*)?(\d{1,2}[\.\s]?\d{3,4})/gi
          const found = new Set<string>()
          let m: RegExpExecArray | null
          while ((m = re.exec(text)) !== null) {
            const num = m[1].replace(/[\.\s]/g, '')
            // Filtrar la propia ley (si aplica) y números muy chicos / muy grandes
            if (num.length < 4 || num.length > 5) continue
            if (news.id === `ar-ley-${num}` || news.id === `uy-ley-${num}`) continue
            found.add(num)
          }
          const leyes = Array.from(found).slice(0, 12)
          if (leyes.length === 0) return null
          return (
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Leyes citadas en el texto</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {leyes.map(num => (
                  <button
                    key={num}
                    onClick={() => navigate(`/radar/${news.country === 'UY' ? 'uy-ley-' : 'ar-ley-'}${num}`)}
                    className="inline-flex items-center gap-1 rounded-full bg-upm-50 px-2.5 py-1 text-[11.5px] font-semibold text-upm-800 ring-1 ring-upm-100 hover:bg-upm-100 hover:ring-upm-300 transition"
                    title={`Abrir Ley ${num}`}
                  >
                    Ley {num}
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Keywords */}
        {news.keywords && news.keywords.length > 0 && (
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Palabras clave</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {news.keywords.map(k => (
                <span key={k} className="rounded-full bg-upm-50 px-2.5 py-1 text-[11.5px] font-semibold text-upm-800 ring-1 ring-upm-100">
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cronología de tramitación */}
        {news.tramitaciones && news.tramitaciones.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
              <Activity size={11} /> Cronología de tramitación
            </div>
            <ol className="relative mt-3 space-y-3 border-l-2 border-upm-100 pl-4">
              {news.tramitaciones.map((t, idx) => (
                <li key={idx} className="relative">
                  <span
                    className={
                      'absolute -left-[21px] top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full ring-4 ring-white ' +
                      (idx === 0 ? 'bg-upm-500' : 'bg-upm-300')
                    }
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {t.fecha && (
                      <span className="text-[11px] font-bold tabular-nums text-ink-700">{formatDateTime(t.fecha)}</span>
                    )}
                    {t.organo && (
                      <span className="rounded-md bg-ink-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-600 ring-1 ring-ink-100">
                        {t.organo}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-800">{t.descripcion}</p>
                  {t.despacho && (
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-500 line-clamp-3">{t.despacho}</p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

      </article>
    </div>
  )
}

function MetaChip({
  icon: Icon,
  label,
  value,
  truncate,
}: {
  icon: typeof Hash
  label: string
  value: string
  truncate?: boolean
}) {
  return (
    <span className={'inline-flex items-baseline gap-1.5 ' + (truncate ? 'min-w-0 max-w-[420px]' : '')}>
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
        <Icon size={10} /> {label}
      </span>
      <span className={'font-semibold text-ink-800 ' + (truncate ? 'truncate' : '')}>{value}</span>
    </span>
  )
}

// Sección de contexto extraído (montos, plazos, instituciones, etc.)
function ContextSection({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Hash
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-ink-100">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
        <Icon size={11} /> {label}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Chip2({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-upm-50/80 px-2.5 py-1 text-[11.5px] font-semibold text-upm-800 ring-1 ring-upm-100">
      {children}
    </span>
  )
}

