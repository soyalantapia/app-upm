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
  WifiOff,
} from 'lucide-react'
import { Badge, Button, Eyebrow, PageHeader } from '@/components/ui'
import { countryByCode, topicById } from '@/lib/data'
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
    () => (feed?.items ?? []).filter(isSanctionedLaw),
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
        title="Leyes sancionadas — texto completo"
        description="Consultá leyes nacionales con su sumario íntegro y palabras clave oficiales. Después podés conversar con el Asistente sobre cualquiera."
        actions={
          <>
            {liveStatus === 'live' && (
              <Badge tone="success">
                <Wifi size={11} /> En vivo
              </Badge>
            )}
            {liveStatus === 'mixed' && (
              <Badge tone="info">
                <Wifi size={11} /> Vivo + muestra
              </Badge>
            )}
            {liveStatus === 'mock' && (
              <Badge tone="warning">
                <WifiOff size={11} /> Datos de muestra
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
                      {l.title.replace(/^Ley \d+\s*—\s*/, '')}
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
                {active.title.replace(/^Ley \d+\s*—\s*/, '')}
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

              {/* Metadata: autoría, fecha, estado, comisión */}
              {(active.authors || active.dataPublicacao || active.status || active.comision) && (
                <div className="grid grid-cols-1 gap-3 rounded-2xl bg-upm-50/40 p-3.5 ring-1 ring-upm-100 sm:grid-cols-2">
                  {active.authors && (
                    <div className="sm:col-span-2">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
                        <Users size={10} /> Autoría
                      </div>
                      <div className="mt-0.5 text-[12.5px] font-semibold leading-snug text-ink-900">{active.authors}</div>
                    </div>
                  )}
                  {active.dataPublicacao && (
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
                        <CalendarDays size={10} /> Presentación
                      </div>
                      <div className="mt-0.5 text-[12.5px] font-semibold leading-snug text-ink-900 tabular-nums">
                        {active.dataPublicacao.slice(0, 10)}
                      </div>
                    </div>
                  )}
                  {active.status && (
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
                        <Hash size={10} /> Estado
                      </div>
                      <div className="mt-0.5 text-[12.5px] font-semibold leading-snug text-ink-900">{active.status}</div>
                    </div>
                  )}
                  {active.comision && (
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
                        <ScrollText size={10} /> Comisión
                      </div>
                      <div className="mt-0.5 text-[12.5px] font-semibold leading-snug text-ink-900">{active.comision}</div>
                    </div>
                  )}
                </div>
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

              {/* Acciones */}
              <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
                <button
                  onClick={handleSave}
                  className={
                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ' +
                    (isSaved
                      ? 'bg-success-bg text-success-fg ring-1 ring-success-bg hover:bg-success-bg/80'
                      : 'bg-white text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 hover:text-upm-700')
                  }
                >
                  {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                  {isSaved ? 'Guardada' : 'Guardar'}
                </button>
                <button
                  onClick={() => shareLink(active.title, '/leyes')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 hover:text-upm-700"
                >
                  <Share2 size={13} /> Compartir
                </button>
                {active.sourceUrl && (
                  <a
                    href={active.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-upm-700 ring-1 ring-upm-100 hover:bg-upm-50"
                  >
                    <ExternalLink size={13} /> Ver en {active.country === 'AR' ? 'HCDN' : 'fuente oficial'}
                  </a>
                )}
              </div>

              {/* Fuente institucional con badge verificado */}
              <div className="rounded-2xl bg-success-bg/30 p-3 ring-1 ring-success-bg">
                <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-success-fg">
                  <BadgeCheck size={11} /> Fuente oficial verificada
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[12.5px] text-ink-800">{active.source}</div>
                  {active.sourceUrl && (
                    <a
                      href={active.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-upm-700 ring-1 ring-upm-100 hover:bg-upm-50"
                    >
                      <ExternalLink size={10} /> Abrir documento
                    </a>
                  )}
                </div>
              </div>

              {/* CTA único: Hablar con Asistente */}
              <button
                onClick={() => {
                  store.pushToast('info', 'El Asistente preparó preguntas sobre esta ley')
                  navigate('/asistente')
                }}
                className="group flex items-center justify-between gap-4 rounded-3xl bg-gradient-to-br from-upm-500 to-upm-700 p-4 text-white shadow-cta transition hover:-translate-y-0.5 hover:shadow-floating"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                    <MessageSquareText size={18} />
                  </div>
                  <div className="text-left">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-upm-200">Conversar</div>
                    <div className="mt-0.5 text-[15px] font-bold tracking-tight">Hablar con el Asistente AI sobre esta ley</div>
                  </div>
                </div>
                <span className="text-[18px] transition group-hover:translate-x-1">→</span>
              </button>
            </article>
          )}
        </div>
      )}
    </div>
  )
}
