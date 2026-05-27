import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Activity,
  BadgeCheck,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarDays,
  DollarSign,
  ExternalLink,
  FileText,
  Hash,
  MapPin,
  MessageSquareText,
  RefreshCw,
  ScrollText,
  Search,
  Share2,
  Sparkles,
  Tag,
  Timer,
  Users,
} from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { countryByCode, topicById } from '@/lib/data'
import { formatDate } from '@/lib/format'
import { store, useStore } from '@/lib/store'
import { shareLink } from '@/lib/share'
import { useLiveFeed } from '@/lib/use-live-feed'
import type { NewsItem } from '@/lib/types'
import { extractContext } from '@/lib/extract-context'
import { GenealogyBreadcrumb } from '@/components/GenealogyBreadcrumb'
import { ArticuladoPanel } from '@/components/ArticuladoPanel'
import { SuggestedComparison } from '@/components/SuggestedComparison'
import { JurisprudenciaPanel } from '@/components/JurisprudenciaPanel'
import { PageTOC, type TOCSection } from '@/components/PageTOC'
import { SimilarItemsPanel } from '@/components/SimilarItemsPanel'
import { BacklinksPanel } from '@/components/BacklinksPanel'
import { LawMap } from '@/components/LawMap'
import { RegulatoryConstellation } from '@/components/RegulatoryConstellation'
import { AuthorChips } from '@/components/AuthorChips'
import { NotesPanel } from '@/components/NotesPanel'
import { ExportLawButton } from '@/components/ExportLawButton'
import { OverflowActions } from '@/components/OverflowActions'
import { WatchToggleButton } from '@/components/WatchToggleButton'
import { TramitacionFlow } from '@/components/TramitacionFlow'
import { BudgetPanel } from '@/components/BudgetPanel'
import { ModificatoriasTimeline } from '@/components/ModificatoriasTimeline'
import { LazyMount } from '@/components/LazyMount'
import { VigenciaBadge } from '@/components/VigenciaBadge'
import { LawComparator } from '@/components/LawComparator'
import { MultiComparator } from '@/components/MultiComparator'
import { useCitationGraph } from '@/lib/use-citations'
import { computeVigencia, type VigenciaStatus } from '@/lib/vigencia'
import { matchesQuery } from '@/lib/synonyms'
import { useDebounced } from '@/lib/use-debounced'
import { GitCompareArrows } from 'lucide-react'

