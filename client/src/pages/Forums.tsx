import { ArrowUpRight, FileStack, MessageSquareText, Users } from 'lucide-react'
import { Badge, Card, Eyebrow, PageHeader } from '@/components/ui'
import { FORUMS, topicById } from '@/lib/data'

const ROLE_BADGES = ['Coordinador', 'Miembro', 'Invitado', 'Secretaría UPM']

export function ForumsPage() {
  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={<Eyebrow icon={<Users size={11} />}>Foros UPM</Eyebrow>}
        title="Espacios de trabajo por tema"
        description="Agenda, documentos, minutas y acuerdos por foro. Continuidad institucional para cada eje regional."
      />

      <div className="rounded-2xl bg-upm-50/60 p-3 ring-1 ring-upm-100">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">Roles activos</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {ROLE_BADGES.map(r => <Badge key={r} tone="brand">{r}</Badge>)}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FORUMS.map((f, i) => {
          const t = topicById(f.topic)
          return (
            <Card key={f.id} interactive style={{ animationDelay: `${i * 50}ms` }} className="animate-fade-up">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-upm-50 text-upm-700">
                  <Users size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="brand">{t.shortLabel}</Badge>
                    <Badge tone="info">{f.members} miembros</Badge>
                  </div>
                  <h3 className="mt-2 text-[16px] font-bold leading-snug text-ink-900">{f.title}</h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{f.description}</p>
                  <div className="mt-2.5 flex flex-wrap gap-3 text-[11.5px] text-ink-500">
                    <span className="inline-flex items-center gap-1"><FileStack size={12} /> {f.documents} docs</span>
                    <span className="inline-flex items-center gap-1"><MessageSquareText size={12} /> Próximo {f.upcoming}</span>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-upm-600" />
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
