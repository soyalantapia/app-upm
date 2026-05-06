import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUp,
  Bookmark,
  CalendarPlus,
  FileStack,
  Layers,
  ListChecks,
  MessageSquareQuote,
  MessagesSquare,
  PenLine,
  ScrollText,
  ShieldCheck,
  Share2,
  Sparkles,
  Target,
} from 'lucide-react'
import { Badge, Button, Card, Eyebrow, PageHeader } from '@/components/ui'
import { Markdown } from '@/components/Markdown'
import { SourceCard } from '@/components/SourceCard'
import { generateAssistantResponse } from '@/lib/respond'
import { store } from '@/lib/store'
import type { ChatMessage } from '@/lib/types'

const SUGGESTIONS = [
  'Explicame las novedades de ambiente de esta semana.',
  'Preparame un brief para una reunión sobre corredores bioceánicos.',
  'Resumí el último informe en 1 página.',
  '¿Qué puntos debería revisar antes de la comisión?',
  'Armame preguntas para una reunión con Brasil y Uruguay.',
]

const USE_CATEGORIES: { id: string; label: string; icon: typeof PenLine; tone: string; items: { label: string; q: string }[] }[] = [
  {
    id: 'redaccion',
    label: 'Redacción',
    icon: PenLine,
    tone: 'from-upm-500 to-upm-700',
    items: [
      { label: 'Discurso institucional', q: 'Borrador de discurso sobre integración regional' },
      { label: 'Comunicado de prensa', q: 'Borrador de comunicado UPM sobre cooperación legislativa' },
      { label: 'Mensaje institucional', q: 'Mensaje institucional para apertura de foro' },
      { label: 'Puntos para entrevista', q: 'Preparame puntos para entrevista sobre integración regional' },
    ],
  },
  {
    id: 'preparacion',
    label: 'Preparación',
    icon: ListChecks,
    tone: 'from-upm-600 to-upm-800',
    items: [
      { label: 'Brief para reunión', q: 'Preparame un brief para una reunión sobre corredores bioceánicos' },
      { label: 'Preguntas para comisión', q: 'Preguntas para comisión sobre ambiente' },
      { label: 'Resumen de novedades', q: 'Explicame las novedades de ambiente de esta semana' },
      { label: 'Qué cambió', q: '¿Qué cambió respecto al marco anterior?' },
    ],
  },
  {
    id: 'organizacion',
    label: 'Organización',
    icon: MessageSquareQuote,
    tone: 'from-upm-700 to-upm-900',
    items: [
      { label: 'Minuta de trabajo', q: 'Borrador de minuta de reunión técnica' },
      { label: 'Lista de pendientes', q: 'Resumí pendientes legislativos sobre MERCOSUR' },
      { label: 'Próximos pasos', q: '¿Cuáles son los próximos pasos sugeridos?' },
      { label: 'Síntesis ejecutiva', q: 'Resumí en 10 líneas el tema corredores' },
    ],
  },
]

const ACTION_BUTTONS: { label: string; icon: typeof Bookmark; tone: 'success' | 'info' | 'brand' }[] = [
  { label: 'Guardar', icon: Bookmark, tone: 'success' },
  { label: 'Armar dossier', icon: FileStack, tone: 'brand' },
  { label: 'Compartir con equipo', icon: Share2, tone: 'info' },
  { label: 'Crear minuta', icon: ScrollText, tone: 'brand' },
  { label: 'Agregar a agenda', icon: CalendarPlus, tone: 'info' },
]

function userMessage(content: string): ChatMessage {
  return {
    id: 'm' + Math.random().toString(36).slice(2, 9),
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  }
}

