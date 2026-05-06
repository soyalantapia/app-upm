import { Calendar, CalendarCheck, FileStack, MessageSquareText, Sparkles } from 'lucide-react'
import { Badge, Button, Card, Eyebrow, PageHeader } from '@/components/ui'
import { AGENDA, topicById } from '@/lib/data'
import { store } from '@/lib/store'

const STATUS_TONE = {
  pendiente: 'warning' as const,
  preparado: 'info' as const,
  completado: 'success' as const,
}

export function AgendaPage() {
  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={<Eyebrow icon={<Calendar size={11} />}>Agenda asistida</Eyebrow>}
        title="Cada reunión, preparada con respaldo"
        description="Convertí reuniones, comisiones y eventos en preparación, minuta y seguimiento. El Asistente arma briefs previos automáticamente."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {AGENDA.map((e, i) => {
          const t = topicById(e.topic)
          return (
            <Card key={e.id} interactive style={{ animationDelay: `${i * 60}ms` }} className="animate-fade-up">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5">
                  <Badge tone="brand">{t.shortLabel}</Badge>
                  <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                  <span className="ml-auto text-[11.5px] font-semibold text-ink-500 tabular-nums">{e.date}</span>
                </div>
                <div>
                  <h3 className="text-[16px] font-bold leading-snug tracking-tight text-ink-900">{e.title}</h3>
                  <div className="mt-1 text-[12.5px] text-ink-500">{e.participants}</div>
                  <div className="mt-1 text-[11.5px] text-ink-500">{e.documents} documentos vinculados</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="soft" onClick={() => store.pushToast('success', 'Brief previo generado')}>
                    <Sparkles size={13} /> Preparar reunión
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => store.pushToast('info', 'Documentos abiertos')}>
                    <FileStack size={13} /> Ver documentos
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => store.pushToast('success', 'Preguntas creadas')}>
                    <MessageSquareText size={13} /> Crear preguntas
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => store.pushToast('success', 'Minuta generada')}>
                    <CalendarCheck size={13} /> Generar minuta
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
