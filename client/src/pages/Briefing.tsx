import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bookmark,
  FileText,
  Globe,
  Printer,
  Sparkles,
  Tag,
  Network,
  GitCompareArrows,
} from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { store } from '@/lib/store'
import { COUNTRIES, TOPICS, countryByCode, topicById } from '@/lib/data'
import { formatDate, decodeHtml } from '@/lib/format'
import { useLiveFeed } from '@/lib/use-live-feed'
import { extractContext } from '@/lib/extract-context'
import type { CountryCode, NewsItem, Topic } from '@/lib/types'

// Briefing Pre-sesión · 1-pager imprimible.
// El legislador elige tema + países + ventana temporal · la app destila los 5
// puntos que valen la pena leer antes de su comisión y los formatea para
// imprimir/PDF (window.print con CSS print-friendly).

type Window = '7d' | '30d' | '90d' | '12m'

const WINDOW_LABEL: Record<Window, string> = {
  '7d': 'Últimos 7 días',
  '30d': 'Último mes',
  '90d': 'Último trimestre',
  '12m': 'Último año',
}

function withinWindow(date: string, win: Window): boolean {
  const d = new Date(date).getTime()
  if (Number.isNaN(d)) return false
  const now = Date.now()
  const days = win === '7d' ? 7 : win === '30d' ? 30 : win === '90d' ? 90 : 365
  return now - d <= days * 24 * 60 * 60 * 1000
}

