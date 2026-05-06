import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUp,
  Bookmark,
  Check,
  Clock4,
  Copy,
  FileStack,
  History,
  Layers,
  ListChecks,
  MessageSquareQuote,
  PenLine,
  Plus,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Badge, Button, Card, Eyebrow, PageHeader } from '@/components/ui'
import { Markdown } from '@/components/Markdown'
import { SourceCard } from '@/components/SourceCard'
import { generateAssistantResponse } from '@/lib/respond'
import { store, useStore } from '@/lib/store'
import { copyToClipboard, shareLink } from '@/lib/share'
import { useUI } from '@/lib/ui-provider'
import type { ChatMessage } from '@/lib/types'
import { useNavigate } from 'react-router-dom'

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

const INITIAL: ChatMessage = {
  id: 'init',
  role: 'assistant',
  content:
    '**Asistente del Legislador**\n\n' +
    'Estoy listo para trabajar. Puedo resumir, redactar, preparar briefs y consultar la Biblioteca UPM con fuentes verificables.\n\n' +
    'Probá una pregunta o usá las sugerencias.',
  isInstitutional: true,
  createdAt: new Date().toISOString(),
}

function userMessage(content: string): ChatMessage {
  return {
    id: 'm' + Math.random().toString(36).slice(2, 9),
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  }
}

function deriveTitle(messages: ChatMessage[]) {
  const firstUser = messages.find(m => m.role === 'user')
  if (firstUser) return firstUser.content.slice(0, 60)
  return 'Conversación con Asistente'
}

