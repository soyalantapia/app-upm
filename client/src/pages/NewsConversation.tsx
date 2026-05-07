import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  MessageSquareText,
  ScrollText,
  Share2,
  Tag,
  Users,
} from 'lucide-react'
import { Badge, Eyebrow } from '@/components/ui'
import { countryByCode, topicById } from '@/lib/data'
import { store, useStore } from '@/lib/store'
import { shareLink } from '@/lib/share'
import { useNewsItem } from '@/lib/use-news-item'

export function NewsConversationPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { item, loading, enriching } = useNewsItem(id)
  const isSaved = useStore(s => (item ? s.saved.some(i => i.ref === item.id) : false))

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
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-[14px] text-ink-500">Novedad no encontrada.</p>
        <Link to="/radar" className="mt-3 inline-flex text-upm-700 hover:underline">← Volver al Radar</Link>
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

  const fmt = (d?: string) => (d ? d.slice(0, 10) : null)

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[820px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between">
        <Link to="/radar" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-upm-700 hover:text-upm-800">
          <ArrowLeft size={14} /> Volver al Radar
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shareLink(news.title, `/radar/${news.id}`)}
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
            {isSaved ? 'Guardado' : 'Guardar'}
          </button>
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

        {/* Metadata oficial */}
        <div className="grid grid-cols-1 gap-3 rounded-2xl bg-upm-50/40 p-4 ring-1 ring-upm-100 sm:grid-cols-2">
          {news.tipoDocumento && (
            <Meta icon={Hash} label="Identificación" value={news.tipoDocumento} />
          )}
          {news.tipoConteudo && news.tipoConteudo !== news.tipoDocumento && (
            <Meta icon={FileText} label="Tipo de contenido" value={news.tipoConteudo} />
          )}
          {news.authors && (
            <Meta icon={Users} label="Autoría" value={news.authors} className="sm:col-span-2" />
          )}
          {fmt(news.dataPublicacao) && (
            <Meta icon={CalendarDays} label="Presentación" value={fmt(news.dataPublicacao)!} />
          )}
          {fmt(news.dataAtualizacao) && (
            <Meta icon={Clock} label="Última actualización" value={fmt(news.dataAtualizacao)!} />
          )}
        </div>

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

        {/* Fuente institucional */}
        <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-100">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">Fuente institucional</div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[14px] font-bold text-ink-900">{news.source}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-500 tabular-nums">Fecha del feed: {news.date}</div>
            </div>
            {news.sourceUrl && (
              <a
                href={news.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-upm-50 px-3 py-1.5 text-[11.5px] font-semibold text-upm-700 ring-1 ring-upm-100 hover:bg-upm-100"
              >
                <ExternalLink size={11} /> {news.pdfUrl ? 'Abrir documento oficial' : 'Ver fuente'}
              </a>
            )}
          </div>
        </div>
      </article>

      {/* CTA único: Hablar con el Asistente */}
      <button
        onClick={() => {
          store.pushToast('info', 'El Asistente preparó preguntas sobre este tema')
          navigate('/asistente')
        }}
        className="group flex items-center justify-between gap-4 rounded-3xl bg-gradient-to-br from-upm-500 to-upm-700 p-5 text-white shadow-cta transition hover:-translate-y-0.5 hover:shadow-floating sm:p-6"
      >
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <MessageSquareText size={20} />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-upm-200">Conversar con respaldo</div>
            <div className="mt-0.5 text-[18px] font-bold tracking-tight">Hablar con el Asistente AI sobre este tema</div>
            <div className="mt-1 text-[12.5px] text-white/80">
              Te respondo con fuentes UPM, te armo brief o minuta, y dejo todo guardado.
            </div>
          </div>
        </div>
        <span className="text-[20px] transition group-hover:translate-x-1">→</span>
      </button>
    </div>
  )
}

function Meta({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof Hash
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
        <Icon size={10} /> {label}
      </div>
      <div className="mt-0.5 text-[12.5px] font-semibold leading-snug text-ink-900">{value}</div>
    </div>
  )
}

