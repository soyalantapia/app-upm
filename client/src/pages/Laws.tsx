import { useMemo, useState } from 'react'
import { ArrowUp, BookOpen, FileStack, GitCompare, Library, Share2, Sparkles } from 'lucide-react'
import { Badge, Button, Card, Chip, Eyebrow, PageHeader } from '@/components/ui'
import { Markdown } from '@/components/Markdown'
import { DOCUMENTS } from '@/lib/data'
import { generateAssistantResponse } from '@/lib/respond'
import { store } from '@/lib/store'
import type { ChatMessage, Document } from '@/lib/types'

const LAWS = DOCUMENTS.filter(d => ['ley', 'decreto', 'reglamento', 'informe'].includes(d.type))

const ARTICLES = [
  {
    n: 1,
    title: 'Objeto y alcance',
    body:
      'La presente normativa establece el marco regional de protección ambiental, define principios generales y delimita el alcance territorial sobre actividades productivas con impacto ambiental significativo.',
  },
  {
    n: 2,
    title: 'Obligaciones de reporte',
    body:
      'Las autoridades competentes deberán informar periódicamente los indicadores definidos por el Comité Técnico, conforme a la metodología común aprobada por la Secretaría.',
  },
  {
    n: 3,
    title: 'Coordinación institucional',
    body:
      'Se establece un mecanismo de coordinación entre organismos nacionales, provinciales y de zonas fronterizas, con atribuciones específicas en monitoreo, fiscalización y respuesta.',
  },
  {
    n: 4,
    title: 'Plazos de cumplimiento',
    body:
      'Los plazos se computan desde la entrada en vigor del reglamento. Las autoridades dispondrán de hasta 12 meses para la primera adecuación operativa.',
  },
  {
    n: 5,
    title: 'Régimen sancionatorio',
    body:
      'Establece criterios de sanciones progresivas, recursos administrativos y revisión periódica de los procedimientos.',
  },
]

const QUESTIONS = [
  '¿Qué dice sobre obligaciones de reporte?',
  '¿Cuál es el artículo relevante?',
  'Resumen ejecutivo en 1 página',
  'Comparación entre Argentina y Brasil',
  'Preguntas para reunión de comisión',
]

