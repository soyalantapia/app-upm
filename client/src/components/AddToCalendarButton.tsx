import { useState } from 'react'
import { Calendar, Check } from 'lucide-react'
import type { NewsItem } from '@/lib/types'
import { countryByCode } from '@/lib/data'

// AddToCalendarButton · Para eventos convocados (audiencias, sesiones,
// reuniones de comisión), genera un archivo .ics descargable que el
// legislador puede importar a su Google Calendar / Outlook / Apple Cal.
//
// Solo se muestra si el item parece un evento (status contiene
// convocada/agendada/sesión/audiencia o tipoConteudo similar).

function looksLikeEvent(item: NewsItem): boolean {
  const blob = ((item.status ?? '') + ' ' + (item.tipoConteudo ?? '') + ' ' + (item.tipoDocumento ?? '') + ' ' + (item.title ?? '')).toLowerCase()
  return /audi[eê]ncia\s+p[uú]blica|audiencia\s+p[uú]blica|sess[ãa]o|sesi[óo]n|convocad|agendad|reuni[óo]n/i.test(blob)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatIcsDate(d: Date): string {
  // Formato YYYYMMDDTHHmmssZ (UTC)
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) +
    'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function buildIcs(item: NewsItem): string {
  const country = countryByCode(item.country)
  const start = new Date(item.dataPublicacao ?? item.date)
  // Si no hay hora específica, usar las 10:00 AM por default
  if (isNaN(start.getTime())) {
    // Fallback a hoy si la fecha no parsea
    start.setTime(Date.now())
  }
  // Duración default 2h
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const uid = `upm-${item.id}@upm.app`
  const now = formatIcsDate(new Date())
  const title = item.title.length > 200 ? item.title.slice(0, 200) + '…' : item.title
  const description = [
    item.excerpt ?? '',
    '',
    `País: ${country.name}`,
    item.source ? `Fuente: ${item.source}` : '',
    item.sourceUrl ? `URL: ${item.sourceUrl}` : '',
    '',
    'Agregado desde Asistente AI UPM',
  ].filter(Boolean).join('\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Asistente AI UPM//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    item.sourceUrl ? `URL:${escapeIcs(item.sourceUrl)}` : '',
    `CATEGORIES:${escapeIcs(country.name)},MERCOSUR,Legislativo`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}

export function AddToCalendarButton({ item, variant = 'default' }: {
  item: NewsItem
  variant?: 'default' | 'compact'
}) {
  const [done, setDone] = useState(false)

  if (!looksLikeEvent(item)) return null

  const handle = () => {
    const ics = buildIcs(item)
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `upm-${item.id}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 0)
    setDone(true)
    setTimeout(() => setDone(false), 2000)
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handle}
        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 hover:text-upm-700"
        title="Descargar evento .ics para agregar al calendario"
      >
        {done ? <Check size={12} className="text-success-fg" /> : <Calendar size={12} />}
        {done ? 'Descargado' : 'Calendario'}
      </button>
    )
  }

  return (
    <button
      onClick={handle}
      className="group inline-flex items-center gap-1.5 rounded-full bg-success-bg/40 px-3 py-1.5 text-[12px] font-bold text-success-fg ring-1 ring-success/30 shadow-cta transition hover:-translate-y-0.5 hover:bg-success-bg/60"
      title="Descargar evento .ics para Google Calendar / Outlook / Apple Calendar"
    >
      {done ? <Check size={13} /> : <Calendar size={13} />}
      {done ? '✓ Descargado' : 'Agregar a mi calendario'}
    </button>
  )
}
