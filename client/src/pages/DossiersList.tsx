import { Link } from 'react-router-dom'
import { ArrowRight, FileStack, Plus } from 'lucide-react'
import { Badge, Button, Card, Eyebrow, PageHeader } from '@/components/ui'
import { DOSSIERS, topicById } from '@/lib/data'
import { store } from '@/lib/store'

export function DossiersListPage() {
  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={<Eyebrow icon={<FileStack size={11} />}>Dossiers por tema</Eyebrow>}
        title="Paquetes ejecutivos listos para reunión"
        description="Resumen, normativa, novedades y documentos UPM organizados por tema. Editables, exportables y reutilizables."
        actions={
          <Button size="md" onClick={() => store.pushToast('success', 'Dossier en preparación')}>
            <Plus size={15} /> Crear dossier
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {DOSSIERS.map((d, i) => {
          const t = topicById(d.topic)
          return (
            <Link key={d.id} to={`/dossiers/${d.id}`} className="block">
              <Card interactive style={{ animationDelay: `${i * 60}ms` }} className="animate-fade-up">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-1.5">
                    <Badge tone="brand">{t.shortLabel}</Badge>
                    <Badge tone="success">Activo</Badge>
                    <span className="ml-auto text-[11px] font-semibold text-ink-500 tabular-nums">Act. {d.updatedAt}</span>
                  </div>
                  <div>
                    <h3 className="text-[18px] font-bold leading-snug tracking-tight text-ink-900">{d.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500 line-clamp-3">{d.summary}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-ink-500">
                      <span>{d.sections.length} secciones</span>
                      <span>· {d.documents.length} documentos</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-upm-700">
                      Abrir dossier <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
