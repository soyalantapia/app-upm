import { useMemo } from 'react'
import { Activity, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import type { NewsItem } from '@/lib/types'

// Visualización del flujo de tramitación de un proyecto legislativo.
// Si el item tiene `tramitaciones`, las renderizamos como pipeline horizontal con
// nodos y conectores. Si no hay tramitaciones, mostramos un estado plano basado
// en `status` + heurística por país.

type Step = {
  label: string
  state: 'done' | 'current' | 'pending' | 'failed'
  date?: string
  detail?: string
  organo?: string
}

export function TramitacionFlow({ item }: { item: NewsItem }) {
  const steps = useMemo(() => computeSteps(item), [item])

  if (steps.length === 0) return null

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <Activity size={11} /> Flujo de tramitación
        </div>
        <span className="text-[10.5px] text-ink-500">{steps.filter(s => s.state === 'done').length}/{steps.length} pasos completados</span>
      </div>

      {/* Vista horizontal · stepper */}
      <div className="mt-4 overflow-x-auto">
        <div className="flex min-w-[600px] items-stretch">
          {steps.map((s, idx) => (
            <div key={`step-${idx}`} className="flex flex-1 items-center">
              <StepNode step={s} index={idx} total={steps.length} />
              {idx < steps.length - 1 && (
                <div className="flex flex-1 items-center px-1">
                  <div className={
                    'h-0.5 flex-1 ' + (
                      s.state === 'done' ? 'bg-success-fg' : 'bg-ink-200'
                    )
                  } />
                  <ArrowRight size={10} className="text-ink-300" />
                  <div className={
                    'h-0.5 flex-1 ' + (
                      steps[idx + 1].state === 'done' ? 'bg-success-fg' : 'bg-ink-200'
                    )
                  } />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lista detallada si hay tramitaciones específicas */}
      {item.tramitaciones && item.tramitaciones.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 border-t border-ink-100 pt-3">
          <li className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">Movimientos registrados</li>
          {item.tramitaciones.slice(0, 8).map((t, i) => (
            <li key={`tram-${i}`} className="flex items-start gap-2 text-[11.5px]">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-upm-500" />
              <div className="flex-1">
                {t.fecha && <span className="text-[10px] font-bold tabular-nums text-ink-500">{formatDateTime(t.fecha)} · </span>}
                {t.organo && <span className="rounded-md bg-ink-50 px-1.5 py-0.5 text-[9.5px] font-bold text-ink-700 ring-1 ring-ink-100">{t.organo}</span>}
                <p className="text-[11.5px] text-ink-700 line-clamp-2">{t.descripcion}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StepNode({ step }: { step: Step; index: number; total: number }) {
  const iconColor =
    step.state === 'done' ? 'bg-success-fg text-white' :
    step.state === 'current' ? 'bg-upm-700 text-white animate-pulse-soft' :
    step.state === 'failed' ? 'bg-danger-fg text-white' :
    'bg-ink-100 text-ink-500'

  const Icon = step.state === 'done' ? CheckCircle2 : step.state === 'current' ? Clock : step.state === 'failed' ? AlertCircle : Activity

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`grid h-9 w-9 place-items-center rounded-full ring-2 ring-white shadow-card ${iconColor}`}>
        <Icon size={14} />
      </div>
      <div className="max-w-[110px] text-center">
        <p className={'text-[10.5px] font-bold leading-tight ' + (step.state === 'pending' ? 'text-ink-400' : 'text-ink-900')}>
          {step.label}
        </p>
        {step.detail && (
          <p className="mt-0.5 text-[9.5px] text-ink-500 line-clamp-2">{step.detail}</p>
        )}
      </div>
    </div>
  )
}

// Heurística para construir el flujo:
// 1) Si el item tiene tramitaciones, usar las últimas como pasos
// 2) Si no, generar pasos genéricos por país basados en el status
function computeSteps(item: NewsItem): Step[] {
  // Caso 1: tramitaciones explícitas (Camara BR + UY enriquecidos)
  if (item.tramitaciones && item.tramitaciones.length > 0) {
    return item.tramitaciones.slice(0, 5).map((t, i) => ({
      label: t.organo ?? `Paso ${i + 1}`,
      state: i < item.tramitaciones!.length - 1 ? 'done' : 'current',
      date: t.fecha,
      detail: t.descripcion?.slice(0, 50),
      organo: t.organo,
    })) as Step[]
  }

  // Caso 2: status text del proyecto
  const status = (item.status ?? '').toLowerCase()
  const country = item.country

  // Argentina · proyectos del HCDN o Senado
  if (country === 'AR' && (item.id.startsWith('ar-senado-') || item.id.startsWith('ar-hcdn-'))) {
    const sanctioned = /sancion|promulgad|vigente/.test(status)
    const inComision = /comisi[óo]n/.test(status)
    const dictamen = /dictamen/.test(status)
    const archivado = /archiv|caducad/.test(status)
    return [
      { label: 'Presentación', state: 'done' },
      { label: 'Comisión', state: inComision ? 'current' : (sanctioned || dictamen ? 'done' : 'pending') },
      { label: 'Dictamen', state: dictamen ? 'done' : (sanctioned ? 'done' : (inComision ? 'pending' : 'pending')) },
      { label: 'Recinto', state: sanctioned ? 'done' : 'pending' },
      { label: 'Sanción', state: sanctioned ? 'done' : (archivado ? 'failed' : 'pending') },
    ]
  }

  // Brasil · proyectos del Câmara o Senado
  if (country === 'BR' && (item.id.startsWith('br-camara-') || item.id.startsWith('br-senado-'))) {
    const aprovada = /aprovad|sancionad/.test(status)
    const tramitando = /em tramita|comissão|análise/.test(status)
    const arquivada = /arquivad|prejudicad/.test(status)
    return [
      { label: 'Apresentação', state: 'done' },
      { label: 'Comissão', state: tramitando ? 'current' : (aprovada ? 'done' : 'pending') },
      { label: 'Plenário', state: aprovada ? 'done' : 'pending' },
      { label: 'Sanção', state: aprovada ? 'done' : (arquivada ? 'failed' : 'pending') },
    ]
  }

  // Uruguay · proyectos del Parlamento
  if (country === 'UY' && item.id.startsWith('uy-')) {
    const promulgada = /promulgad|sancion|vigente/.test(status)
    return [
      { label: 'Carpeta', state: 'done' },
      { label: 'Comisión', state: promulgada ? 'done' : 'current' },
      { label: 'Cámara', state: promulgada ? 'done' : 'pending' },
      { label: 'Promulgación', state: promulgada ? 'done' : 'pending' },
    ]
  }

  // Decretos / resoluciones / fallos · son ejecutivos, no legislativos
  if (item.type === 'decreto' || item.type === 'reglamento') {
    return [
      { label: 'Elaboración', state: 'done' },
      { label: 'Firma', state: 'done' },
      { label: 'Publicación', state: 'done', detail: item.status ?? 'Vigente' },
    ]
  }

  return []
}
