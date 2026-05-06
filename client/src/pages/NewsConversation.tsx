import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CalendarPlus,
  FileStack,
  HelpCircle,
  MessageSquareText,
  ScrollText,
  Share2,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { Badge, Card, Eyebrow } from '@/components/ui'
import { Markdown } from '@/components/Markdown'
import { NEWS, countryByCode, topicById } from '@/lib/data'
import { generateAssistantResponse } from '@/lib/respond'
import { store, useStore } from '@/lib/store'
import { useUI } from '@/lib/ui-provider'
import { shareLink } from '@/lib/share'
import type { ChatMessage } from '@/lib/types'

const QUESTIONS = [
  { label: 'Explicámelo simple', q: 'Explicame este decreto simple, ¿qué cambió?' },
  { label: 'Resumir en 10 líneas', q: 'Resumí en 10 líneas' },
  { label: 'Resumir en 1 página', q: 'Resumí en 1 página' },
  { label: '¿Qué cambió?', q: '¿Qué cambió respecto al marco anterior?' },
  { label: 'Puntos para la comisión', q: 'Preguntas para comisión sobre ambiente' },
]

export function NewsConversationPage() {
  const { id } = useParams()
  const news = useMemo(() => NEWS.find(n => n.id === id) ?? NEWS[0], [id])
  const country = countryByCode(news.country)
  const topic = topicById(news.topic)
  const isSaved = useStore(s => s.saved.some(i => i.ref === news.id))
  const { openCreateBrief, openCreateMinuta } = useUI()

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content:
        '**Lista para trabajar esta novedad**\n\n' +
        'Probá con las preguntas sugeridas o escribí la tuya. Respondo con fuentes UPM cuando aplica.',
      isInstitutional: true,
      createdAt: new Date().toISOString(),
    },
  ])
  const [thinking, setThinking] = useState(false)

  const ask = (text: string) => {
    if (thinking) return
    setMessages(prev => [
      ...prev,
      { id: 'u-' + Date.now(), role: 'user', content: text, createdAt: new Date().toISOString() },
    ])
    setThinking(true)
    setTimeout(() => {
      const reply = generateAssistantResponse(text)
      setMessages(prev => [...prev, reply])
      setThinking(false)
    }, 700)
  }

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

  const lastAssistant = useMemo(
    () => [...messages].reverse().find(m => m.role === 'assistant' && m.id !== 'init'),
    [messages],
  )

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between">
        <Link to="/radar" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-upm-700 hover:text-upm-800">
          <ArrowLeft size={14} /> Volver al Radar
        </Link>
        <Eyebrow icon={<MessageSquareText size={11} />}>Conversación con novedad</Eyebrow>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_300px]">
        {/* Columna 1: novedad */}
        <Card className="lg:sticky lg:top-6 self-start">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-upm-50 text-upm-700">
            <ScrollText size={18} />
          </div>
          <h2 className="mt-3 text-[17px] font-bold leading-snug tracking-tight text-ink-900">{news.title}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{news.excerpt}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="brand">{country.flag} {country.name}</Badge>
            <Badge tone="ghost">{topic.shortLabel}</Badge>
            <Badge tone="info">{news.type}</Badge>
            <Badge tone={news.relevance === 'alta' ? 'danger' : news.relevance === 'media' ? 'warning' : 'info'}>
              Relevancia {news.relevance}
            </Badge>
            {isSaved && <Badge tone="success">Guardado</Badge>}
          </div>
          <div className="mt-3 rounded-2xl bg-upm-50/60 p-3 ring-1 ring-upm-100">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">Fuente institucional</div>
            <div className="mt-1 text-[12.5px] text-ink-700">{news.source}</div>
            <div className="mt-1 text-[11px] text-ink-500 tabular-nums">{news.date}</div>
          </div>
        </Card>

        {/* Columna 2: chat */}
        <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 ring-1 ring-ink-100 shadow-card sm:p-5">
          <div className="flex flex-wrap gap-2">
            {QUESTIONS.map(q => (
              <button
                key={q.label}
                onClick={() => ask(q.q)}
                disabled={thinking}
                className="rounded-full bg-upm-50 px-3 py-1.5 text-[12.5px] font-semibold text-upm-800 ring-1 ring-upm-100 transition hover:-translate-y-0.5 hover:bg-upm-100 disabled:opacity-60"
              >
                {q.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {messages.map(m =>
              m.role === 'user' ? (
                <div key={m.id} className="self-end max-w-[85%] rounded-3xl rounded-br-md bg-gradient-to-br from-upm-500 to-upm-700 px-4 py-3 text-[14px] leading-relaxed text-white shadow-cta">
                  {m.content}
                </div>
              ) : (
                <div key={m.id} className="rounded-3xl bg-upm-50/40 p-4 ring-1 ring-upm-100">
                  <div className="flex items-center gap-2">
                    <Badge tone={m.isInstitutional ? 'success' : 'warning'}>
                      {m.isInstitutional ? 'Con fuentes UPM' : 'Respuesta general'}
                    </Badge>
                    {m.sources?.length ? <Badge tone="brand">{m.sources.length} fuentes</Badge> : null}
                  </div>
                  <div className="mt-3">
                    <Markdown content={m.content} />
                  </div>
                </div>
              ),
            )}
            {thinking && (
              <div className="inline-flex items-center gap-2 rounded-full bg-upm-50 px-3 py-1.5 text-[12px] font-semibold text-upm-700 ring-1 ring-upm-100 self-start">
                <Sparkles size={12} className="animate-pulse-soft" /> Buscando respuesta institucional…
              </div>
            )}
          </div>
        </div>

        {/* Columna 3: acciones */}
        <Card className="self-start lg:sticky lg:top-6">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
            <Wand2 size={12} /> Acciones sobre la novedad
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <ActionRow
              icon={isSaved ? BookmarkCheck : Bookmark}
              label={isSaved ? 'Quitar de carpeta' : 'Guardar en carpeta'}
              onClick={handleSave}
            />
            <ActionRow
              icon={Share2}
              label="Compartir enlace"
              onClick={() => shareLink(news.title, `/radar/${news.id}`)}
            />
            <ActionRow
              icon={FileStack}
              label="Crear brief"
              onClick={() =>
                openCreateBrief({
                  title: `Brief — ${news.title}`,
                  body:
                    `**Contexto**\n\n${news.excerpt}\n\n` +
                    `**País:** ${country.name}\n**Tema:** ${topic.label}\n**Relevancia:** ${news.relevance}\n\n` +
                    `**Última respuesta del Asistente**\n\n${lastAssistant?.content ?? '—'}`,
                  ref: news.id,
                })
              }
            />
            <ActionRow
              icon={ScrollText}
              label="Crear minuta"
              onClick={() =>
                openCreateMinuta({
                  title: `Minuta — ${news.title}`,
                  body: lastAssistant?.content ?? '',
                  ref: news.id,
                })
              }
            />
            <ActionRow
              icon={HelpCircle}
              label="Crear preguntas para comisión"
              onClick={() => ask('Preguntas para comisión sobre ambiente')}
            />
            <ActionRow icon={CalendarPlus} label="Recordatorio" onClick={() => {
              store.pushNotification({ type: 'sistema', title: 'Recordatorio creado', description: news.title })
              store.pushToast('success', 'Recordatorio agregado a tus notificaciones')
            }} />
          </div>
        </Card>
      </div>
    </div>
  )
}

function ActionRow({ icon: Icon, label, onClick }: { icon: typeof Bookmark; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between rounded-2xl bg-white px-3.5 py-2.5 ring-1 ring-ink-100 shadow-card transition hover:-translate-y-0.5 hover:ring-upm-100"
    >
      <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-900">
        <Icon size={15} className="text-upm-600" />
        {label}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-300">→</span>
    </button>
  )
}
