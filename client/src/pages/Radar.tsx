import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowDownUp,
  Boxes,
  CalendarRange,
  ChevronDown,
  Filter,
  LayoutList,
  Radar,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Wifi,
  X,
} from 'lucide-react'
import { Button, Chip, EmptyState } from '@/components/ui'
import { COUNTRIES, TOPICS, countryByCode, topicById } from '@/lib/data'
import type { CountryCode, DocType, Relevance, Topic } from '@/lib/types'
import { useStore } from '@/lib/store'
import { useLiveFeed } from '@/lib/use-live-feed'
import { writeSnapshot } from '@/lib/visit-tracker'
import { useCitationGraph, getCitationCount } from '@/lib/use-citations'
import { buildClusters } from '@/lib/clusters'
import { matchesQuery } from '@/lib/synonyms'
import { useDebounced } from '@/lib/use-debounced'
import { RadarSmartCard } from '@/components/RadarSmartCard'
import { QuickFilterPills, type FilterPresetId } from '@/components/QuickFilterPills'
import { RadarTimeline } from '@/components/RadarTimeline'
import { RadarClusters } from '@/components/RadarClusters'
import { PulseToday } from '@/components/PulseToday'
import { ExportRadarButton } from '@/components/ExportRadarButton'

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
  const [searchParams] = useSearchParams()
  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  // Debounced para no re-filtrar 1700+ items en cada keystroke
  const debouncedQ = useDebounced(q, 200)
  const [country, setCountry] = useState<CountryCode | 'all'>('all')
  const [topic, setTopic] = useState<Topic | 'all'>('all')
  const [type, setType] = useState<DocType | 'all'>('all')
  const [relevance, setRelevance] = useState<Relevance | 'all'>('all')
  const [organismo, setOrganismo] = useState<string>('all')
  const [sort, setSort] = useState<Sort>('fecha-desc')
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  // Tier 1+2 features state
  const [preset, setPreset] = useState<FilterPresetId>('all')
  const [density] = useState<'comfortable' | 'compact'>('comfortable')
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'clusters'>('list')
  // Paginación incremental · Radar tiene 1700+ items, montar todo crashea perf.
  // Empezamos con 50, agregamos 50 cada "Ver más".
  const [visibleCount, setVisibleCount] = useState(50)
  // Grafo de citas para smart cards + clusters
  const { graph: citationGraph } = useCitationGraph()

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
    setVisibleCount(50) // resetear paginación al cambiar filtros
    const id = setTimeout(() => setLoading(false), 200)
    return () => clearTimeout(id)
  }, [country, topic, type, relevance, organismo, debouncedQ, sort, preset])

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

  // Now estable por mount · evita Date.now() durante render (react-hooks/purity)
  const now = useMemo(() => Date.now(), [])

  const filtered = useMemo(() => {
    const term = debouncedQ.trim().toLowerCase()
    let items = NEWS.filter(n => {
      if (term !== '') {
        const t = topicById(n.topic)
        const c = countryByCode(n.country)
        // Búsqueda full-text con q-expansion · busca también sinónimos legales.
        // Ej: query "género" matchea "mujer", "paridad", "violencia de género".
        const haystack = [
          n.title,
          n.excerpt,
          n.fullText,
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
        if (!matchesQuery(haystack, term)) return false
      }
      return (
        (country === 'all' || n.country === country) &&
        (topic === 'all' || n.topic === topic) &&
        (type === 'all' || n.type === type) &&
        (relevance === 'all' || n.relevance === relevance) &&
        (organismo === 'all' || (n.authors ?? '').includes(organismo))
      )
    })
    // Aplicar preset de quick filters
    if (preset === 'mi-comision') {
      // Mi comisión · CURA: país Y tema de tus prefs + piso de relevancia
      // (excluye lo de baja relevancia para no devolver medio corpus).
      // Si el usuario no tiene prefs seteadas, se comporta como 'all'.
      const userTopics = new Set(prefs?.topics ?? [])
      const userCountries = new Set(prefs?.countries ?? [])
      if (userTopics.size > 0 || userCountries.size > 0) {
        items = items.filter(n =>
          (userTopics.size === 0 || userTopics.has(n.topic)) &&
          (userCountries.size === 0 || userCountries.has(n.country)) &&
          n.relevance !== 'baja',
        )
      }
    } else if (preset === 'hot') {
      items = items.filter(n => n.relevance === 'alta')
    } else if (preset === 'recent-sancionadas') {
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000
      items = items.filter(n => {
        const isLey = /^(?:ar|uy)-ley-/.test(n.id) || /sancion|promulgad/i.test(n.status ?? '')
        const d = new Date(n.date ?? '').getTime()
        return isLey && !Number.isNaN(d) && d >= monthAgo
      })
    } else if (preset === 'crossborder') {
      const otrosPaises = /\b(Brasil|Uruguay|Argentina|Paraguay|Chile|Bolivia|MERCOSUR|MERCOSUL)\b/i
      items = items.filter(n => otrosPaises.test((n.fullText ?? '') + ' ' + (n.title ?? '')))
    } else if (preset === 'this-week') {
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000
      items = items.filter(n => {
        const d = new Date(n.dataPublicacao ?? n.date ?? '').getTime()
        return !Number.isNaN(d) && d >= weekAgo
      })
    } else if (preset === 'with-tramite') {
      items = items.filter(n => (n.tramitaciones?.length ?? 0) > 0 || /trámite|tramite|comisión|comision|votaci/i.test(n.status ?? ''))
    }
    if (sort === 'fecha-desc') items = [...items].sort((a, b) => b.date.localeCompare(a.date))
    if (sort === 'fecha-asc') items = [...items].sort((a, b) => a.date.localeCompare(b.date))
    if (sort === 'relevancia') items = [...items].sort((a, b) => RELEVANCE[b.relevance].weight - RELEVANCE[a.relevance].weight)
    return items
  }, [NEWS, debouncedQ, country, topic, type, relevance, organismo, sort, preset, prefs])

  // Precomputar conteos para badges de quick filter pills (cuenta sobre el universo
  // ya filtrado por country/topic/type/etc. pero sin aplicar el preset propio).
  const presetCounts = useMemo(() => {
    const baseFiltered = NEWS.filter(n =>
      (country === 'all' || n.country === country) &&
      (topic === 'all' || n.topic === topic) &&
      (type === 'all' || n.type === type) &&
      (relevance === 'all' || n.relevance === relevance) &&
      (organismo === 'all' || (n.authors ?? '').includes(organismo)),
    )
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const otrosPaises = /\b(Brasil|Uruguay|Argentina|Paraguay|Chile|Bolivia|MERCOSUR|MERCOSUL)\b/i
    const userTopics = new Set(prefs?.topics ?? [])
    const userCountries = new Set(prefs?.countries ?? [])
    return {
      'mi-comision': (userTopics.size > 0 || userCountries.size > 0)
        ? baseFiltered.filter(n =>
            (userTopics.size === 0 || userTopics.has(n.topic)) &&
            (userCountries.size === 0 || userCountries.has(n.country)) &&
            n.relevance !== 'baja',
          ).length
        : baseFiltered.length,
      hot: baseFiltered.filter(n => n.relevance === 'alta').length,
      'recent-sancionadas': baseFiltered.filter(n => {
        const isLey = /^(?:ar|uy)-ley-/.test(n.id) || /sancion|promulgad/i.test(n.status ?? '')
        const d = new Date(n.date ?? '').getTime()
        return isLey && !Number.isNaN(d) && d >= monthAgo
      }).length,
      crossborder: baseFiltered.filter(n => otrosPaises.test((n.fullText ?? '') + ' ' + (n.title ?? ''))).length,
      'this-week': baseFiltered.filter(n => {
        const d = new Date(n.dataPublicacao ?? n.date ?? '').getTime()
        return !Number.isNaN(d) && d >= weekAgo
      }).length,
      'with-tramite': baseFiltered.filter(n => (n.tramitaciones?.length ?? 0) > 0 || /trámite|tramite|comisión|comision|votaci/i.test(n.status ?? '')).length,
    } as Record<FilterPresetId, number>
  }, [NEWS, country, topic, type, relevance, organismo, prefs])

  // Clusters de ecosistema normativo · solo cuando viewMode === 'clusters'
  const clustersData = useMemo(() => {
    if (viewMode !== 'clusters' || !citationGraph) return null
    return buildClusters(filtered, citationGraph, 3)
  }, [viewMode, citationGraph, filtered])

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
      {/* Header compacto · título + freshness + acciones */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <Radar size={11} /> Radar normativo
          </div>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-ink-900 sm:text-[26px]">
            Novedades en vivo
          </h1>
          {feed?.fetchedAt && (
            <p className="mt-0.5 text-[11.5px] text-ink-500">
              {liveStatus === 'live' && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft align-middle" />}
              Actualizado {new Date(feed.fetchedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              {liveSources.length > 0 && ` · ${liveSources.filter(s => s.ok).length}/${liveSources.length} fuentes`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSourcesOpen(v => !v)}
            className={
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold ring-1 transition ' +
              (sourcesOpen ? 'bg-upm-50 text-upm-700 ring-upm-200' : 'bg-white text-ink-600 ring-ink-100 hover:bg-upm-50 hover:text-upm-700')
            }
            title="Ver fuentes"
          >
            <Wifi size={12} /> Fuentes
          </button>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={revalidating}>
            <RefreshCw size={12} className={revalidating ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      {/* Stats por fuente · colapsado por defecto para no ocupar tanto espacio */}
      {sourcesOpen && liveSources.length > 0 && (() => {
        const okCount = liveSources.filter(s => s.ok).length
        // Contar ítems del feed real (después de dedupe), no la suma de counts.
        const totalItems = NEWS.length
        const countriesSet = new Set(liveSources.filter(s => s.ok).map(s => s.country))
        return (
          <div className="rounded-2xl bg-white p-3 ring-1 ring-ink-100 shadow-card">
            <div className="flex flex-wrap items-center gap-2 pb-2 text-[11.5px]">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">Fuentes activas</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[10.5px] font-bold text-success-fg ring-1 ring-success-bg">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
                {okCount}/{liveSources.length}
              </span>
              <span className="font-semibold text-ink-700 tabular-nums">{totalItems} ítems</span>
              <span className="hidden sm:inline text-ink-500">
                {[...countriesSet].map(c => countryByCode(c).flag).join(' ')}
              </span>
              <button
                onClick={() => setSourcesOpen(false)}
                className="ml-auto rounded-full p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <ChevronDown size={14} className="rotate-180" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 border-t border-ink-100 pt-2.5">
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
          </div>
        )
      })()}

      {/* Pulso de hoy · 3 cards hero que responden "qué pasó importante hoy"
          en 3 segundos. Click → aplica preset al Radar. */}
      {!isLoadingInitial && NEWS.length > 0 && (
        <PulseToday items={NEWS} onPresetClick={setPreset} />
      )}

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

      {/* Quick filter pills · presets de filtros que el usuario puede aplicar
          de un click sin abrir el panel completo. */}
      {!isLoadingInitial && (
        <QuickFilterPills active={preset} onChange={setPreset} counts={presetCounts} />
      )}

      {/* Toolbar: count + density + view mode.
          Mobile: header del AppShell ocupa los primeros 56px y es z-30, así que
          posicionamos debajo (top-14) con z-20 para evitar overlap.
          Desktop: no hay header sticky · top-2 es suficiente. */}
      <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 backdrop-blur-md ring-1 ring-ink-100 shadow-card md:top-2">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-700">
          {loading || isLoadingInitial ? (
            <>
              <span className="inline-block h-2 w-2 animate-pulse-soft rounded-full bg-upm-400" />
              {isLoadingInitial ? 'Trayendo novedades en vivo de fuentes oficiales…' : 'Filtrando…'}
            </>
          ) : (
            <span><span className="font-bold text-upm-800 tabular-nums">{filtered.length}</span> novedades</span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Export · CSV o Markdown del listado filtrado */}
          <ExportRadarButton items={filtered} disabled={loading || isLoadingInitial} />
          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 rounded-full bg-ink-50 p-0.5 ring-1 ring-ink-100">
            <button
              onClick={() => setViewMode('list')}
              className={'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ' + (viewMode === 'list' ? 'bg-white text-upm-700 shadow-cta' : 'text-ink-500 hover:text-ink-700')}
              title="Vista lista"
            >
              <LayoutList size={11} /> Lista
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ' + (viewMode === 'timeline' ? 'bg-white text-upm-700 shadow-cta' : 'text-ink-500 hover:text-ink-700')}
              title="Vista timeline"
            >
              <CalendarRange size={11} /> Timeline
            </button>
            <button
              onClick={() => setViewMode('clusters')}
              className={'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ' + (viewMode === 'clusters' ? 'bg-white text-upm-700 shadow-cta' : 'text-ink-500 hover:text-ink-700')}
              title="Ver normas agrupadas por vínculos de citas"
            >
              <Boxes size={11} /> Redes
            </button>
          </div>
        </div>
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
        preset === 'mi-comision' ? (
          (!prefs?.countries?.length && !prefs?.topics?.length) ? (
            <EmptyState
              icon={<Sparkles size={22} />}
              title="Tu comisión no está configurada"
              description="Configurá tus países y temas de interés en Perfil para ver solo lo que te importa."
              action={
                <Button size="md" variant="secondary" onClick={() => navigate('/perfil')}>
                  Ir a Preferencias
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Sparkles size={22} />}
              title="Sin novedades para tu comisión hoy"
              description={`No hay novedades que coincidan con tus filtros activos (${[...(prefs?.countries ?? []), ...(prefs?.topics ?? [])].slice(0, 3).join(' · ')}). Probá ampliar el período o ver todo el Radar.`}
              action={
                <Button size="md" variant="secondary" onClick={() => setPreset('all')}>
                  Ver todas las novedades
                </Button>
              }
            />
          )
        ) : (
          <EmptyState
            icon={<Filter size={22} />}
            title="No encontramos novedades"
            description="Probá con otro país, tema, palabra clave o quitando el preset activo. El Radar UPM se actualiza varias veces al día."
          />
        )
      ) : viewMode === 'timeline' ? (
        <RadarTimeline items={filtered} />
      ) : viewMode === 'clusters' ? (
        clustersData ? (
          <RadarClusters clusters={clustersData.clusters} singletonsCount={clustersData.singletons.length} />
        ) : (
          <div className="rounded-3xl bg-white p-8 text-center text-[13px] text-ink-500 ring-1 ring-ink-100">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse-soft rounded-full bg-upm-400" />
              Construyendo grafo de ecosistemas normativos…
            </span>
          </div>
        )
      ) : (
        <>
          <div className={density === 'compact' ? 'flex flex-col gap-1.5' : 'flex flex-col gap-3'}>
            {filtered.slice(0, visibleCount).map((n, i) => (
              <RadarSmartCard
                key={n.id}
                item={n}
                index={i}
                citationCount={getCitationCount(n.id, citationGraph)}
                isSaved={savedRefs.has(n.id)}
                density={density}
                searchQuery={debouncedQ}
                prefs={prefs}
              />
            ))}
          </div>
          {filtered.length > visibleCount && (
            <div className="flex flex-col items-center gap-2 py-3">
              <button
                onClick={() => setVisibleCount(v => v + 100)}
                className="inline-flex items-center gap-1.5 rounded-full bg-upm-700 px-5 py-2 text-[12.5px] font-bold text-white shadow-cta hover:-translate-y-0.5"
              >
                Cargar 100 más
              </button>
              <p className="text-[10.5px] text-ink-500">
                Mostrando {visibleCount} de {filtered.length} · perf optimizada
              </p>
            </div>
          )}
        </>
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
