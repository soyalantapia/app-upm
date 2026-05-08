import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  ExternalLink,
  Hash,
  MessageSquareText,
  RefreshCw,
  ScrollText,
  Search,
  Share2,
  Tag,
  Users,
  Wifi,
} from 'lucide-react'
import { Badge, Button, Eyebrow, PageHeader } from '@/components/ui'
import { countryByCode, topicById } from '@/lib/data'
import { formatDate } from '@/lib/format'
import { store, useStore } from '@/lib/store'
import { shareLink } from '@/lib/share'
import { useLiveFeed } from '@/lib/use-live-feed'
import type { NewsItem } from '@/lib/types'

// Una ley sancionada para esta vista cumple:
// - type === 'ley'
// - source o id sugieren ley promulgada (no proyecto en trámite)
// Por ahora: ítems con id `ar-ley-*` (1194 leyes nacionales argentinas)
// son leyes ya sancionadas. Los items de Brasil (br-camara-*, br-senado-*)
// son proyectos en trámite, NO leyes — se excluyen de esta vista.
function isSanctionedLaw(item: NewsItem): boolean {
  // Argentina: 1194 leyes nacionales sancionadas
  if (item.id.startsWith('ar-ley-')) return true
  // Colombia: proyectos del Senado con estado='LEY' (ya sancionados)
  if (item.id.startsWith('co-ley-')) return true
  return false
}

