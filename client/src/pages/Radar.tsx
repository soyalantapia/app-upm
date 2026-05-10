import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownUp,
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  ExternalLink,
  Filter,
  Radar,
  RefreshCw,
  ScrollText,
  Search,
  Tag,
  Wifi,
  X,
} from 'lucide-react'
import { Badge, Button, Card, Chip, Eyebrow, EmptyState, PageHeader } from '@/components/ui'
import { COUNTRIES, TOPICS, countryByCode, topicById } from '@/lib/data'
import { formatDate, formatDateTime } from '@/lib/format'
import type { CountryCode, DocType, Relevance, Topic } from '@/lib/types'
import { useStore } from '@/lib/store'
import { useLiveFeed } from '@/lib/use-live-feed'
import { writeSnapshot } from '@/lib/visit-tracker'

const TYPE_OPTIONS: { id: DocType; label: string }[] = [
  { id: 'ley', label: 'Ley' },
  { id: 'decreto', label: 'Decreto' },
  { id: 'reglamento', label: 'Reglamento' },
  { id: 'informe', label: 'Informe' },
  { id: 'comunicado', label: 'Comunicado UPM' },
  { id: 'acta', label: 'Acta' },
]

const RELEVANCE: Record<Relevance, { label: string; tone: 'danger' | 'warning' | 'info'; dot: string; weight: number }> = {
  alta: { label: 'Alta', tone: 'danger', dot: 'bg-danger', weight: 3 },
  media: { label: 'Media', tone: 'warning', dot: 'bg-warning', weight: 2 },
  baja: { label: 'Baja', tone: 'info', dot: 'bg-info', weight: 1 },
}

type Sort = 'fecha-desc' | 'fecha-asc' | 'relevancia'

const SORT_OPTIONS: { id: Sort; label: string }[] = [
  { id: 'fecha-desc', label: 'Más recientes' },
  { id: 'fecha-asc', label: 'Más antiguas' },
  { id: 'relevancia', label: 'Mayor relevancia' },
]