// Filtro para esta vista: solo leyes ya sancionadas/promulgadas, no proyectos en trámite.
function isSanctionedLaw(item: NewsItem): boolean {
  // Argentina: 1194 leyes nacionales sancionadas (HCDN)
  if (item.id.startsWith('ar-ley-')) return true
  // Argentina · Infoleg (Min. Justicia): leyes nacionales con Boletín Oficial
  if (item.id.startsWith('ar-ley-infoleg-')) return true
  // Colombia: proyectos con estado='LEY' (Socrata feim-cysj)
  if (item.id.startsWith('co-ley-')) return true
  // Colombia · Vista Proyectos cuando estado_del_proyecto_de_ley='Ley' (xs56-s7w6)
  if (item.id.startsWith('co-vista-') && /^ley\b/i.test(item.status ?? '')) return true
  // Colombia · Presidencia DAPRE: leyes, actos legislativos, constitución
  if (item.id.startsWith('co-pres-leyes-')) return true
  if (item.id.startsWith('co-pres-actos-legislativos-')) return true
  if (item.id.startsWith('co-pres-constitución-')) return true
  // Uruguay: 4753 leyes promulgadas por el Poder Ejecutivo
  if (item.id.startsWith('uy-ley-')) return true
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const debouncedQ = useDebounced(q, 200)
  // Tab del sidebar: 'all' (todas) | 'saved' (solo guardadas/watch del usuario)
  const [sidebarTab, setSidebarTab] = useState<'all' | 'saved'>('all')
  const savedItems = useStore(s => s.saved)
  const savedRefs = useMemo(
    () => new Set(savedItems.map(i => i.ref).filter(Boolean) as string[]),
    [savedItems],
  )
  const [showComparator, setShowComparator] = useState(false)
  const [showMultiComparator, setShowMultiComparator] = useState(false)
  const [vigenciaFilter, setVigenciaFilter] = useState<VigenciaStatus | 'all'>('all')
  // Grafo de citas para vigencia
  const { graph: citationGraph } = useCitationGraph()

  // Sincronizar query con URL (?q=27541) para deep-links desde NewsConversation
  // y otras pantallas. Limpiar el param cuando q queda vacía.
  useEffect(() => {
    if (q) setSearchParams({ q }, { replace: true })
    else if (searchParams.get('q')) setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  // Contexto extraído del fullText de la ley activa (8 capas: resumen, articulado,
  // decretos relacionados, leyes citadas, montos, plazos, provincias, instituciones).
  const ctx = useMemo(() => extractContext(active?.fullText), [active?.fullText])

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
    const term = debouncedQ.trim().toLowerCase()
    if (!term) return laws
    const matched = laws.filter(l => {
      // Búsqueda full-text con q-expansion de sinónimos.
      const haystack = [
        l.title,
        l.excerpt,
        l.fullText,
        l.authors,
        l.status,
        l.tipoDocumento,
        l.source,
        (l.keywords ?? []).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
      return matchesQuery(haystack, term)
    })
    // Si la query es solo dígitos, priorizar match EXACTO al número de ley
    // (ej. "27541" debe poner Ley 27541 antes que Ley 27562 que también la cita).
    if (/^\d{4,5}$/.test(term)) {
      return matched.sort((a, b) => {
        const aExact = a.id === `ar-ley-${term}` || a.id === `uy-ley-${term}` || a.id === `ar-ley-infoleg-${term}`
        const bExact = b.id === `ar-ley-${term}` || b.id === `uy-ley-${term}` || b.id === `ar-ley-infoleg-${term}`
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        // El título que arranca con "Ley {NUM} ·" pesa más (es la ley raíz, no
        // una modificatoria como "Ley 27562 · Ley 27541 · MODIFICACIÓN").
        const titleAStart = `Ley ${term} ·`
        const titleBStart = `Ley ${term} ·`
        const aIsRoot = (a.title ?? '').startsWith(titleAStart) ? 1 : 0
        const bIsRoot = (b.title ?? '').startsWith(titleBStart) ? 1 : 0
        if (aIsRoot !== bIsRoot) return bIsRoot - aIsRoot
        // Tiebreaker: fecha desc
        return (b.date ?? '').localeCompare(a.date ?? '')
      })
    }
    return matched
  }, [laws, debouncedQ])

  // Aplicar filtro por vigencia · usa el grafo de citas para clasificar cada ley.
  // Si el grafo todavía no cargó, no filtra (muestra todas).
  const filteredByVigencia = useMemo(() => {
    if (!citationGraph || vigenciaFilter === 'all') return filtered
    return filtered.filter(l => {
      const info = computeVigencia(l, citationGraph)
      return info.status === vigenciaFilter
    })
  }, [filtered, citationGraph, vigenciaFilter])

  // Aplicar tab del sidebar: 'saved' filtra a leyes guardadas/watched.
  const filteredFinal = useMemo(() => {
    if (sidebarTab === 'saved') return filteredByVigencia.filter(l => savedRefs.has(l.id))
    return filteredByVigencia
  }, [filteredByVigencia, sidebarTab, savedRefs])
  const savedCount = useMemo(() => laws.filter(l => savedRefs.has(l.id)).length, [laws, savedRefs])

  // Vigencia de la ley activa (mostrada en el detalle como badge prominente)
  const activeVigencia = useMemo(() => {
    if (!active || !citationGraph) return null
    return computeVigencia(active, citationGraph)
  }, [active, citationGraph])

  // Cuando cambia la query y el active no aparece en los resultados filtrados,
  // saltar al primer resultado (mejora la UX al buscar por número exacto).
  useEffect(() => {
    if (!q.trim()) return
    if (filtered.length > 0 && active && !filtered.find(l => l.id === active.id)) {
      setActive(filtered[0])
    } else if (filtered.length > 0 && /^\d{4,5}$/.test(q.trim())) {
      const term = q.trim()
      const exact = filtered.find(l =>
        l.id === `ar-ley-${term}` || l.id === `uy-ley-${term}` || l.id === `ar-ley-infoleg-${term}`,
      )
      if (exact && active?.id !== exact.id) setActive(exact)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filtered])

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
      {/* Header compacto · título + freshness + Actualizar */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <BookOpen size={11} /> Hablar con leyes
          </div>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-ink-900 sm:text-[26px]">
            Leyes sancionadas
          </h1>
          <p className="mt-0.5 text-[11.5px] text-ink-500">
            {liveStatus === 'live' && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft align-middle" />}
            {laws.length} leyes con texto íntegro · listo para preguntar al Asistente
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={refresh} disabled={revalidating}>
          <RefreshCw size={12} className={revalidating ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Actualizar</span>
        </Button>
      </div>

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
            {/* Tabs principales: Todas | Guardadas */}
            <div className="flex w-full min-w-0 items-center gap-1 rounded-full bg-white p-1 ring-1 ring-ink-100 shadow-card">
              <button
                onClick={() => setSidebarTab('all')}
                className={
                  'flex-1 min-w-0 truncate rounded-full px-3 py-1.5 text-[12px] font-bold transition ' +
                  (sidebarTab === 'all' ? 'bg-upm-700 text-white shadow-cta' : 'text-ink-600 hover:bg-ink-50')
                }
              >
                Todas ({laws.length})
              </button>
              <button
                onClick={() => setSidebarTab('saved')}
                className={
                  'flex-1 min-w-0 inline-flex items-center justify-center gap-1 truncate rounded-full px-3 py-1.5 text-[12px] font-bold transition ' +
                  (sidebarTab === 'saved' ? 'bg-upm-700 text-white shadow-cta' : 'text-ink-600 hover:bg-ink-50')
                }
                title="Solo leyes que guardaste o tenés en seguimiento"
              >
                <Bookmark size={11} className="shrink-0" /> Guardadas ({savedCount})
              </button>
            </div>
            <label className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-ink-100 shadow-card focus-within:ring-upm-400">
              <Search size={14} className="text-upm-600" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={`Buscar por nº (ej: 27742), tema o sector…`}
                className="flex-1 bg-transparent text-[13px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
              {q && (
                <button
                  onClick={() => setQ('')}
                  className="rounded-full p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
                  aria-label="Limpiar búsqueda"
                  title="Limpiar"
                >
                  <span className="text-[14px] leading-none">×</span>
                </button>
              )}
            </label>
            {/* Sugerencias de búsqueda · click → setea la query */}
            {!q && (
              <div className="flex flex-wrap items-center gap-1 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Probá:</span>
                {[
                  { label: '27742', q: '27742' },
                  { label: 'ambiente', q: 'ambiente' },
                  { label: 'corredor bioceánico', q: 'corredor bioceánico' },
                  { label: 'MERCOSUR', q: 'mercosur' },
                  { label: 'género', q: 'género' },
                  { label: 'presupuesto', q: 'presupuesto' },
                ].map(s => (
                  <button
                    key={s.q}
                    onClick={() => setQ(s.q)}
                    className="rounded-full bg-upm-50 px-2 py-0.5 text-[10.5px] font-semibold text-upm-700 ring-1 ring-upm-100 transition hover:-translate-y-0.5 hover:bg-upm-100"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            {/* Filtro por vigencia */}
            {citationGraph && (
              <div className="flex flex-wrap gap-1">
                {(['all', 'activa', 'latente', 'en-revision', 'derogada'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setVigenciaFilter(v)}
                    className={
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition ring-1 ' +
                      (vigenciaFilter === v
                        ? 'bg-upm-700 text-white ring-upm-700'
                        : 'bg-white text-ink-600 ring-ink-100 hover:bg-upm-50')
                    }
                  >
                    {v === 'all' ? 'Todas' : v === 'activa' ? '🟢 Activas' : v === 'latente' ? '🟡 Latentes' : v === 'en-revision' ? '🟠 En revisión' : '⚫ Derogadas'}
                  </button>
                ))}
              </div>
            )}
            <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
              {filteredFinal.length} {filteredFinal.length === 1 ? 'ley' : 'leyes'}
              {vigenciaFilter !== 'all' && (
                <span className="ml-1 normal-case text-ink-400">/ {filtered.length} totales</span>
              )}
            </div>
            <div className="flex max-h-[640px] flex-col gap-1.5 overflow-y-auto pr-1">
              {filteredFinal.slice(0, 50).map(l => {
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
                      {l.title.replace(/^Ley \d+\s*·\s*/, '')}
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
              {/* Tabla de contenidos · sticky desktop + chip mobile */}
              <PageTOC sections={[
                { id: 'sec-genealogia', label: 'Genealogía' },
                { id: 'sec-comparativa', label: 'Equivalente regional' },
                { id: 'sec-impacto', label: 'Análisis de impacto' },
                { id: 'sec-articulado', label: 'Articulado' },
                { id: 'sec-tramitacion', label: 'Tramitación' },
                { id: 'sec-presupuesto', label: 'Impacto fiscal' },
                { id: 'sec-modificatorias', label: 'Modificatorias' },
                { id: 'sec-similares', label: 'Normas similares' },
                { id: 'sec-backlinks', label: 'Quién la cita' },
                { id: 'sec-jurisprudencia', label: 'Jurisprudencia' },
                { id: 'sec-notas', label: 'Mis notas' },
              ] satisfies TOCSection[]} />

              {/* Barra de acciones · 3 visibles (Guardar, Comparar, Asistente)
                  + Más con resto (Compartir, Multi-país, Watch, Export). */}
              <OverflowActions visibleCount={3}>
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
                  onClick={() => setShowComparator(true)}
                  className="group inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-upm-700 ring-1 ring-upm-200 shadow-cta transition hover:-translate-y-0.5 hover:bg-upm-50"
                  title="Comparar esta ley con su equivalente en otro país del Mercosur"
                >
                  <GitCompareArrows size={12} /> Comparar
                </button>
                <button
                  onClick={() => {
                    store.pushToast('info', 'El Asistente preparó preguntas sobre esta ley')
                    navigate('/asistente')
                  }}
                  className="group inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-upm-500 to-upm-700 px-3 py-1.5 text-[12px] font-semibold text-white shadow-cta transition hover:-translate-y-0.5 hover:shadow-floating"
                >
                  <MessageSquareText size={12} /> Asistente
                  <span className="transition group-hover:translate-x-0.5">→</span>
                </button>
                {/* En "Más" ↓ */}
                <button
                  onClick={() => shareLink(active.title, '/leyes')}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 hover:text-upm-700"
                >
                  <Share2 size={12} /> Compartir
                </button>
                <button
                  onClick={() => setShowMultiComparator(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-upm-700 ring-1 ring-upm-200 hover:bg-upm-50"
                  title="Comparar con hasta 3 países a la vez"
                >
                  <GitCompareArrows size={12} /> Multi-país
                </button>
                <WatchToggleButton item={active} variant="compact" />
                <ExportLawButton item={active} variant="compact" />
              </OverflowActions>

              {/* Identificación + Fuente verificada · barra compacta */}
              <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 ring-1 ring-ink-100 shadow-card sm:p-3.5">
                {/* Chips de metadata · siempre incluye fecha de publicación */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px]">
                  {/* Fecha de publicación · siempre visible */}
                  <LawMetaChip
                    icon={CalendarDays}
                    label="Publicación"
                    value={formatDate(active.dataPublicacao ?? active.date)}
                  />
                  {active.tipoDocumento && (
                    <LawMetaChip icon={Hash} label="Identificación" value={active.tipoDocumento} />
                  )}
                  {active.authors && (
                    <LawMetaChip icon={Users} label="Autoría" value={active.authors} truncate />
                  )}
                  {active.status && (
                    <LawMetaChip icon={Hash} label="Estado" value={active.status} />
                  )}
                  {active.comision && (
                    <LawMetaChip icon={ScrollText} label="Comisión" value={active.comision} />
                  )}
                </div>

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
                {activeVigencia && (
                  <VigenciaBadge info={activeVigencia} compact />
                )}
              </div>

              {/* Vigencia detallada · solo si hay razones útiles que mostrar */}
              {activeVigencia && activeVigencia.reasons.length > 0 && (
                <VigenciaBadge info={activeVigencia} />
              )}

              <h2 className="text-[22px] font-bold leading-tight tracking-tight text-ink-900 sm:text-[26px]">
                {active.title.replace(/^Ley \d+\s*·\s*/, '')}
              </h2>

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

              {/* Grid de contexto extraído */}
              {(ctx.decretos.length > 0 || ctx.resoluciones.length > 0 || ctx.montos.length > 0 || ctx.plazos.length > 0 || ctx.provincias.length > 0 || ctx.instituciones.length > 0) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {ctx.instituciones.length > 0 && (
                    <LawCtxSection icon={Building2} label="Organismos mencionados">
                      {ctx.instituciones.map(i => (
                        <LawCtxChip key={i}>{i}</LawCtxChip>
                      ))}
                    </LawCtxSection>
                  )}
                  {ctx.provincias.length > 0 && (
                    <LawCtxSection icon={MapPin} label="Lugares afectados">
                      {ctx.provincias.map(p => (
                        <LawCtxChip key={p}>{p}</LawCtxChip>
                      ))}
                    </LawCtxSection>
                  )}
                  {ctx.plazos.length > 0 && (
                    <LawCtxSection icon={Timer} label="Plazos">
                      {ctx.plazos.map((p, i) => (
                        <LawCtxChip key={`p-${i}-${p}`}>{p}</LawCtxChip>
                      ))}
                    </LawCtxSection>
                  )}
                  {ctx.montos.length > 0 && (
                    <LawCtxSection icon={DollarSign} label="Montos">
                      {ctx.montos.map((m, i) => (
                        <LawCtxChip key={`m-${i}-${m}`}>{m}</LawCtxChip>
                      ))}
                    </LawCtxSection>
                  )}
                  {ctx.decretos.length > 0 && (
                    <LawCtxSection icon={ScrollText} label="Decretos relacionados">
                      {ctx.decretos.map(d => (
                        <LawCtxChip key={d}>{d}</LawCtxChip>
                      ))}
                    </LawCtxSection>
                  )}
                  {ctx.resoluciones.length > 0 && (
                    <LawCtxSection icon={FileText} label="Resoluciones citadas">
                      {ctx.resoluciones.map(r => (
                        <LawCtxChip key={r}>{r}</LawCtxChip>
                      ))}
                    </LawCtxSection>
                  )}
                </div>
              )}

              {/* === BLOQUE CONTEXTUAL (arriba) ===
                  Genealogía → Comparativa → Análisis de impacto.
                  El legislador necesita el "contexto" antes del articulado detallado. */}

              {/* Genealogía regulatoria · madre → ESTA → hijas. */}
              <div id="sec-genealogia">
                <GenealogyBreadcrumb
                  item={active}
                  laws={laws}
                  onSelect={id => {
                    const ley = laws.find(l => l.id === id)
                    if (ley) setActive(ley)
                  }}
                />
              </div>

              {/* Sugerencia automática de comparación cross-país · 1 click → comparator */}
              <div id="sec-comparativa">
                <SuggestedComparison item={active} onCompare={() => setShowComparator(true)} />
              </div>

              {/* Mapa de la Ley · panel maestro de información conectada (impacto + sectores) */}
              <div id="sec-impacto">
                <LawMap item={active} />
              </div>

              {/* === BLOQUE DETALLE (debajo) === */}

              {/* Articulado (si fue parseable) · con búsqueda within +
                  paginación + botón "Asistente" por artículo */}
              <div id="sec-articulado">
                <ArticuladoPanel
                  articulos={ctx.articulos}
                  lawId={active.id}
                  lawTitle={active.title}
                />
              </div>

              {/* Legisladores autores · si detectamos firmas conocidas */}
              <AuthorChips authorsString={active.authors} />

              {/* Flujo de tramitación · stepper visual */}
              <div id="sec-tramitacion">
                <TramitacionFlow item={active} />
              </div>

              {/* Inversión, contrataciones e impacto fiscal */}
              <div id="sec-presupuesto">
                <BudgetPanel item={active} />
              </div>

              {/* Cronología de modificatorias · solo para leyes nacionales · lazy */}
              <div id="sec-modificatorias">
                <LazyMount minHeight={150}>
                  <ModificatoriasTimeline item={active} />
                </LazyMount>
              </div>

              {/* Anotaciones personales · localStorage */}
              <div id="sec-notas">
                <NotesPanel itemId={active.id} />
              </div>

              {/* Constelación regulatoria · SVG radial de conexiones · lazy */}
              <LazyMount minHeight={500}>
                <RegulatoryConstellation item={active} />
              </LazyMount>

              {/* Normas equivalentes en la región · TF-IDF cross-país */}
              <div id="sec-similares">
                <SimilarItemsPanel itemId={active.id} basePath="/leyes" />
              </div>

              {/* Backlinks · normas que citan esta ley */}
              <div id="sec-backlinks">
                <BacklinksPanel itemId={active.id} />
              </div>

              {/* Jurisprudencia · fallos de CSJN/STF/SCJ que aplican esta ley.
                  Lazy fetch desde datasets en public/data. No renderiza si
                  no hay fallos relacionados. */}
              <div id="sec-jurisprudencia">
                <JurisprudenciaPanel itemId={active.id} />
              </div>

              {/* Sumario completo */}
              {active.fullText && active.fullText.length > 0 && (
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Sumario íntegro</div>
                  <p className="mt-2 whitespace-pre-line break-words text-[14.5px] leading-relaxed text-ink-800">
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

      {/* Modal comparador · se monta al final del DOM, fixed overlay */}
      {showComparator && active && (
        <LawComparator source={active} onClose={() => setShowComparator(false)} />
      )}
      {showMultiComparator && active && (
        <MultiComparator source={active} onClose={() => setShowMultiComparator(false)} />
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

function LawCtxSection({
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

function LawCtxChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-upm-50/80 px-2.5 py-1 text-[11.5px] font-semibold text-upm-800 ring-1 ring-upm-100">
      {children}
    </span>
  )
}