export function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init',
      role: 'assistant',
      content:
        '**Asistente del Legislador**\n\n' +
        'Estoy listo para trabajar. Puedo resumir, redactar, preparar briefs y consultar la Biblioteca UPM con fuentes verificables.\n\n' +
        'Probá una pregunta o usá las sugerencias.',
      isInstitutional: true,
      createdAt: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const send = (text?: string) => {
    const value = (text ?? input).trim()
    if (!value || thinking) return
    setMessages(prev => [...prev, userMessage(value)])
    setInput('')
    setThinking(true)
    setTimeout(() => {
      const reply = generateAssistantResponse(value)
      setMessages(prev => [...prev, reply])
      setThinking(false)
    }, 750)
  }

  const lastAssistant = useMemo(
    () => [...messages].reverse().find(m => m.role === 'assistant'),
    [messages],
  )

  return (
    <div className="animate-fade-up mx-auto flex h-full w-full max-w-[1200px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        eyebrow={<Eyebrow icon={<Sparkles size={11} />}>Corazón del producto</Eyebrow>}
        title="Asistente del Legislador"
        description="Pregunta, resume y prepara. Convierte información en un brief listo para usar — con fuentes verificables cuando las usás."
        actions={
          <Badge tone="success">
            <ShieldCheck size={11} /> Modo institucional
          </Badge>
        }
      />

      {/* Categorías de uso */}
      <div className="grid gap-2.5 sm:grid-cols-3">
        {USE_CATEGORIES.map(cat => (
          <div
            key={cat.id}
            className="rounded-3xl bg-white p-4 ring-1 ring-ink-100 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover hover:ring-upm-100"
          >
            <div className="flex items-center gap-2">
              <div className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${cat.tone} text-white shadow-cta`}>
                <cat.icon size={16} />
              </div>
              <div className="text-[14px] font-bold text-ink-900">{cat.label}</div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {cat.items.map(it => (
                <button
                  key={it.label}
                  onClick={() => send(it.q)}
                  className="rounded-full bg-upm-50 px-2.5 py-1 text-[11.5px] font-semibold text-upm-800 ring-1 ring-upm-100 transition hover:-translate-y-0.5 hover:bg-upm-100"
                >
                  {it.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Chat */}
        <div className="flex min-h-0 flex-col rounded-3xl bg-white ring-1 ring-ink-100 shadow-card">
          <div ref={scrollerRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6" style={{ maxHeight: 'calc(100svh - 320px)' }}>
            {messages.map(m => (
              <ChatBubble key={m.id} message={m} />
            ))}
            {thinking && (
              <div className="flex items-center gap-2 px-1 text-[12.5px] text-ink-500">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-upm-400"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                Buscando fuentes UPM…
              </div>
            )}
          </div>

          {/* Sugerencias */}
          {messages.length <= 1 && (
            <div className="border-t border-ink-100 px-4 py-3 sm:px-6">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Probá con</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full bg-upm-50 px-3 py-1.5 text-[12.5px] font-semibold text-upm-800 ring-1 ring-upm-100 transition hover:-translate-y-0.5 hover:bg-upm-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={e => {
              e.preventDefault()
              send()
            }}
            className="flex items-end gap-2 border-t border-ink-100 bg-white p-3 sm:p-4"
          >
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={1}
              placeholder="Pregunta, redactá, resumí, preparate una reunión…"
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl bg-upm-50/40 px-4 py-3 text-[14.5px] text-ink-900 ring-1 ring-upm-100 placeholder:text-ink-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-upm-400"
            />
            <Button type="submit" size="lg" disabled={!input.trim() || thinking} className="px-4 py-3">
              <ArrowUp size={17} />
            </Button>
          </form>
        </div>

        {/* Sidebar lateral */}
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
              <Target size={12} /> Acciones sobre la última respuesta
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {ACTION_BUTTONS.map(a => (
                <button
                  key={a.label}
                  onClick={() => store.pushToast('success', `${a.label} — listo`)}
                  className="flex items-center justify-between rounded-2xl bg-white px-3.5 py-2.5 ring-1 ring-ink-100 shadow-card transition hover:-translate-y-0.5 hover:ring-upm-100"
                >
                  <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-900">
                    <a.icon size={15} className="text-upm-600" />
                    {a.label}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-300">→</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
              <Layers size={12} /> Fuentes utilizadas
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {lastAssistant?.sources?.length ? (
                lastAssistant.sources.map(s => (
                  <SourceCard key={s.id} title={s.title} type={s.type} status="oficial" />
                ))
              ) : (
                <div className="rounded-2xl bg-ink-50 px-3 py-3 text-[12.5px] text-ink-500">
                  Activá una pregunta institucional para que aparezcan las fuentes UPM utilizadas.
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-upm-50 to-white ring-upm-100">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
              <MessagesSquare size={12} /> Tip institucional
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-700">
              El asistente usa <span className="font-bold">biblioteca UPM</span> y normativa cargada por la institución. Cuando responde con fuentes, lo verás marcado como <Badge tone="success">Con fuentes</Badge>.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-3xl rounded-br-md bg-gradient-to-br from-upm-500 to-upm-700 px-4 py-3 text-[14.5px] leading-relaxed text-white shadow-cta">
          {message.content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[92%] rounded-3xl rounded-tl-md bg-upm-50/40 p-4 ring-1 ring-upm-100">
        <div className="flex items-center gap-2">
          <Badge tone={message.isInstitutional ? 'success' : 'warning'}>
            {message.isInstitutional ? 'Con fuentes UPM' : 'Respuesta general'}
          </Badge>
          {message.isInstitutional && message.sources?.length ? (
            <Badge tone="brand">{message.sources.length} fuentes</Badge>
          ) : null}
        </div>
        <div className="mt-3">
          <Markdown content={message.content} />
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {message.sources.map(s => (
              <SourceCard key={s.id} title={s.title} type={s.type} status="oficial" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
