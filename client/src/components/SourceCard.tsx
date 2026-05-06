import { FileText, ArrowUpRight } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { DocType } from '@/lib/types'

const TYPE_LABEL: Record<DocType, string> = {
  ley: 'Ley',
  decreto: 'Decreto',
  reglamento: 'Reglamento',
  informe: 'Informe',
  acta: 'Acta',
  convenio: 'Convenio',
  comunicado: 'Comunicado',
  minuta: 'Minuta',
  dossier: 'Dossier',
}

export function SourceCard({
  title,
  type,
  date,
  status,
  onClick,
}: {
  title: string
  type: DocType
  date?: string
  status?: 'oficial' | 'curado' | 'aporte'
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-2xl bg-white p-3.5 text-left ring-1 ring-ink-100 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover hover:ring-upm-100"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-upm-50 text-upm-700">
        <FileText size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="brand">{TYPE_LABEL[type]}</Badge>
          {status === 'oficial' && <Badge tone="success">Oficial UPM</Badge>}
          {status === 'curado' && <Badge tone="info">Curado por UPM</Badge>}
          {status === 'aporte' && <Badge tone="warning">Aporte de foro</Badge>}
        </div>
        <h4 className="mt-1.5 text-[13.5px] font-semibold leading-snug text-ink-900 line-clamp-2">{title}</h4>
        {date && <div className="mt-1 text-[11px] text-ink-500 tabular-nums">{date}</div>}
      </div>
      <ArrowUpRight
        size={15}
        className="mt-1 shrink-0 text-ink-300 transition-colors group-hover:text-upm-600"
      />
    </button>
  )
}