export function LawsPage() {
  const navigate = useNavigate()
  const prefs = useStore(s => s.prefs)
  const { feed, loading: feedLoading, revalidating, refresh } = useLiveFeed(
    prefs ? { countries: prefs.countries, topics: prefs.topics } : undefined,
  )

  const laws = useMemo(
    () => (feed?.items ?? [])
      .filter(isSanctionedLaw)
      // De más nueva a más vieja
      .sort((a, b) => b.date.localeCompare(a.date)),
    [feed],
  )

  const [active, setActive] = useState<NewsItem | null>(null)
  const [q, setQ] = useState('')

  // Seleccionar la primera ley cuando carga el feed
  useEffect(() => {
    if (!active && laws.length > 0) {
      setActive(laws[0])
    }
  }, [laws, active])

  const isSaved = useStore(s => (active ? s.saved.some(i => i.ref === active.id) : false))
  const liveStatus = feed?.status ?? 'mock'
  const isLoading = feedLoading && !feed

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return laws
    return laws.filter(l =>
      (l.title + ' ' + l.excerpt + ' ' + (l.fullText ?? '') + ' ' + (l.keywords ?? []).join(' '))
        .toLowerCase()
        .includes(term),
    )
  }, [laws, q])

  const handleSave = () => {
    if (!active) return
    if (isSaved) {
      const item = store.getSnapshot().saved.find(i => i.ref === active.id)
      if (item) {
        store.removeSaved(item.id)
        store.pushToast('info', 'Ley eliminada de tu carpeta')
      }
    } else {
      store.saveItem({
        id: 'sav-law-' + active.id,
        type: 'documento',
        title: active.title,
        ref: active.id,
        meta: { type: active.type, country: active.country, date: active.date },
      })
      store.pushToast('success', 'Ley guardada en tu carpeta')
    }
  }

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        eyebrow={<Eyebrow icon={<BookOpen size={11} />}>Hablar con leyes</Eyebrow>}
        title="Leyes sancionadas · texto completo"
        description="Consultá leyes nacionales con su sumario íntegro y palabras clave oficiales. Después podés conversar con el Asistente sobre cualquiera."
        actions={
          <>
            {liveStatus === 'live' && (
              <Badge tone="success">
                <Wifi size={11} /> En vivo
              </Badge>
            )}
            <Button size="sm" variant="ghost" onClick={refresh} disabled={revalidating}>
              <RefreshCw size={12} className={revalidating ? 'animate-spin' : ''} /> Actualizar
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-20 w-full rounded-2xl" />
            ))}
          </div>
          <div className="skeleton h-96 w-full rounded-3xl" />
        </div>
      ) : laws.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-ink-100 shadow-card">
          <BookOpen size={32} className="mx-auto text-ink-300" />
          <p className="mt-3 text-[14px] text-ink-700">No hay leyes sancionadas en el feed actual.</p>
          <Button size="sm" variant="soft" className="mt-3" onClick={refresh}>
            <RefreshCw size={13} /> Reintentar
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Lista de leyes */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-ink-100 shadow-card focus-within:ring-upm-400">
              <Search size={14} className="text-upm-600" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={`Buscar entre ${laws.length} leyes…`}
                className="flex-1 bg-transparent text-[13px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
            </label>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
              {filtered.length} {filtered.length === 1 ? 'ley' : 'leyes'}
            </div>
            <div className="flex max-h-[640px] flex-col gap-1.5 overflow-y-auto pr-1">
              {filtered.slice(0, 50).map(l => {
                const c = countryByCode(l.country)
                return (
                  <button
                    key={l.id}
                    onClick={() => setActive(l)}
                    className={
                      'flex flex-col gap-1.5 rounded-2xl border-2 p-3 text-left transition-all duration-200 ' +
                      (active?.id === l.id
                        ? 'border-upm-500 bg-upm-50'
                        : 'border-transparent bg-white ring-1 ring-ink-100 hover:border-upm-200')
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <Badge tone="brand">{c.flag} {l.tipoDocumento ?? 'Ley'}</Badge>
                      <Badge tone="success">Sancionada</Badge>
                    </div>
                    <div className="text-[12.5px] font-semibold leading-snug text-ink-900 line-clamp-2">
                      {l.title.replace(/\^Ley \d+\s*·\s*/, '')}
                    </div>
                    {l.excerpt && l.excerpt !== l.title && (
                      <p className="text-[11.5px] leading-relaxed text-ink-500 line-clamp-3">
                        {l.excerpt}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detalle de la ley seleccionada */}
          {active && (
            <div className="flex flex-col gap-4">
              {/* Barra de acciones */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => shareLink(active.title, '/leyes')}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 hover:text-upm-700"
                >
                  <Share2 size={12} /> Compartir
                </button>
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
                  {isSaved ? 'Guardada' : 'Guardar'}
                </button>
                <button
                  onClick={() => {
                    store.pushToast('info', 'El Asistente preparó preguntas sobre esta ley')
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

              {/* Identificación + Fuente verificada · barra compacta */}
              <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 ring-1 ring-ink-100 shadow-card sm:p-3.5">
                {/* Chips de metadata */}
                {(active.tipoDocumento || active.authors || active.dataPublicacao || active.status || active.comision) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px]">
                    {active.tipoDocumento && (
                      <LawMetaChip icon={Hash} label="Identificación" value={active.tipoDocumento} />
                    )}
                    {active.authors && (
                      <LawMetaChip icon={Users} label="Autoría" value={active.authors} truncate />
                    )}
                    {active.dataPublicacao && (
                      <LawMetaChip icon={CalendarDays} label="Presentación" value={formatDate(active.dataPublicacao)} />
                    )}
                    {active.status && (
                      <LawMetaChip icon={Hash} label="Estado" value={active.status} />
                    )}
                    {active.comision && (
                      <LawMetaChip icon={ScrollText} label="Comisión" value={active.comision} />
                    )}
                  </div>
                )}

                {/* Fuente verificada · línea verde */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-success-bg/40 px-3 py-2 ring-1 ring-success-bg">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-success-fg">
                      <BadgeCheck size={11} /> Fuente oficial
                    </span>
                    <span className="text-[12.5px] font-semibold text-ink-800 line-clamp-1">{active.source}</span>
                  </div>
                  {active.sourceUrl && (
                    <a
                      href={active.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-[11.5px] font-semibold text-upm-700 ring-1 ring-upm-100 hover:bg-upm-50"
                    >
                      <ExternalLink size={11} /> Ver fuente
                    </a>
                  )}
                </div>
              </div>

            <article className="flex flex-col gap-4 rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card sm:p-7">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="brand">{countryByCode(active.country).flag} {countryByCode(active.country).name}</Badge>
                <Badge tone="success">Ley sancionada</Badge>
                {active.tipoDocumento && (
                  <Badge tone="info">
                    <Hash size={10} /> {active.tipoDocumento}
                  </Badge>
                )}
                <Badge tone="ghost">
                  <Tag size={10} /> {topicById(active.topic).label}
                </Badge>
              </div>

              <h2 className="text-[22px] font-bold leading-tight tracking-tight text-ink-900 sm:text-[26px]">
                {active.title.replace(/\^Ley \d+\s*·\s*/, '')}
              </h2>

              {/* Sumario completo */}
              {active.fullText && active.fullText.length > 0 && (
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Sumario íntegro</div>
                  <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-800">
                    {active.fullText}
                  </p>
                </div>
              )}

              {!active.fullText && (
                <p className="text-[14.5px] leading-relaxed text-ink-700">{active.excerpt}</p>
              )}

              {/* Keywords */}
              {active.keywords && active.keywords.length > 0 && (
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Palabras clave oficiales</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {active.keywords.map(k => (
                      <span
                        key={k}
                        className="rounded-full bg-upm-50 px-2.5 py-1 text-[11px] font-semibold text-upm-800 ring-1 ring-upm-100"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </article>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LawMetaChip({
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
    <span className={'inline-flex items-baseline gap-1.5 ' + (truncate ? 'min-w-0 max-w-[460px]' : '')}>
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
        <Icon size={10} /> {label}
      </span>
      <span className={'font-semibold text-ink-800 ' + (truncate ? 'truncate' : '')}>{value}</span>
    </span>
  )
}
