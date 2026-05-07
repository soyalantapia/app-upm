import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  ExternalLink,
  Globe,
  MessageSquareText,
  ScrollText,
  Share2,
  Tag,
} from 'lucide-react'
import { Badge, Eyebrow } from '@/components/ui'
import { NEWS, countryByCode, topicById } from '@/lib/data'
import { store, useStore } from '@/lib/store'
import { shareLink } from '@/lib/share'

export function NewsConversationPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const news = useMemo(() => NEWS.find(n => n.id === id) ?? NEWS[0], [id])
  const country = countryByCode(news.country)
  const topic = topicById(news.topic)
  const isSaved = useStore(s => s.saved.some(i => i.ref === news.id))

  const relTone = news.relevance === 'alta' ? 'danger' : news.relevance === 'media' ? 'warning' : 'info'

  const handleSave = () => {
    if (isSaved) {
      const item = store.getSnapshot().saved.find(i => i.ref === news.id)
      if (item) {
        store.removeSaved(item.id)
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

      {/* Cabecera de la novedad */}
      <article className="flex flex-col gap-4 rounded-3xl bg-white p-6 ring-1 ring-ink-100 shadow-card sm:p-8">
        <Eyebrow icon={<ScrollText size={11} />}>Novedad normativa</Eyebrow>

        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink-900 sm:text-[32px]">
          {news.title}
        </h1>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="brand"><Globe size={10} /> {country.flag} {country.name}</Badge>
          <Badge tone="ghost"><Tag size={10} /> {topic.label}</Badge>
          <Badge tone="info">{news.type}</Badge>
          <Badge tone={relTone}>Relevancia {news.relevance}</Badge>
          <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-ink-500 tabular-nums">
            <CalendarDays size={12} /> {news.date}
          </span>
        </div>

        <p className="text-[16px] leading-relaxed text-ink-700">{news.excerpt}</p>

        <div className="rounded-2xl bg-upm-50/60 p-4 ring-1 ring-upm-100">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">Fuente institucional</div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <div>
              <div className="text-[14px] font-bold text-ink-900">{news.source}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-500 tabular-nums">Publicado el {news.date}</div>
            </div>
            <button
              onClick={() => store.pushToast('info', 'Apertura de fuente externa simulada')}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-semibold text-upm-700 ring-1 ring-upm-100 hover:bg-upm-50"
            >
              <ExternalLink size={11} /> Ver fuente
            </button>
          </div>
        </div>
      </article>

      {/* Único CTA */}
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