export function LawsPage() {
  const [active, setActive] = useState<Document>(LAWS[0])
  const [highlight, setHighlight] = useState<number | null>(2)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content:
        '**Hablemos del documento**\n\n' +
        'Te respondo con el artículo relevante, citas y opciones para usar la respuesta.',
      isInstitutional: true,
      createdAt: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)

  const ask = (text?: string) => {
    const value = (text ?? input).trim()
    if (!value || thinking) return
    setMessages(prev => [...prev, { id: 'u-' + Date.now(), role: 'user', content: value, createdAt: new Date().toISOString() }])
    setInput('')
    setThinking(true)
    setTimeout(() => {
      const reply = generateAssistantResponse(value)
      setMessages(prev => [...prev, reply])
      setThinking(false)
      setHighlight(2)
    }, 700)
  }

  const lawCounts = useMemo(() => LAWS.length, [])

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        eyebrow={<Eyebrow icon={<BookOpen size={11} />}>Hablar con leyes e informes</Eyebrow>}
        title="Preguntás. Encontrás artículos. Obtenés respuesta lista para usar."
        description="Abrí cualquier ley, decreto, reglamento o informe y conversá con el documento. Los resultados vienen con cita y artículo relevante."
      />

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Lista de documentos */}
        <div className="flex flex-col gap-2">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
            {lawCounts} documentos disponibles
          </div>
          {LAWS.map(d => (
            <button
              key={d.id}
              onClick={() => setActive(d)}
              className={
                'flex flex-col gap-1 rounded-2xl border-2 p-3 text-left transition-all duration-200 ' +
                (active.id === d.id
                  ? 'border-upm-500 bg-upm-50'
                  : 'border-transparent bg-white ring-1 ring-ink-100 hover:border-upm-200')
              }
            >
              <div className="flex items-center gap-1.5">
                <Badge tone="brand">{d.type}</Badge>
                {d.status === 'oficial' && <Badge tone="success">Oficial UPM</Badge>}
                {d.status === 'curado' && <Badge tone="info">Curado</Badge>}
              </div>
              <div className="text-[13px] font-semibold leading-snug text-ink-900">{d.title}</div>
              <div className="text-[11px] text-ink-500 tabular-nums">{d.date}</div>
            </button>
          ))}
        </div>

        {/* Documento + chat */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Documento */}
          <Card className="flex flex-col gap-3">
            <div>
              <Badge tone="brand">{active.type}</Badge>
              <h2 className="mt-2 text-[19px] font-bold leading-snug tracking-tight text-ink-900">
                {active.title}
              </h2>
              <p className="mt-1 text-[12.5px] text-ink-500">{active.excerpt}</p>
            </div>
            <div className="flex flex-col divide-y divide-ink-100 rounded-2xl bg-white ring-1 ring-ink-100">
              {ARTICLES.map(art => (
                <button
                  key={art.n}
                  onClick={() => setHighlight(art.n)}
                  className={
                    'flex flex-col gap-1 p-3.5 text-left transition-colors ' +
                    (highlight === art.n ? 'bg-upm-50/70' : 'hover:bg-upm-50/40')
                  }
                >
                  <div className="flex items-center gap-2">
                    <Badge tone={highlight === art.n ? 'success' : 'neutral'}>Art. {art.n}</Badge>
                    <span className="text-[12.5px] font-bold text-ink-900">{art.title}</span>
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-ink-500">{art.body}</p>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="soft" onClick={() => store.pushToast('success', 'Guardado en dossier')}>
                <FileStack size={13} /> Guardar en dossier
              </Button>
              <Button size="sm" variant="ghost" onClick={() => store.pushToast('success', 'Brief generado')}>
                <Sparkles size={13} /> Crear brief
              </Button>
              <Button size="sm" variant="ghost" onClick={() => store.pushToast('info', 'Comparativa en preparación')}>
                <GitCompare size={13} /> Comparar con otro país
              </Button>
              <Button size="sm" variant="ghost" onClick={() => store.pushToast('info', 'Enlace copiado')}>
                <Share2 size={13} /> Compartir
              </Button>
            </div>
          </Card>

          {/* Chat con doc */}
          <div className="flex min-h-[480px] flex-col rounded-3xl bg-white ring-1 ring-ink-100 shadow-card">
            <div className="border-b border-ink-100 px-4 py-3">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Conversación con el documento</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUESTIONS.map(q => (
                  <Chip key={q} size="sm" onClick={() => ask(q)}>{q}</Chip>
                ))}
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              {messages.map(m =>
                m.role === 'user' ? (
                  <div key={m.id} className="self-end max-w-[85%] rounded-3xl rounded-br-md bg-gradient-to-br from-upm-500 to-upm-700 px-4 py-3 text-[14px] leading-relaxed text-white shadow-cta">
                    {m.content}
                  </div>
                ) : (
                  <div key={m.id} className="rounded-3xl bg-upm-50/40 p-4 ring-1 ring-upm-100">
                    <Badge tone={m.isInstitutional ? 'success' : 'warning'}>
                      {m.isInstitutional ? 'Con fuentes UPM' : 'Respuesta general'}
                    </Badge>
                    <div className="mt-2.5">
                      <Markdown content={m.content} />
                    </div>
                  </div>
                ),
              )}
              {thinking && (
                <div className="inline-flex items-center gap-2 self-start rounded-full bg-upm-50 px-3 py-1.5 text-[12px] font-semibold text-upm-700 ring-1 ring-upm-100">
                  <Library size={12} /> Buscando artículos…
                </div>
              )}
            </div>

            <form
              onSubmit={e => { e.preventDefault(); ask() }}
              className="flex items-end gap-2 border-t border-ink-100 p-3"
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Preguntale al documento (ej: ¿qué dice sobre reportes?)"
                className="flex-1 rounded-2xl bg-upm-50/40 px-4 py-3 text-[14px] ring-1 ring-upm-100 placeholder:text-ink-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-upm-400"
              />
              <Button type="submit" size="md" disabled={!input.trim() || thinking}>
                <ArrowUp size={16} />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