export function BriefingPage() {
  const navigate = useNavigate()
  const { feed, loading: feedLoading } = useLiveFeed()
  const items = feed?.items ?? []
  // Estados clave: cargando feed vs feed cargado pero corpus vacío
  const isInitialLoading = feedLoading && !feed
  const isCorpusEmpty = !feedLoading && feed && items.length === 0

  const [searchParams] = useSearchParams()
  // Deep-link · ?window=7d&topic=all activa el modo Briefing Semanal automático
  const initialWin = (searchParams.get('window') as Window | null) ?? '30d'
  const initialTopic = (searchParams.get('topic') as Topic | 'all' | null) ?? 'integracion-regional'
  const isWeekly = initialWin === '7d'

  const [topic, setTopic] = useState<Topic | 'all'>(initialTopic)
  const [countries, setCountries] = useState<Set<CountryCode>>(
    new Set(isWeekly ? ['AR', 'BR', 'UY', 'CO'] : ['AR', 'BR', 'UY']),
  )
  const [win, setWin] = useState<Window>(initialWin)

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const selected = useMemo(() => {
    return items
      .filter(i => topic === 'all' || i.topic === topic)
      .filter(i => countries.has(i.country))
      .filter(i => withinWindow(i.date, win))
      .sort((a, b) => {
        // Prioridad: alta relevancia primero, luego fecha desc
        const w = { alta: 3, media: 2, baja: 1 }
        const r = w[b.relevance] - w[a.relevance]
        if (r !== 0) return r
        return (b.date ?? '').localeCompare(a.date ?? '')
      })
  }, [items, topic, countries, win])

  // Top 5 destacadas para el briefing (priorizando alta relevancia y diversidad de país)
  const top5 = useMemo(() => {
    const result: NewsItem[] = []
    const seenCountries = new Set<CountryCode>()
    // Primero · 1 por país de alta relevancia
    for (const i of selected) {
      if (i.relevance !== 'alta') continue
      if (seenCountries.has(i.country)) continue
      result.push(i)
      seenCountries.add(i.country)
      if (result.length >= 3) break
    }
    // Después · completar con las próximas mejores
    for (const i of selected) {
      if (result.length >= 5) break
      if (result.includes(i)) continue
      result.push(i)
    }
    return result
  }, [selected])

  // Cambios recientes · últimas 3 normas con tramitación o status nuevo
  const cambiosRecientes = useMemo(() => {
    return selected
      .filter(i => i.tramitaciones?.length || (i.status && i.status !== 'Convocado'))
      .slice(0, 3)
  }, [selected])

  // Cuestiones cruzadas · normas que mencionan al menos otro país del Mercosur
  const cuestionesCruzadas = useMemo(() => {
    return selected
      .filter(i => {
        const text = (i.fullText ?? '') + ' ' + (i.title ?? '')
        const otrosPaises = ['Brasil', 'Uruguay', 'Argentina', 'Paraguay', 'Chile', 'Bolivia', 'MERCOSUR', 'MERCOSUL']
        return otrosPaises.some(p => new RegExp(`\\b${p}\\b`, 'i').test(text))
      })
      .slice(0, 3)
  }, [selected])

  const topicMeta = topic === 'all' ? null : topicById(topic)

  const toggleCountry = (c: CountryCode) => {
    const next = new Set(countries)
    if (next.has(c)) next.delete(c)
    else next.add(c)
    setCountries(next)
  }

  const handlePrint = () => {
    window.print()
  }

  // Loading state · feed inicial
  if (isInitialLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center gap-2 text-[13px] text-ink-500">
          <span className="h-2 w-2 animate-pulse-soft rounded-full bg-upm-400" />
          Trayendo normas oficiales del MERCOSUR…
        </div>
        <div className="skeleton h-32 w-full rounded-3xl" />
        <div className="skeleton h-64 w-full rounded-3xl" />
      </div>
    )
  }

  // Empty state · corpus vacío
  if (isCorpusEmpty) {
    return (
      <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-warning-bg text-warning-fg">
          <Sparkles size={22} />
        </div>
        <h2 className="text-[18px] font-bold text-ink-900">No hay normas en el corpus</h2>
        <p className="text-[13px] text-ink-500">
          Las fuentes oficiales no devolvieron novedades en este momento. Probá actualizar en un rato.
        </p>
        <button
          onClick={() => navigate('/radar')}
          className="rounded-full bg-upm-700 px-4 py-2 text-[13px] font-bold text-white shadow-cta hover:bg-upm-800"
        >
          Volver al Radar
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 print:max-w-full print:px-0 print:py-0">
      {/* Toolbar · oculto al imprimir */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-upm-700 hover:text-upm-800"
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              store.saveItem({
                id: 'brf-' + Date.now(),
                type: 'brief',
                title: `Briefing: ${topicMeta ? topicMeta.label : 'Panorama regional'} · ${WINDOW_LABEL[win]}`,
                body: top5.map((item, idx) => `${idx + 1}. ${item.title}`).join('\n'),
              })
              store.pushToast('success', 'Briefing guardado en Mi carpeta')
            }}
          >
            <Bookmark size={15} /> Guardar en Mi carpeta
          </Button>
          <Button onClick={handlePrint} size="md">
            <Printer size={15} /> Imprimir o exportar a PDF
          </Button>
        </div>
      </div>

      {/* Form de filtros · oculto al imprimir */}
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card print:hidden">
        <div>
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <Sparkles size={11} /> Briefing pre-sesión
          </div>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-ink-900 sm:text-[26px]">
            Armá tu 1-pager
          </h1>
          <p className="mt-0.5 text-[11.5px] text-ink-500">
            Elegí tema, países y ventana. Destilamos 5 normas clave + 3 cambios + 3 cuestiones cruzadas.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">Tema</label>
            <select
              value={topic}
              onChange={e => setTopic(e.target.value as Topic | 'all')}
              className="rounded-xl bg-ink-50 px-3 py-2 text-[13px] font-semibold text-ink-800 ring-1 ring-ink-100 focus:outline-none focus:ring-upm-300"
            >
              <option value="all">Todos los temas</option>
              {TOPICS.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">Ventana</label>
            <select
              value={win}
              onChange={e => setWin(e.target.value as Window)}
              className="rounded-xl bg-ink-50 px-3 py-2 text-[13px] font-semibold text-ink-800 ring-1 ring-ink-100 focus:outline-none focus:ring-upm-300"
            >
              {Object.entries(WINDOW_LABEL).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
              Países ({countries.size})
            </label>
            <div className="flex flex-wrap gap-1">
              {COUNTRIES.map(c => {
                const active = countries.has(c.code)
                return (
                  <button
                    key={c.code}
                    onClick={() => toggleCountry(c.code)}
                    className={
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold transition ' +
                      (active
                        ? 'bg-upm-700 text-white shadow-cta ring-1 ring-upm-700'
                        : 'bg-ink-50 text-ink-600 ring-1 ring-ink-100 hover:bg-ink-100')
                    }
                  >
                    <span>{c.flag}</span>
                    <span>{c.code}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-upm-50/60 p-3 text-[12px] ring-1 ring-upm-100">
          <span className="font-bold text-upm-800">{selected.length}</span>
          <span className="text-ink-600">normas matchean tus filtros · de las que destilamos {top5.length} para el briefing.</span>
        </div>
      </div>

      {/* Documento imprimible · este es el output */}
      <article className="briefing-output flex flex-col gap-5 rounded-3xl bg-white p-6 ring-1 ring-ink-100 shadow-card print:rounded-none print:shadow-none print:ring-0 sm:p-8">
        {/* Cabecera del documento */}
        <header className="flex flex-col gap-2 border-b border-ink-100 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-upm-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-upm-700 ring-1 ring-upm-100">
              <FileText size={11} /> Briefing UPM · Pre-sesión
            </div>
            <span className="text-[11px] tabular-nums text-ink-500">{fechaHoy}</span>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-ink-900 sm:text-[26px]">
            {topicMeta ? topicMeta.label : 'Panorama regional'} · {WINDOW_LABEL[win]}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
            {Array.from(countries).map(c => {
              const country = countryByCode(c)
              return (
                <span key={c} className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2 py-0.5 ring-1 ring-ink-100">
                  <span>{country.flag}</span>
                  <span className="font-semibold text-ink-700">{country.name}</span>
                </span>
              )
            })}
          </div>
        </header>

        {/* Sección 1 · Las 5 que valen la pena */}
        <section>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <Sparkles size={12} /> 5 normas clave para tu sesión
          </div>
          {top5.length === 0 ? (
            <p className="mt-3 text-[12.5px] italic text-ink-500">
              No se encontraron normas con los filtros actuales. Probá ampliar la ventana o sumar países.
            </p>
          ) : (
            <ol className="mt-3 space-y-3">
              {top5.map((item, idx) => {
                const country = countryByCode(item.country)
                const tpc = topicById(item.topic)
                const ctx = extractContext(item.fullText)
                return (
                  <li key={item.id} className="rounded-2xl bg-ink-50/30 p-4 ring-1 ring-ink-100 print:bg-white print:ring-ink-200">
                    <div className="flex items-start justify-between gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-upm-700 text-[12px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                          <span className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 font-bold uppercase tracking-wide text-upm-700 ring-1 ring-upm-100">
                            <Globe size={9} /> {country.flag} {country.code}
                          </span>
                          <Badge tone={item.relevance === 'alta' ? 'danger' : item.relevance === 'media' ? 'warning' : 'info'}>
                            {item.relevance}
                          </Badge>
                          <span className="text-ink-500 tabular-nums">{formatDate(item.date)}</span>
                          {item.tipoDocumento && (
                            <span className="rounded-md bg-white px-1.5 py-0.5 font-semibold text-ink-700 ring-1 ring-ink-100">
                              {item.tipoDocumento}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1.5 text-[14.5px] font-bold leading-snug text-ink-900">
                          {decodeHtml(item.title)}
                        </h3>
                        {ctx.resumen && ctx.resumen.length > 50 && (
                          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-700 line-clamp-3">
                            {ctx.resumen}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-ink-500">
                          <span className="inline-flex items-center gap-1">
                            <Tag size={9} /> {tpc.label}
                          </span>
                          {item.source && (
                            <span className="line-clamp-1">{item.source}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        {/* Sección 2 · Cambios recientes */}
        {cambiosRecientes.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
              <Network size={12} /> Tramitaciones y cambios de estado recientes
            </div>
            <ul className="mt-3 space-y-2">
              {cambiosRecientes.map(item => {
                const country = countryByCode(item.country)
                return (
                  <li key={item.id} className="flex items-start gap-2 text-[12.5px] text-ink-700">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-upm-500" />
                    <div className="flex-1">
                      <span className="font-bold">{country.flag} {country.code}</span> ·{' '}
                      <span>{decodeHtml(item.title)}</span>
                      {item.status && (
                        <span className="ml-1 rounded-md bg-success-bg/60 px-1.5 py-0.5 text-[10px] font-bold text-success-fg ring-1 ring-success-bg">
                          {item.status}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Sección 3 · Cuestiones cruzadas */}
        {cuestionesCruzadas.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
              <GitCompareArrows size={12} /> Cuestiones cruzadas con el resto del Mercosur
            </div>
            <ul className="mt-3 space-y-2">
              {cuestionesCruzadas.map(item => {
                const country = countryByCode(item.country)
                return (
                  <li key={item.id} className="flex items-start gap-2 text-[12.5px] text-ink-700">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-upm-500" />
                    <div className="flex-1">
                      <span className="font-bold">{country.flag} {country.code}</span> ·{' '}
                      <span>{decodeHtml(item.title)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Pie · footer del briefing */}
        <footer className="mt-2 border-t border-ink-100 pt-3 text-[10.5px] text-ink-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Generado por <span className="font-bold text-ink-700">Asistente AI UPM</span> · Datos en vivo de fuentes
              oficiales · {selected.length} normas analizadas en el corpus.
            </span>
            <span className="tabular-nums">{fechaHoy}</span>
          </div>
        </footer>
      </article>

      <style>{`
        @media print {
          @page { margin: 12mm; size: A4; }
          body { background: white !important; }
          .briefing-output { box-shadow: none !important; }
          a { color: inherit !important; text-decoration: none !important; }
          nav, header.app-header, footer.app-footer, button, .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}