export function AssistantPage() {
  const { openCreateMinuta, openCreateBrief, openDocument } = useUI()
  const conversations = useStore(s => s.conversations)
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
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

  const regenerate = () => {
    if (thinking) return
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUser) return
    setThinking(true)
    setTimeout(() => {
      const reply = generateAssistantResponse(lastUser.content)
      setMessages(prev => {
        const idx = [...prev].reverse().findIndex(m => m.role === 'assistant')
        if (idx === -1) return [...prev, reply]
        const realIdx = prev.length - 1 - idx
        return [...prev.slice(0, realIdx), reply, ...prev.slice(realIdx + 1)]
      })
      setThinking(false)
      store.pushToast('info', 'Respuesta regenerada')
    }, 600)
  }

  const newConversation = () => {
    if (messages.length > 1) {
      store.saveConversation(deriveTitle(messages), messages)
      store.pushToast('success', 'Conversación guardada')
    }
    setMessages([INITIAL])
  }

  const loadConversation = (id: string) => {
    const c = conversations.find(x => x.id === id)
    if (!c) return
    if (messages.length > 1) {
      store.saveConversation(deriveTitle(messages), messages)
    }
    setMessages(c.messages)
    setHistoryOpen(false)
    store.pushToast('info', 'Conversación cargada')
  }

  const lastAssistant = useMemo(
    () => [...messages].reverse().find(m => m.role === 'assistant'),
    [messages],
  )

  const saveLastAssistant = () => {
    if (!lastAssistant) return
    store.saveItem({
      id: 'sav-resp-' + lastAssistant.id,
      type: 'respuesta',
      title: lastAssistant.content.split('\n')[0].replace(/\*\*/g, '').slice(0, 80),
      body: lastAssistant.content,
    })
    store.pushToast('success', 'Respuesta guardada en Mi carpeta')
  }

  const copyLastAssistant = async () => {
    if (!lastAssistant) return
    const ok = await copyToClipboard(lastAssistant.content)
    if (ok) store.pushToast('success', 'Respuesta copiada al portapapeles')
  }

  const lastAssistantBody = lastAssistant?.content ?? ''
  const lastAssistantTitle = lastAssistant?.content.split('\n')[0].replace(/\*\*/g, '').slice(0, 80) ?? ''

  return (
    <div className="animate-fade-up mx-auto flex h-full w-full max-w-[1200px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        eyebrow={<Eyebrow icon={<Sparkles size={11} />}>Corazón del producto</Eyebrow>}
        title="Asistente del Legislador"
        description="Pregunta, resume y prepara. Convierte información en un brief listo para usar — con fuentes verificables cuando las usás."
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setHistoryOpen(v => !v)}>
              <History size={14} /> Historial
              {conversations.length > 0 && <Badge tone="brand">{conversations.length}</Badge>}
            </Button>
            <Button size="sm" variant="secondary" onClick={newConversation}>
              <Plus size={14} /> Nueva
            </Button>
            <Badge tone="success">
              <ShieldCheck size={11} /> Modo institucional
            </Badge>
          </>
        }
      />

      {/* Historial */}
      {historyOpen && (
        <Card className="animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
              <Clock4 size={12} /> Conversaciones recientes
            </div>
            <Badge tone="ghost">{conversations.length}</Badge>
          </div>
          {conversations.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-ink-500">
              Aún no hay conversaciones guardadas. Empezá una y se guardará automáticamente al iniciar otra.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {conversations.map(c => (
                <div key={c.id} className="flex items-start gap-2 rounded-2xl bg-white p-3 ring-1 ring-ink-100">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-upm-50 text-upm-700">
                    <MessageSquareQuote size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-semibold text-ink-900">{c.title}</div>
                    <div className="text-[11px] text-ink-500 tabular-nums">
                      {new Date(c.updatedAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {c.messages.length} mensajes
                    </div>
                    <div className="mt-1.5 flex gap-1">
                      <button
                        onClick={() => loadConversation(c.id)}
                        className="rounded-full bg-upm-50 px-2 py-0.5 text-[10.5px] font-bold text-upm-800 hover:bg-upm-100"
                      >
                        Abrir
                      </button>
                      <button
                        onClick={() => {
                          store.removeConversation(c.id)
                          store.pushToast('info', 'Conversación eliminada')
                        }}
                        className="rounded-full px-2 py-0.5 text-[10.5px] font-bold text-ink-500 hover:bg-danger-bg/40 hover:text-danger"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

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
              <ChatBubble
                key={m.id}
                message={m}
                onCopy={async () => {
                  const ok = await copyToClipboard(m.content)
                  if (ok) store.pushToast('success', 'Copiado al portapapeles')
                }}
                onOpenSource={openDocument}
              />
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
            {messages.some(m => m.role === 'user') && (
              <Button type="button" size="md" variant="secondary" onClick={regenerate} disabled={thinking}>
                <RefreshCw size={14} />
              </Button>
            )}
            <Button type="submit" size="lg" disabled={!input.trim() || thinking} className="px-4 py-3">
              <ArrowUp size={17} />
            </Button>
          </form>
        </div>

        {/* Sidebar lateral */}
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
              <ScrollText size={12} /> Acciones sobre la última respuesta
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <ActionButton icon={Copy} label="Copiar respuesta" onClick={copyLastAssistant} disabled={!lastAssistant} />
              <ActionButton icon={Bookmark} label="Guardar en mi carpeta" onClick={saveLastAssistant} disabled={!lastAssistant} />
              <ActionButton
                icon={FileStack}
                label="Crear brief"
                onClick={() => openCreateBrief({ title: `Brief — ${lastAssistantTitle}`, body: lastAssistantBody })}
                disabled={!lastAssistant}
              />
              <ActionButton
                icon={ScrollText}
                label="Crear minuta"
                onClick={() => openCreateMinuta({ title: `Minuta — ${lastAssistantTitle}`, body: lastAssistantBody })}
                disabled={!lastAssistant}
              />
              <ActionButton
                icon={Share2}
                label="Compartir conversación"
                onClick={() => shareLink(lastAssistantTitle || 'Asistente UPM', '/asistente')}
                disabled={!lastAssistant}
              />
              <ActionButton
                icon={RefreshCw}
                label="Regenerar última respuesta"
                onClick={regenerate}
                disabled={!messages.some(m => m.role === 'user') || thinking}
              />
              <ActionButton
                icon={Trash2}
                label="Empezar nueva conversación"
                tone="danger"
                onClick={newConversation}
              />
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
              <Layers size={12} /> Fuentes utilizadas
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {lastAssistant?.sources?.length ? (
                lastAssistant.sources.map(s => (
                  <button key={s.id} onClick={() => openDocument(s.id)} className="text-left">
                    <SourceCard title={s.title} type={s.type} status="oficial" />
                  </button>
                ))
              ) : (
                <div className="rounded-2xl bg-ink-50 px-3 py-3 text-[12.5px] text-ink-500">
                  Activá una pregunta institucional para que aparezcan las fuentes UPM utilizadas.
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-upm-700 to-upm-900 text-white ring-white/10">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-upm-200">Atajos</div>
            <ul className="mt-2 flex flex-col gap-1 text-[12px] text-white/85">
              <li>⌘K · buscar en UPM</li>
              <li>Enter · enviar pregunta</li>
              <li>Shift+Enter · nueva línea</li>
            </ul>
            <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={() => navigate('/biblioteca')}>
              Explorar Biblioteca UPM
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: typeof Copy
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: 'danger'
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        'flex items-center justify-between rounded-2xl bg-white px-3.5 py-2.5 ring-1 shadow-card transition disabled:opacity-50 disabled:cursor-not-allowed ' +
        (tone === 'danger'
          ? 'ring-danger-bg/60 hover:bg-danger-bg/30 text-danger-fg'
          : 'ring-ink-100 hover:-translate-y-0.5 hover:ring-upm-100 text-ink-900')
      }
    >
      <span className="flex items-center gap-2 text-[13px] font-semibold">
        <Icon size={14} className={tone === 'danger' ? 'text-danger' : 'text-upm-600'} />
        {label}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-300">→</span>
    </button>
  )
}

function ChatBubble({
  message,
  onCopy,
  onOpenSource,
}: {
  message: ChatMessage
  onCopy: () => void
  onOpenSource: (id: string) => void
}) {
  const [copied, setCopied] = useState(false)
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
    <div className="group flex justify-start">
      <div className="w-full max-w-[92%] rounded-3xl rounded-tl-md bg-upm-50/40 p-4 ring-1 ring-upm-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={message.isInstitutional ? 'success' : 'warning'}>
              {message.isInstitutional ? 'Con fuentes UPM' : 'Respuesta general'}
            </Badge>
            {message.isInstitutional && message.sources?.length ? (
              <Badge tone="brand">{message.sources.length} fuentes</Badge>
            ) : null}
          </div>
          {message.id !== 'init' && (
            <button
              onClick={async () => {
                await onCopy()
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
              className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10.5px] font-bold text-upm-800 ring-1 ring-upm-100 opacity-0 transition group-hover:opacity-100 hover:bg-upm-50"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          )}
        </div>
        <div className="mt-3">
          <Markdown content={message.content} />
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {message.sources.map(s => (
              <button key={s.id} onClick={() => onOpenSource(s.id)} className="text-left">
                <SourceCard title={s.title} type={s.type} status="oficial" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
