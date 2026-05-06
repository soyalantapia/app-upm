import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bookmark,
  Download,
  Edit3,
  FileStack,
  FilePlus2,
  RefreshCw,
  Share2,
  Sparkles,
} from 'lucide-react'
import { Badge, Button, Card, Eyebrow } from '@/components/ui'
import { Markdown } from '@/components/Markdown'
import { SourceCard } from '@/components/SourceCard'
import { DOCUMENTS, DOSSIERS, topicById } from '@/lib/data'
import { store } from '@/lib/store'

export function DossierPage() {
  const { id } = useParams()
  const dossier = DOSSIERS.find(d => d.id === id) ?? DOSSIERS[0]
  const topic = topicById(dossier.topic)
  const docs = dossier.documents
    .map(id => DOCUMENTS.find(d => d.id === id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d))

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between">
        <Link to="/dossiers" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-upm-700 hover:text-upm-800">
          <ArrowLeft size={14} /> Volver a Dossiers
        </Link>
        <Eyebrow icon={<FileStack size={11} />}>Dossier ejecutivo</Eyebrow>
      </div>

      {/* Cabecera */}
      <Card className="bg-gradient-to-br from-upm-50 to-white ring-upm-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="brand">{topic.shortLabel}</Badge>
              <Badge tone="success">Activo</Badge>
              <Badge tone="info">Actualizado {dossier.updatedAt}</Badge>
            </div>
            <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-ink-900 sm:text-[30px]">
              {dossier.title}
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-500">{dossier.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => store.pushToast('success', 'Dossier exportado a PDF')}>
              <Download size={13} /> Exportar PDF
            </Button>
            <Button size="sm" variant="secondary" onClick={() => store.pushToast('info', 'Enlace copiado')}>
              <Share2 size={13} /> Compartir
            </Button>
            <Button size="sm" variant="ghost" onClick={() => store.pushToast('success', 'Guardado en carpeta')}>
              <Bookmark size={13} /> Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => store.pushToast('info', 'Editor abierto')}>
              <Edit3 size={13} /> Editar título
            </Button>
            <Button size="sm" variant="ghost" onClick={() => store.pushToast('success', 'Documento agregado')}>
              <FilePlus2 size={13} /> Agregar documento
            </Button>
            <Button size="sm" variant="soft" onClick={() => store.pushToast('success', 'Asistente actualizando dossier')}>
              <RefreshCw size={13} /> Pedir actualización
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Secciones */}
        <div className="flex flex-col gap-3">
          {dossier.sections.map((s, i) => (
            <Card key={s.title} style={{ animationDelay: `${i * 60}ms` }} className="animate-fade-up">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-upm-100 text-[12px] font-bold text-upm-800">{i + 1}</span>
                <h3 className="text-[15.5px] font-bold tracking-tight text-ink-900">{s.title}</h3>
              </div>
              <div className="mt-2.5">
                <Markdown content={s.body} />
              </div>
            </Card>
          ))}
        </div>

        {/* Lateral */}
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
              <Sparkles size={12} /> Documentos UPM vinculados
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {docs.map(d => (
                <SourceCard key={d.id} title={d.title} type={d.type} status={d.status} date={d.date} />
              ))}
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-upm-50 to-white ring-upm-100">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">Tip institucional</div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-700">
              Cada dossier UPM combina <span className="font-bold">memoria institucional</span>, normativa relevante y novedades. Reutilizable en próximas reuniones.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
