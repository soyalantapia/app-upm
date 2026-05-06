import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ClipboardList,
  FileText,
  MessageSquareText,
  Share2,
  Sparkles,
} from 'lucide-react'
import { Drawer } from './Drawer'
import { Badge, Button, Eyebrow } from './ui'
import { Markdown } from './Markdown'
import { store, useStore } from '@/lib/store'
import { shareLink } from '@/lib/share'
import type { Document } from '@/lib/types'

const SAMPLE_ARTICLES = [
  { n: 1, title: 'Objeto y alcance', body: 'Establece el marco regional, define principios generales y delimita el alcance territorial sobre actividades con impacto ambiental significativo.' },
  { n: 2, title: 'Obligaciones de reporte', body: 'Las autoridades competentes deberán informar periódicamente los indicadores definidos por el Comité Técnico.' },
  { n: 3, title: 'Coordinación institucional', body: 'Mecanismo entre organismos nacionales, provinciales y de zonas fronterizas con atribuciones específicas en monitoreo y respuesta.' },
  { n: 4, title: 'Plazos de cumplimiento', body: 'Las autoridades dispondrán de hasta 12 meses para la primera adecuación operativa.' },
]

type Tab = 'resumen' | 'articulos' | 'acciones'

export function DocumentDetailDrawer({
  doc,
  onClose,
  onCreateMinuta,
}: {
  doc: Document | null
  onClose: () => void
  onCreateMinuta: () => void
}) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('resumen')
  const isSaved = useStore(s => doc ? s.saved.some(i => i.ref === doc.id) : false)

  if (!doc) return null

  const toggleSave = () => {
    if (!doc) return
    if (isSaved) {
      const item = store.getSnapshot().saved.find(i => i.ref === doc.id)
      if (item) {
        store.removeSaved(item.id)
        store.pushToast('info', 'Documento eliminado de tu carpeta')
      }
    } else {
      store.saveItem({
        id: 'sav-doc-' + doc.id,
        type: 'documento',
        title: doc.title,
        ref: doc.id,
        meta: { type: doc.type, status: doc.status, date: doc.date },
      })
      store.pushToast('success', 'Documento guardado en tu carpeta')
    }
  }

  return (
    <Drawer
      open={Boolean(doc)}
      onClose={onClose}
      title={doc.title}
      description={
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge tone="brand">{doc.type}</Badge>
          {doc.status === 'oficial' && <Badge tone="success">Oficial UPM</Badge>}
          {doc.status === 'curado' && <Badge tone="info">Curado por UPM</Badge>}
          {doc.status === 'aporte' && <Badge tone="warning">Aporte de foro</Badge>}
          <span className="text-[11px] text-ink-500 tabular-nums">{doc.date}</span>
        </span>
      }
      width="lg"
    >
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-2xl bg-white p-1 ring-1 ring-ink-100 shadow-card">
        {[
          { id: 'resumen' as Tab, label: 'Resumen' },
          { id: 'articulos' as Tab, label: 'Artículos' },
          { id: 'acciones' as Tab, label: 'Acciones' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              'flex-1 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-200 ' +
              (tab === t.id
                ? 'bg-gradient-to-br from-upm-500 to-upm-700 text-white shadow-cta'
                : 'text-ink-700 hover:bg-upm-50 hover:text-upm-800')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {tab === 'resumen' && (
          <>
            <Eyebrow icon={<Sparkles size={11} />}>Resumen ejecutivo</Eyebrow>
            <Markdown
              content={
                `**${doc.title}**\n\n${doc.excerpt}\n\n` +
                '**Puntos clave**\n\n' +
                '- Marco institucional con respaldo regional.\n' +
                '- Obligaciones de reporte y coordinación.\n' +
                '- Aplicable a zonas fronterizas y articulación binacional.\n\n' +
                '**Próximos pasos sugeridos**\n\n' +
                '- Convocar minuta interna.\n' +
                '- Compartir con tu equipo de comisión.\n' +
                '- Hablar con el documento desde el Asistente.'
              }
            />
            <div className="rounded-2xl bg-upm-50/60 p-4 ring-1 ring-upm-100">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">Tema y foro asociado</div>
              <div className="mt-1 text-[13px] text-ink-700">
                Tema: <span className="font-semibold text-ink-900">{doc.topic}</span>
                {doc.forum && (
                  <>
                    {' '}· Foro: <span className="font-semibold text-ink-900">{doc.forum}</span>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {tab === 'articulos' && (
          <div className="flex flex-col gap-2.5">
            {SAMPLE_ARTICLES.map(a => (
              <div key={a.n} className="rounded-2xl bg-white p-4 ring-1 ring-ink-100 shadow-card">
                <div className="flex items-center gap-2">
                  <Badge tone="brand">Art. {a.n}</Badge>
                  <span className="text-[13px] font-bold text-ink-900">{a.title}</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-700">{a.body}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'acciones' && (
          <div className="flex flex-col gap-2.5">
            <ActionRow
              icon={isSaved ? BookmarkCheck : Bookmark}
              label={isSaved ? 'Quitar de mi carpeta' : 'Guardar en mi carpeta'}
              tone={isSaved ? 'success' : 'brand'}
              onClick={toggleSave}
            />
            <ActionRow
              icon={MessageSquareText}
              label="Hablar con el documento"
              tone="brand"
              onClick={() => {
                onClose()
                navigate('/leyes')
              }}
            />
            <ActionRow
              icon={ClipboardList}
              label="Crear minuta a partir del documento"
              tone="brand"
              onClick={() => {
                onClose()
                onCreateMinuta()
              }}
            />
            <ActionRow
              icon={Share2}
              label="Compartir enlace"
              tone="info"
              onClick={() => shareLink(doc.title, `/leyes`)}
            />
            <ActionRow
              icon={BookOpen}
              label="Pedir explicación al Asistente"
              tone="info"
              onClick={() => {
                onClose()
                navigate('/asistente')
              }}
            />
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11.5px] text-ink-500">
          <FileText size={13} />
          {isSaved ? 'Guardado en tu carpeta' : 'No guardado todavía'}
        </div>
        <Button size="sm" onClick={toggleSave} variant={isSaved ? 'secondary' : 'primary'}>
          {isSaved ? <><BookmarkCheck size={13} /> Guardado</> : <><Bookmark size={13} /> Guardar</>}
        </Button>
      </div>
    </Drawer>
  )
}

function ActionRow({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: typeof Bookmark
  label: string
  onClick: () => void
  tone: 'brand' | 'info' | 'success'
}) {
  const toneCls =
    tone === 'success' ? 'bg-success-bg text-success-fg' : tone === 'info' ? 'bg-info-bg text-info-fg' : 'bg-upm-50 text-upm-700'
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-ink-100 shadow-card transition hover:-translate-y-0.5 hover:ring-upm-100"
    >
      <span className="flex items-center gap-3 text-[13.5px] font-semibold text-ink-900">
        <span className={`grid h-8 w-8 place-items-center rounded-xl ${toneCls}`}>
          <Icon size={15} />
        </span>
        {label}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-300">→</span>
    </button>
  )
}
