import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { topicById, countryByCode } from '@/lib/data'
import type { NewsItem, Preferences } from '@/lib/types'

// Panel "¿Por qué importa?" · aparece en la vista de detalle de una norma.
// Genera automáticamente 2-3 bullets explicando la relevancia para el
// usuario según sus preferencias (países y temas).
//
// Lógica puramente local · sin llamada a AI, sin backend.
// Usa heurísticas sobre el contenido del ítem y las prefs del usuario.

type Bullet = { text: string; strong: string }

function buildBullets(item: NewsItem, prefs: Preferences | null): Bullet[] {
  const bullets: Bullet[] = []
  const text = (item.title + ' ' + (item.excerpt ?? '') + ' ' + (item.fullText ?? '')).toLowerCase()
  const country = countryByCode(item.country)
  const topic = topicById(item.topic)

  // Bullet 1 · Relevancia temática
  const userTopics = prefs?.topics ?? []
  const topicMatch = userTopics.includes(item.topic)
  if (topicMatch) {
    bullets.push({
      strong: `Prioridad alta:`,
      text: `Este ítem pertenece a "${topic.label}", uno de tus temas prioritarios.`,
    })
  } else {
    bullets.push({
      strong: `Tema:`,
      text: `${topic.label} · ${country.flag} ${country.name}`,
    })
  }

  // Bullet 2 · Corredor bioceánico
  if (/bioce[aá]nico|corredor|paranacuê|puente/i.test(text)) {
    bullets.push({
      strong: 'Infraestructura regional:',
      text: 'Menciona el corredor bioceánico o infraestructura de integración física del MERCOSUR.',
    })
  }
  // Bullet 2 (alt) · ITAIPU / energía
  else if (/itaipu|yacyret[aá]|royalt/i.test(text)) {
    bullets.push({
      strong: 'Energía binacional:',
      text: 'Involucra a ITAIPU o YACYRETÁ — las mayores hidroeléctricas del mundo, propiedad binacional.',
    })
  }
  // Bullet 2 (alt) · Mercosur
  else if (/mercosur|mercosul|cmc|gmc|parlasur/i.test(text)) {
    bullets.push({
      strong: 'Bloque regional:',
      text: 'Afecta directamente a instituciones o decisiones del MERCOSUR como bloque.',
    })
  }
  // Bullet 2 (alt) · Género
  else if (/g[eé]nero|paridad|violencia|mujer/i.test(text)) {
    bullets.push({
      strong: 'Agenda de género:',
      text: 'Contiene disposiciones sobre igualdad de género, paridad o violencia basada en género.',
    })
  }
  // Bullet 2 (alt) · Ambiente / Pantanal / Río Uruguay
  else if (/pantanal|cuenca|ambient|deforest|escaz[uú]/i.test(text)) {
    bullets.push({
      strong: 'Medio ambiente:',
      text: 'Incluye compromisos ambientales con potencial impacto en la cuenca regional.',
    })
  }
  // Bullet 2 (alt) · Presupuesto
  else if (/presupuest|millones|mmd|usd|fondo/i.test(text)) {
    bullets.push({
      strong: 'Impacto fiscal:',
      text: 'Modifica partidas presupuestarias o crea fondos con implicancias para el erario público.',
    })
  }

  // Bullet 3 · Urgencia y relevancia
  if (item.relevance === 'alta') {
    bullets.push({
      strong: 'Urgente:',
      text: 'Clasificada como alta relevancia por el sistema. Se recomienda revisar antes de la próxima sesión.',
    })
  } else if ((item.tramitaciones?.length ?? 0) > 0) {
    bullets.push({
      strong: 'En trámite:',
      text: `Tiene ${item.tramitaciones!.length} etapa${item.tramitaciones!.length > 1 ? 's' : ''} de tramitación registradas. Estado actual: ${item.status ?? 'en proceso'}.`,
    })
  } else if (item.country !== 'AR' && (prefs?.countries ?? []).includes('AR')) {
    bullets.push({
      strong: 'Perspectiva comparada:',
      text: `Esta norma de ${country.name} puede servir como referencia para legislación equivalente en Argentina.`,
    })
  } else {
    bullets.push({
      strong: 'Fuente oficial:',
      text: `Publicada por ${item.source.split('·')[0].trim()}.`,
    })
  }

  return bullets.slice(0, 3)
}

// Versión 1-línea para mostrar inline en cards del Radar/Leyes.
// Devuelve la frase más impactante + tono semántico para color.
export type RelevanceHint = {
  text: string
  tone: 'priority' | 'urgent' | 'comparative' | 'cross' | 'fiscal' | 'neutral'
}
export function buildRelevanceHint(item: NewsItem, prefs: Preferences | null): RelevanceHint | null {
  const text = (item.title + ' ' + (item.excerpt ?? '') + ' ' + (item.fullText ?? '')).toLowerCase()
  const country = countryByCode(item.country)
  const topic = topicById(item.topic)
  const userTopics = prefs?.topics ?? []

  // Prioridad 1 · Tu tema + alta relevancia (lo más fuerte)
  if (userTopics.includes(item.topic) && item.relevance === 'alta') {
    return { text: `Tu tema "${topic.shortLabel}" · alta relevancia`, tone: 'urgent' }
  }
  // Prioridad 2 · Alta relevancia general
  if (item.relevance === 'alta') {
    return { text: `Alta relevancia · revisar antes de comisión`, tone: 'urgent' }
  }
  // Prioridad 3 · Energía binacional ITAIPU
  if (/itaipu|yacyret[aá]|royalt/i.test(text)) {
    return { text: `ITAIPU/YACYRETÁ · energía binacional`, tone: 'cross' }
  }
  // Prioridad 4 · Corredor bioceánico
  if (/bioce[aá]nico|corredor/i.test(text)) {
    return { text: `Corredor bioceánico · infraestructura regional`, tone: 'cross' }
  }
  // Prioridad 5 · Tema prioritario del usuario
  if (userTopics.includes(item.topic)) {
    return { text: `Tu tema prioritario: ${topic.shortLabel}`, tone: 'priority' }
  }
  // Prioridad 6 · MERCOSUR institucional
  if (/mercosur|mercosul|parlasur/i.test(text)) {
    return { text: `Afecta al bloque MERCOSUR`, tone: 'cross' }
  }
  // Prioridad 7 · Impacto fiscal
  if (/presupuest|millones|fondo\s+(nacional|federal)/i.test(text)) {
    return { text: `Modifica partidas presupuestarias`, tone: 'fiscal' }
  }
  // Prioridad 8 · Cross-país: norma de otro país que sirve de referencia
  if (item.country !== 'AR' && (prefs?.countries ?? []).includes('AR')) {
    return { text: `Norma de ${country.name} · referencia comparada`, tone: 'comparative' }
  }
  // Default: no mostrar (es ruido)
  return null
}

export function RelevanciaPanel({ item, prefs }: { item: NewsItem; prefs: Preferences | null }) {
  const bullets = useMemo(() => buildBullets(item, prefs), [item, prefs])

  return (
    <div className="rounded-3xl bg-gradient-to-br from-upm-50/60 to-white p-4 ring-1 ring-upm-100">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
        <Sparkles size={11} /> ¿Por qué importa?
      </div>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink-700 leading-snug">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-upm-400" />
            <span>
              <span className="font-bold text-ink-900">{b.strong}</span>{' '}
              {b.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
