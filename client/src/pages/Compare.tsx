import { Check, GitCompare, ShieldX, ShieldCheck } from 'lucide-react'
import { Eyebrow, PageHeader } from '@/components/ui'

const GENERIC = [
  'Entorno abierto',
  'Información fuera del ámbito institucional',
  'Sin biblioteca UPM integrada',
  'Sin radar normativo',
  'Sin memoria institucional',
  'Sin carpetas ni dossiers UPM',
  'Ayuda puntual, pero no estructura el trabajo',
]

const UPM = [
  'Ecosistema cerrado UPM',
  'Información contenida y controlada por la institución',
  'Fuentes UPM y normativa con respaldo',
  'Radar normativo y alertas',
  'Biblioteca, dossiers y minutas',
  'Memoria institucional reutilizable',
  'Convierte temas en briefs listos para decidir',
]

export function ComparePage() {
  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={<Eyebrow icon={<GitCompare size={11} />}>Comparativa</Eyebrow>}
        title="Por qué no es lo mismo que usar ChatGPT"
        description="UPM no obtiene respuestas simples: obtiene un ecosistema cerrado, respaldo y continuidad."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Genérico */}
        <div className="flex flex-col gap-3 rounded-3xl bg-white p-6 ring-1 ring-ink-100 shadow-card">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-ink-50 text-ink-500">
              <ShieldX size={18} />
            </div>
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Chat genérico</div>
              <div className="text-[16px] font-bold tracking-tight text-ink-900">Ayuda puntual</div>
            </div>
          </div>
          <ul className="flex flex-col gap-2.5">
            {GENERIC.map(item => (
              <li key={item} className="flex items-start gap-2 text-[13.5px] text-ink-700">
                <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-400">×</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* UPM */}
        <div className="relative flex flex-col gap-3 overflow-hidden rounded-3xl bg-gradient-to-br from-upm-700 via-upm-800 to-upm-900 p-6 text-white shadow-floating ring-1 ring-white/10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-upm-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-upm-400/20 blur-3xl" />
          <div className="relative flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/30">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-200">Asistente AI UPM</div>
              <div className="text-[16px] font-bold tracking-tight">Infraestructura institucional</div>
            </div>
          </div>
          <ul className="relative flex flex-col gap-2.5">
            {UPM.map(item => (
              <li key={item} className="flex items-start gap-2 text-[14px]">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-upm-200 text-upm-800">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="text-white/95">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Cierre */}
      <div className="rounded-3xl bg-upm-50 p-6 ring-1 ring-upm-100 sm:p-8">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-upm-700">Cierre</div>
        <h2 className="mt-2 text-[24px] font-bold leading-tight tracking-tight text-ink-900 sm:text-[28px]">
          No es un chat. Es <span className="text-upm-700">infraestructura institucional para legislar con respaldo.</span>
        </h2>
      </div>
    </div>
  )
}
