import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownUp,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  FileStack,
  Filter,
  Radar,
  RefreshCw,
  ScrollText,
  Search,
  Tag,
  Wand2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import { Badge, Button, Card, Chip, Eyebrow, EmptyState, PageHeader } from '@/components/ui'
import { COUNTRIES, TOPICS, countryByCode, topicById } from '@/lib/data'
import type { CountryCode, DocType, Relevance, Topic } from '@/lib/types'
import { store, useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-provider'
import { useLiveFeed } from '@/lib/use-live-feed'

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
  const { openCreateBrief } = useUI()
  const saved = useStore(s => s.saved)
  const prefs = useStore(s => s.prefs)
  const savedRefs = useMemo(
    () => new Set(saved.map(i => i.ref).filter(Boolean) as string[]),
    [saved],
  )
  const { feed, loading: feedLoading, refresh } = useLiveFeed(prefs ? { countries: prefs.countries, topics: prefs.topics } : undefined)
  const NEWS = feed?.items ?? []
  const liveStatus = feed?.status ?? 'mock'
  const liveSources = feed?.sources ?? []
  const [q, setQ] = useState('')
  const [country, setCountry] = useState<CountryCode | 'all'>('all')
  const [topic, setTopic] = useState<Topic | 'all'>('all')
  const [type, setType] = useState<DocType | 'all'>('all')
  const [relevance, setRelevance] = useState<Relevance | 'all'>('all')
  const [sort, setSort] = useState<Sort>('fecha-desc')
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeFiltersCount =
    (country !== 'all' ? 1 : 0) +
    (topic !== 'all' ? 1 : 0) +
    (type !== 'all' ? 1 : 0) +
    (relevance !== 'all' ? 1 : 0)

  const clearFilters = () => {
    setCountry('all')
    setTopic('all')
    setType('all')
    setRelevance('all')
  }

  useEffect(() => {
    setLoading(true)
    const id = setTimeout(() => setLoading(false), 420)
    return () => clearTimeout(id)
  }, [country, topic, type, relevance, q, sort])

  // Loading inicial mientras se trae el feed real
  const isLoadingInitial = feedLoading && !feed

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    let items = NEWS.filter(n => {
      if (term !== '') {
        const t = topicById(n.topic)
        const c = countryByCode(n.country)
        const haystack = [
          n.title,
          n.excerpt,
          n.source,
          n.type,
          t.label,
          t.shortLabel,
          c.name,
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return (
        (country === 'all' || n.country === country) &&
        (topic === 'all' || n.topic === topic) &&
        (type === 'all' || n.type === type) &&
        (relevance === 'all' || n.relevance === relevance)
      )
    })
    if (sort === 'fecha-desc') items = [...items].sort((a, b) => b.date.localeCompare(a.date))
    if (sort === 'fecha-asc') items = [...items].sort((a, b) => a.date.localeCompare(b.date))
    if (sort === 'relevancia') items = [...items].sort((a, b) => RELEVANCE[b.relevance].weight - RELEVANCE[a.relevance].weight)
    return items
  }, [NEWS, q, country, topic, type, relevance, sort])

  const handleSave = (n: typeof NEWS[number]) => {
    const id = 'sav-news-' + n.id
    const isSaved = savedRefs.has(n.id)
    if (isSaved) {
      const item = store.getSnapshot().saved.find(i => i.ref === n.id)
      if (item) {
        store.removeSaved(item.id)
        store.pushToast('info', 'Eliminado de tu carpeta')
      }
    } else {
      store.saveItem({
        id,
        type: 'novedad',
        title: n.title,
        ref: n.id,
        meta: { country: n.country, topic: n.topic, relevance: n.relevance, date: n.date },
      })
      store.pushToast('success', 'Novedad guardada en tu carpeta')
    }
  }

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
            <Button size="sm" variant="ghost" onClick={refresh} disabled={feedLoading}>
              <RefreshCw size={12} className={feedLoading ? 'animate-spin' : ''} /> Actualizar
            </Button>
          </>
        }
      />

      {/* Stats por fuente */}
      {liveSources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-ink-100 shadow-card">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Fuentes</span>
          {liveSources.map(s => (
            <button
              key={s.id}
              onClick={() => setCountry(s.country)}
              className={
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
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
          {feed?.fetchedAt && (
            <span className="ml-auto text-[10.5px] text-ink-400 tabular-nums">
              Actualizado {new Date(feed.fetchedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      {/* Search + Sort + Toggle filtros — todo en una sola fila */}
      <div className="flex flex-col gap-2.5 rounded-3xl bg-white p-2.5 ring-1 ring-ink-100 shadow-card">
        <div className="flex items-center gap-2">
          <label className="flex flex-1 min-w-0 items-center gap-2 rounded-2xl bg-upm-50/40 px-3 py-2.5 ring-1 ring-upm-100 focus-within:bg-white focus-within:ring-upm-400">
            <Search size={15} className="shrink-0 text-upm-600" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar por palabra…"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
          </label>

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
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-upm-500 px-1 text-[10px] font-bold text-white tabular-nums">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown size={12} className={'transition ' + (filtersOpen ? 'rotate-180' : '')} />
          </button>

          <div className="relative shrink-0">
            <ArrowDownUp size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <select
              value={sort}
              onChange={e => setSort(e.target.value as Sort)}
              aria-label="Ordenar"
              className="appearance-none rounded-2xl bg-white py-2.5 pl-7 pr-7 text-[13px] font-semibold text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 focus:outline-none focus:ring-2 focus:ring-upm-400"
            >
              {SORT_OPTIONS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-500" />
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
                      <span className="text-[11px] font-semibold text-ink-500 tabular-nums">{n.date}</span>
                      {isSaved && <Badge tone="success">Guardado</Badge>}
                    </div>
                    <h3 className="mt-2 text-[16px] font-bold leading-snug text-ink-900">{n.title}</h3>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-500 line-clamp-2">{n.excerpt}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={e => {
                          e.stopPropagation()
                          navigate(`/radar/${n.id}`)
                        }}
                      >
                        <Wand2 size={13} /> Explicámelo simple
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={e => {
                          e.stopPropagation()
                          handleSave(n)
                        }}
                      >
                        {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                        {isSaved ? 'Guardado' : 'Guardar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={e => {
                          e.stopPropagation()
                          openCreateBrief({
                            title: `Brief — ${n.title}`,
                            body: `**Contexto**\n\n${n.excerpt}\n\n**País:** ${country.name}\n**Tema:** ${topicMeta.label}\n**Relevancia:** ${rel.label}\n\n**Fuente:** ${n.source}`,
                            ref: n.id,
                          })
                        }}
                      >
                        <FileStack size={13} /> Armar brief
                      </Button>
                      <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-upm-700">
                        Abrir <ArrowRight size={13} />
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
