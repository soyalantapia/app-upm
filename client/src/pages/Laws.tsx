import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  MessageSquareText,
  ScrollText,
  Share2,
} from 'lucide-react'
import { Badge, Eyebrow, PageHeader } from '@/components/ui'
import { DOCUMENTS } from '@/lib/data'
import { store, useStore } from '@/lib/store'
import { shareLink } from '@/lib/share'
import type { Document } from '@/lib/types'

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

export function LawsPage() {
  const navigate = useNavigate()
  const [active, setActive] = useState<Document>(LAWS[0])
  const isSaved = useStore(s => s.saved.some(i => i.ref === active.id))

  const handleSave = () => {
    if (isSaved) {
      const item = store.getSnapshot().saved.find(i => i.ref === active.id)
      if (item) {
        store.removeSaved(item.id)
        store.pushToast('info', 'Documento eliminado de tu carpeta')
      }
    } else {
      store.saveItem({
        id: 'sav-doc-' + active.id,
        type: 'documento',
        title: active.title,
        ref: active.id,
        meta: { type: active.type, status: active.status, date: active.date },
      })
      store.pushToast('success', 'Documento guardado en tu carpeta')
    }
  }

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        eyebrow={<Eyebrow icon={<BookOpen size={11} />}>Hablar con leyes e informes</Eyebrow>}
        title="Abrí un documento y conversá con él"
        description="Seleccioná una norma o informe y obtené un resumen, los artículos clave y la opción de hablar con el Asistente."
      />

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Lista de documentos */}
        <div className="flex flex-col gap-2">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
            {LAWS.length} documentos disponibles
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

        {/* Documento + único CTA */}
        <div className="flex flex-col gap-4">
          <article className="flex flex-col gap-4 rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="brand">{active.type}</Badge>
                  {active.status === 'oficial' && <Badge tone="success">Oficial UPM</Badge>}
                  {active.status === 'curado' && <Badge tone="info">Curado</Badge>}
                  <span className="text-[11.5px] font-semibold text-ink-500 tabular-nums">{active.date}</span>
                </div>
                <h2 className="mt-2 text-[22px] font-bold leading-tight tracking-tight text-ink-900 sm:text-[26px]">
                  {active.title}
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-700">{active.excerpt}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSave}
                className={
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ' +
                  (isSaved
                    ? 'bg-success-bg text-success-fg ring-1 ring-success-bg hover:bg-success-bg/80'
                    : 'bg-white text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 hover:text-upm-700')
                }
              >
                {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                {isSaved ? 'Guardado en mi carpeta' : 'Guardar en mi carpeta'}
              </button>
              <button
                onClick={() => shareLink(active.title, '/leyes')}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 hover:text-upm-700"
              >
                <Share2 size={13} /> Compartir
              </button>
              <button
                onClick={() => store.pushToast('info', 'Apertura de fuente externa simulada')}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 hover:text-upm-700"
              >
                <ExternalLink size={13} /> Ver fuente
              </button>
            </div>

            <div className="flex flex-col gap-2.5 rounded-2xl bg-bg p-4 ring-1 ring-ink-100" style={{ backgroundColor: '#f6f8fb' }}>
              <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
                <ScrollText size={12} /> Articulado clave
              </div>
              <div className="flex flex-col gap-2">
                {ARTICLES.map(a => (
                  <div key={a.n} className="rounded-xl bg-white p-3.5 ring-1 ring-ink-100">
                    <div className="flex items-center gap-2">
                      <Badge tone="brand">Art. {a.n}</Badge>
                      <span className="text-[12.5px] font-bold text-ink-900">{a.title}</span>
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-700">{a.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* Único CTA */}
          <button
            onClick={() => {
              store.pushToast('info', 'El Asistente preparó preguntas sobre este documento')
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
                <div className="mt-0.5 text-[18px] font-bold tracking-tight">Hablar con el Asistente AI sobre este documento</div>
                <div className="mt-1 text-[12.5px] text-white/80">
                  Te respondo sobre artículos, comparo con normativa similar y armo brief.
                </div>
              </div>
            </div>
            <span className="text-[20px] transition group-hover:translate-x-1">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}
