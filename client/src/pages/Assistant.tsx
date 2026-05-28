import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUp,
  Bookmark,
  Check,
  Copy,
  FileStack,
  History,
  Library,
  ListChecks,
  PenLine,
  Plus,
  RefreshCw,
  ScrollText,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Badge, Button, Card, Eyebrow, PageHeader } from '@/components/ui'
import { Markdown } from '@/components/Markdown'
import { SourceCard } from '@/components/SourceCard'
import { generateAssistantResponse } from '@/lib/respond'
import { generateRAGAnswer } from '@/lib/rag'
import { store, useStore } from '@/lib/store'
import { copyToClipboard, shareLink } from '@/lib/share'
import { useUI } from '@/lib/ui-provider'
import type { ChatMessage } from '@/lib/types'

const SUGGESTIONS = [
  'Explicame las novedades de ambiente de esta semana.',
  'Preparame un brief para una reunión sobre corredores bioceánicos.',
  '¿Qué puntos debería revisar antes de la comisión?',
]

const CAPABILITIES: { icon: typeof PenLine; label: string; desc: string }[] = [
  { icon: PenLine, label: 'Redactá', desc: 'Discursos, comunicados, mensajes institucionales' },
  { icon: ListChecks, label: 'Prepará', desc: 'Briefs de reunión, preguntas para comisión' },
  { icon: ScrollText, label: 'Resumí', desc: 'Leyes y novedades en 1 página o 10 líneas' },
  { icon: Library, label: 'Consultá', desc: 'Biblioteca UPM con fuentes verificables' },
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
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  // Timestamp del último submit · para prevenir double-click rapidísimo
  const lastSubmitRef = useRef<number>(0)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  // Prefill desde sessionStorage · setea el input con una pregunta sugerida
  // cuando el usuario viene de "Asistente" en un artículo de Leyes.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('upm.asistente.prefill')
      if (!raw) return
      sessionStorage.removeItem('upm.asistente.prefill')
      const prefill = JSON.parse(raw) as { suggestedQuestion?: string }
      if (prefill?.suggestedQuestion) setInput(prefill.suggestedQuestion)
    } catch {
      // ignore
    }
  }, [])

  // RAG real sobre el corpus en vivo via TF-IDF + coseno (lib/rag.ts).
  // Si la query no matchea ninguna norma con score >= 0.04, hace fallback al
  // motor de patrones legacy (lib/respond.ts) para no dejar al usuario sin nada.
  const send = async (text?: string) => {
    const value = (text ?? input).trim()
    if (!value || thinking) return
    // Rate-limit · prevenir double-click (< 500ms entre submits)
    const now = Date.now()
    if (now - lastSubmitRef.current < 500) return
    lastSubmitRef.current = now
    setMessages(prev => [...prev, userMessage(value)])
    setInput('')
    setThinking(true)
    try {
      const reply = await generateRAGAnswer(value)
      // Si el RAG retorna 0 sources (sin coincidencias), caer al pattern matcher
      const finalReply = reply.sources && reply.sources.length > 0
        ? reply
        : generateAssistantResponse(value)
      setMessages(prev => [...prev, finalReply])
    } catch {
      const fallback = generateAssistantResponse(value)
      setMessages(prev => [...prev, fallback])
    }
    setThinking(false)
  }

  const regenerate = async () => {
    if (thinking) return
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUser) return
    setThinking(true)
    try {
      const reply = await generateRAGAnswer(lastUser.content)
      const finalReply = reply.sources && reply.sources.length > 0
        ? reply
        : generateAssistantResponse(lastUser.content)
      setMessages(prev => {
        const idx = [...prev].reverse().findIndex(m => m.role === 'assistant')
        if (idx === -1) return [...prev, finalReply]
        const realIdx = prev.length - 1 - idx
        return [...prev.slice(0, realIdx), finalReply, ...prev.slice(realIdx + 1)]
      })
      store.pushToast('info', 'Respuesta regenerada con corpus actualizado')
    } catch {
      // ignore
    }
    setThinking(false)
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
    () => [...messages].reverse().find(m => m.role === 'assistant' && m.id !== 'init'),
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
    <div className="animate-fade-up mx-auto flex h-full w-full max-w-[860px] flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        eyebrow={<Eyebrow icon={<Sparkles size={11} />}>Asistente AI UPM</Eyebrow>}
        title="Asistente del Legislador"
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setHistoryOpen(v => !v)}>
              <History size={14} /> Historial
              {conversations.length > 0 && <Badge tone="brand">{conversations.length}</Badge>}
            </Button>
            <Button size="sm" variant="secondary" onClick={newConversation}>
              <Plus size={14} /> Nueva
            </Button>
          </>
        }
      />

      {historyOpen && (
        <Card className="animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">Conversaciones recientes</div>
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

      {/* Chat · única columna */}
      <div className="flex min-h-0 flex-1 flex-col rounded-3xl bg-white ring-1 ring-ink-100 shadow-card">
        <div ref={scrollerRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6" style={{ maxHeight: 'calc(100svh - 260px)' }}>
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
            <div className="flex flex-col gap-3">
              {/* Indicador "pensando" enriquecido · skeleton + texto explicativo */}
              <div className="w-full max-w-[92%] rounded-3xl rounded-tl-md bg-upm-50/40 p-4 ring-1 ring-upm-100">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-upm-500"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  Buscando en el corpus
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <div className="skeleton h-3 w-3/4 rounded" />
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-3 w-5/6 rounded" />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="skeleton h-12 rounded-xl" />
                  <div className="skeleton h-12 rounded-xl" />
                </div>
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="border-t border-ink-100 px-4 py-4 sm:px-6">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Qué puedo hacer</div>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {CAPABILITIES.map(c => (
                <div key={c.label} className="flex items-start gap-2.5 rounded-2xl bg-upm-50/40 p-2.5 ring-1 ring-upm-100">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-upm-500 to-upm-700 text-white shadow-cta">
                    <c.icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-bold leading-tight text-ink-900">{c.label}</div>
                    <div className="text-[11px] leading-snug text-ink-500">{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Probá con</div>
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

        {/* Quick actions sobre la última respuesta */}
        {lastAssistant && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-ink-100 px-4 py-2.5 sm:px-6">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500 mr-1">Acciones</span>
            <QuickButton icon={Copy} label="Copiar" onClick={copyLastAssistant} />
            <QuickButton icon={Bookmark} label="Guardar" onClick={saveLastAssistant} />
            <QuickButton
              icon={FileStack}
              label="Brief"
              onClick={() => openCreateBrief({ title: `Brief: ${lastAssistantTitle}`, body: lastAssistantBody })}
            />
            <QuickButton
              icon={ScrollText}
              label="Minuta"
              onClick={() => openCreateMinuta({ title: `Minuta: ${lastAssistantTitle}`, body: lastAssistantBody })}
            />
            <QuickButton icon={Share2} label="Compartir" onClick={() => shareLink(lastAssistantTitle || 'Asistente UPM', '/asistente')} />
            <QuickButton icon={RefreshCw} label="Regenerar" onClick={regenerate} disabled={thinking} />
            <QuickButton icon={Trash2} label="Nueva" onClick={newConversation} tone="danger" />
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
            aria-label="Mensaje para el Asistente AI"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl bg-upm-50/40 px-4 py-3 text-[14.5px] text-ink-900 ring-1 ring-upm-100 placeholder:text-ink-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-upm-400"
          />
          <Button type="submit" size="lg" disabled={!input.trim() || thinking} className="px-4 py-3" aria-label="Enviar mensaje">
            <ArrowUp size={17} />
          </Button>
        </form>
      </div>
    </div>
  )
}

function QuickButton({
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
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ' +
        (tone === 'danger'
          ? 'bg-white text-danger-fg ring-1 ring-danger-bg hover:bg-danger-bg/30'
          : 'bg-white text-upm-800 ring-1 ring-upm-100 hover:bg-upm-50')
      }
    >
      <Icon size={11} />
      {label}
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
              <SourceCard
                key={s.id}
                title={s.title}
                type={s.type}
                status="oficial"
                onClick={() => onOpenSource(s.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