export function RadarPage() {
  const navigate = useNavigate()
  const saved = useStore(s => s.saved)
  const prefs = useStore(s => s.prefs)
  const savedRefs = useMemo(
    () => new Set(saved.map(i => i.ref).filter(Boolean) as string[]),
    [saved],
  )
  const { feed, loading: feedLoading, revalidating, refresh } = useLiveFeed(prefs ? { countries: prefs.countries, topics: prefs.topics } : undefined)
  const NEWS = feed?.items ?? []
  const liveStatus = feed?.status ?? 'mock'
  const liveSources = feed?.sources ?? []
  const [q, setQ] = useState('')
  const [country, setCountry] = useState<CountryCode | 'all'>('all')
  const [topic, setTopic] = useState<Topic | 'all'>('all')
  const [type, setType] = useState<DocType | 'all'>('all')
  const [relevance, setRelevance] = useState<Relevance | 'all'>('all')
  const [organismo, setOrganismo] = useState<string>('all')
  const [sort, setSort] = useState<Sort>('fecha-desc')
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)

  // Lista de organismos emisores únicos del feed (top 20 por frecuencia)
  const organismos = useMemo(() => {
    const counts = new Map<string, number>()
    for (const n of NEWS) {
      const o = (n.authors ?? '').trim()
      if (!o) continue
      // Tomamos solo organismos institucionales (mayúsculas o con "MINISTERIO/SECRETARIA/...")
      if (!/^[A-ZÁÉÍÓÚÑ]/.test(o)) continue
      counts.set(o, (counts.get(o) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }))
  }, [NEWS])

  const activeFiltersCount =
    (country !== 'all' ? 1 : 0) +
    (topic !== 'all' ? 1 : 0) +
    (type !== 'all' ? 1 : 0) +
    (relevance !== 'all' ? 1 : 0) +
    (organismo !== 'all' ? 1 : 0)

  const clearFilters = () => {
    setCountry('all')
    setTopic('all')
    setType('all')
    setRelevance('all')
    setOrganismo('all')
  }

  useEffect(() => {
    setLoading(true)
    const id = setTimeout(() => setLoading(false), 420)
    return () => clearTimeout(id)
  }, [country, topic, type, relevance, organismo, q, sort])

  // Snapshot de visita: cada vez que el usuario abre Radar y el feed está cargado,
  // guardamos los IDs vistos. Al volver al Home, el banner Diff usa esto para
  // computar "qué cambió desde tu última visita".
  useEffect(() => {
    if (NEWS.length > 0) writeSnapshot(NEWS)
    // No queremos correrlo en cada render, solo cuando el feed efectivamente cargó
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [NEWS.length])

  // Loading inicial mientras se trae el feed real
  const isLoadingInitial = feedLoading && !feed

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    let items = NEWS.filter(n => {
      if (term !== '') {
        const t = topicById(n.topic)
        const c = countryByCode(n.country)
        // Búsqueda full-text: incluye fullText (texto íntegro de la norma),
        // authors (autoría) y status. Antes solo matcheaba en title+excerpt+source.
        const haystack = [
          n.title,
          n.excerpt,
          n.fullText,                        // texto íntegro pre-procesado
          n.source,
          n.type,
          n.authors,
          n.status,
          n.tipoDocumento,
          (n.keywords ?? []).join(' '),
          t.label,
          t.shortLabel,
          c.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return (
        (country === 'all' || n.country === country) &&
        (topic === 'all' || n.topic === topic) &&
        (type === 'all' || n.type === type) &&
        (relevance === 'all' || n.relevance === relevance) &&
        (organismo === 'all' || (n.authors ?? '').includes(organismo))
      )
    })
    if (sort === 'fecha-desc') items = [...items].sort((a, b) => b.date.localeCompare(a.date))
    if (sort === 'fecha-asc') items = [...items].sort((a, b) => a.date.localeCompare(b.date))
    if (sort === 'relevancia') items = [...items].sort((a, b) => RELEVANCE[b.relevance].weight - RELEVANCE[a.relevance].weight)
    return items
  }, [NEWS, q, country, topic, type, relevance, organismo, sort])

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={<Eyebrow icon={<Radar size={11} />}>Radar normativo</Eyebrow>}
        title="Te avisa lo importante por país y tema"
        description="Sin perder horas revisando fuentes. Datos en vivo de fuentes oficiales del MERCOSUR ampliado, refrescados automáticamente."
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

      {/* Stats por fuente · colapsado por defecto para no ocupar tanto espacio */}
      {liveSources.length > 0 && (() => {
        const okCount = liveSources.filter(s => s.ok).length
        // Contar ítems del feed real (después de dedupe), no la suma de counts.
        const totalItems = NEWS.length
        const countriesSet = new Set(liveSources.filter(s => s.ok).map(s => s.country))
        return (
          <div className="rounded-2xl bg-white ring-1 ring-ink-100 shadow-card">
            <button
              onClick={() => setSourcesOpen(v => !v)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-upm-50/30 rounded-2xl transition"
              aria-expanded={sourcesOpen}
              aria-label="Fuentes activas"
            >
              <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Fuentes</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-bold text-success-fg ring-1 ring-success-bg">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
                {okCount}/{liveSources.length} en vivo
              </span>
              <span className="text-[11.5px] font-semibold text-ink-700 tabular-nums">{totalItems} ítems</span>
              <span className="hidden sm:inline text-[11.5px] text-ink-500">
                {[...countriesSet].map(c => countryByCode(c).flag).join(' ')}
              </span>
              {feed?.fetchedAt && (
                <span className="ml-auto hidden sm:inline text-[10.5px] text-ink-400 tabular-nums">
                  {new Date(feed.fetchedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <ChevronDown
                size={14}
                className={'shrink-0 text-ink-500 transition ' + (sourcesOpen ? 'rotate-180' : '') + (feed?.fetchedAt ? '' : ' ml-auto')}
              />
            </button>
            {sourcesOpen && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-ink-100 px-3 py-2.5">
                {liveSources.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setCountry(s.country)}
                    className={
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition whitespace-nowrap ' +
                      (s.ok
                        ? 'bg-success-bg text-success-fg ring-1 ring-success-bg hover:bg-success-bg/80'
                        : 'bg-ink-50 text-ink-400 ring-1 ring-ink-100')
                    }
                    title={s.error ?? `${s.count} ítems desde ${s.label}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${s.ok ? 'bg-success' : 'bg-ink-300'}`} />
                    {countryByCode(s.country).flag} {s.label}
                    <span className="ml-0.5 rounded bg-white/60 px-1 text-[10px] tabular-nums">{s.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Search + Sort + Toggle filtros · search full-width en mobile */}
      <div className="flex flex-col gap-2.5 rounded-3xl bg-white p-2.5 ring-1 ring-ink-100 shadow-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex flex-1 min-w-0 items-center gap-2 rounded-2xl bg-upm-50/40 px-3 py-2.5 ring-1 ring-upm-100 focus-within:bg-white focus-within:ring-upm-400">
            <Search size={15} className="shrink-0 text-upm-600" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar por palabra…"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltersOpen(v => !v)}
              className={
                'inline-flex shrink-0 items-center gap-1 rounded-2xl px-2.5 py-2.5 text-[13px] font-semibold transition ' +
                (filtersOpen || activeFiltersCount > 0
                  ? 'bg-upm-50 text-upm-800 ring-1 ring-upm-200'
                  : 'bg-white text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50')
              }
              aria-label="Filtros"
            >
              <Filter size={13} />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-upm-500 px-1 text-[10px] font-bold text-white tabular-nums">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown size={12} className={'transition ' + (filtersOpen ? 'rotate-180' : '')} />
            </button>

            <div className="relative flex-1 sm:flex-initial">
              <ArrowDownUp size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
              <select
                value={sort}
                onChange={e => setSort(e.target.value as Sort)}
                aria-label="Ordenar"
                className="w-full appearance-none rounded-2xl bg-white py-2.5 pl-7 pr-7 text-[13px] font-semibold text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 focus:outline-none focus:ring-2 focus:ring-upm-400"
              >
                {SORT_OPTIONS.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-500" />
            </div>
          </div>
        </div>

        {/* Filtros activos como chips removibles cuando están plegados */}
        {!filtersOpen && activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {country !== 'all' && (
              <ActiveChip label={countryByCode(country).name} onRemove={() => setCountry('all')} />
            )}
            {topic !== 'all' && (
              <ActiveChip label={topicById(topic).label} onRemove={() => setTopic('all')} />
            )}
            {type !== 'all' && (
              <ActiveChip label={type} onRemove={() => setType('all')} />
            )}
            {relevance !== 'all' && (
              <ActiveChip label={`Relevancia ${RELEVANCE[relevance].label}`} onRemove={() => setRelevance('all')} />
            )}
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-danger-fg hover:bg-danger-bg/40"
            >
              <X size={10} /> Limpiar todo
            </button>
          </div>
        )}

        {filtersOpen && (
          <div className="animate-fade-in flex flex-col gap-2.5 border-t border-ink-100 pt-3">
            <FilterRow label="País">
              <Chip active={country === 'all'} onClick={() => setCountry('all')} size="sm">Todos</Chip>
              {COUNTRIES.map(c => (
                <Chip key={c.code} active={country === c.code} onClick={() => setCountry(c.code)} size="sm">
                  <span aria-hidden>{c.flag}</span> {c.name}
                </Chip>
              ))}
            </FilterRow>

            <FilterRow label="Tema">
              <Chip active={topic === 'all'} onClick={() => setTopic('all')} size="sm">Todos</Chip>
              {TOPICS.map(t => (
                <Chip key={t.id} active={topic === t.id} onClick={() => setTopic(t.id)} size="sm">
                  <Tag size={10} /> {t.shortLabel}
                </Chip>
              ))}
            </FilterRow>

            <FilterRow label="Tipo">
              <Chip active={type === 'all'} onClick={() => setType('all')} size="sm">Todos</Chip>
              {TYPE_OPTIONS.map(t => (
                <Chip key={t.id} active={type === t.id} onClick={() => setType(t.id)} size="sm">
                  {t.label}
                </Chip>
              ))}
            </FilterRow>

            <FilterRow label="Relevancia">
              <Chip active={relevance === 'all'} onClick={() => setRelevance('all')} size="sm">Toda</Chip>
              {(Object.keys(RELEVANCE) as Relevance[]).map(r => (
                <Chip key={r} active={relevance === r} onClick={() => setRelevance(r)} size="sm">
                  <span className={`h-1.5 w-1.5 rounded-full ${RELEVANCE[r].dot}`} /> {RELEVANCE[r].label}
                </Chip>
              ))}
            </FilterRow>

            {organismos.length > 0 && (
              <FilterRow label="Organismo emisor">
                <Chip active={organismo === 'all'} onClick={() => setOrganismo('all')} size="sm">Todos</Chip>
                {organismos.map(o => (
                  <Chip key={o.name} active={organismo === o.name} onClick={() => setOrganismo(o.name)} size="sm">
                    {o.name.length > 38 ? o.name.slice(0, 36) + '…' : o.name}
                    <span className="ml-1 rounded bg-white/40 px-1 text-[10px] tabular-nums">{o.count}</span>
                  </Chip>
                ))}
              </FilterRow>
            )}

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 self-start rounded-full bg-danger-bg/40 px-3 py-1 text-[11.5px] font-bold text-danger-fg hover:bg-danger-bg"
              >
                <X size={11} /> Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-500">
        {loading || isLoadingInitial ? (
          <>
            <span className="inline-block h-2 w-2 animate-pulse-soft rounded-full bg-upm-400" />
            {isLoadingInitial ? 'Trayendo novedades en vivo de fuentes oficiales…' : 'Buscando fuentes UPM…'}
          </>
        ) : (
          `${filtered.length} ${filtered.length === 1 ? 'novedad' : 'novedades'} encontradas`
        )}
      </div>

      {/* Resultados */}
      {loading || isLoadingInitial ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
              <div className="flex items-start gap-3">
                <div className="skeleton h-11 w-11 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-1/3 rounded" />
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-2/3 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Filter size={22} />}
          title="No encontramos novedades"
          description="Probá con otro país, tema o palabra clave. El Radar UPM se actualiza varias veces al día."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((n, i) => {
            const country = countryByCode(n.country)
            const topicMeta = topicById(n.topic)
            const rel = RELEVANCE[n.relevance]
            const isSaved = savedRefs.has(n.id)
            return (
              <Card
                key={n.id}
                interactive
                onClick={() => navigate(`/radar/${n.id}`)}
                style={{ animationDelay: `${i * 50}ms` }}
                className="animate-fade-up"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-upm-50 text-upm-700">
                    <ScrollText size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="brand">{country.flag} {country.name}</Badge>
                      <Badge tone="ghost">{topicMeta.shortLabel}</Badge>
                      <Badge tone={rel.tone}>Relevancia {rel.label}</Badge>
                      <span className="text-[11px] font-semibold text-ink-500 tabular-nums">{(() => {
                        // Preferir la fecha más rica (con hora) si está disponible.
                        const conHora = [n.dataAtualizacao, n.dataPublicacao].find(d => d && (d.includes('T') || /\d{2}:\d{2}/.test(d)))
                        if (conHora) return formatDateTime(conHora)
                        return formatDate(n.dataPublicacao ?? n.date)
                      })()}</span>
                      {isSaved && <Badge tone="success">Guardado</Badge>}
                      {/* Fuente oficial inline con los badges */}
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-bg/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-success-fg ring-1 ring-success-bg">
                        <BadgeCheck size={10} /> Fuente oficial
                      </span>
                      <span className="text-[11px] font-medium text-ink-500 line-clamp-1 max-w-[280px] sm:max-w-[420px]">{n.source}</span>
                      {n.sourceUrl && (
                        <a
                          href={n.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-0.5 text-[11px] font-bold text-upm-700 hover:text-upm-800 hover:underline"
                        >
                          <ExternalLink size={10} /> ver
                        </a>
                      )}
                    </div>
                    <h3 className="mt-2 text-[16px] font-bold leading-snug text-ink-900">{n.title}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-600 line-clamp-4">{n.excerpt}</p>
                    {(n.authors || n.status) && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-500">
                        {n.authors && (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">Autoría</span>
                            <span className="font-semibold text-ink-700 line-clamp-1 max-w-[420px]">{n.authors}</span>
                          </span>
                        )}
                        {n.status && (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">Estado</span>
                            <span className="font-semibold text-ink-700 line-clamp-1">{n.status}</span>
                          </span>
                        )}
                      </div>
                    )}
                    {/* Botón Abrir como pill, alineado al borde derecho */}
                    <div className="mt-3 flex justify-end">
                      <span className="group/abrir inline-flex items-center gap-1.5 rounded-full bg-upm-50 px-3 py-1.5 text-[12px] font-bold text-upm-700 ring-1 ring-upm-100 transition group-hover:bg-upm-100">
                        Abrir detalle
                        <ArrowRight size={13} className="transition group-hover/abrir:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-upm-50 px-2.5 py-1 text-[11.5px] font-semibold text-upm-800 ring-1 ring-upm-100">
      {label}
      <button onClick={onRemove} className="rounded-full p-0.5 hover:bg-upm-100" aria-label={`Quitar ${label}`}>
        <X size={10} />
      </button>
    </span>
  )
}
