import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/cn'
import { countryByCode } from '@/lib/data'
import { cleanTitle } from '@/lib/pt-es'
import type { NewsItem } from '@/lib/types'

type MercosurEvent = {
  id: string
  date: string          // YYYY-MM-DD
  title: string
  type: 'cumbre' | 'reunion' | 'sesion' | 'plazo' | 'foro' | 'audiencia' | 'votacion'
  countries?: string[]  // flags
  description: string
  link?: string         // path interno (ej: /radar/[id]) o URL externa
  itemId?: string       // id del feed item para navegar al detalle
}

// Agenda institucional del MERCOSUR y organismos asociados.
// Actualizable por los editores de UPM.
// Agenda institucional vacía en producción: solo se muestran eventos REALES
// derivados del feed (convocatorias/audiencias/sesiones agendadas).
const AGENDA: MercosurEvent[] = []

const TYPE_META: Record<MercosurEvent['type'], { label: string; color: string }> = {
  cumbre: { label: 'Cumbre', color: 'bg-upm-600 text-white' },
  reunion: { label: 'Reunión', color: 'bg-upm-50 text-upm-700 ring-1 ring-upm-200' },
  sesion: { label: 'Sesión', color: 'bg-warning-bg text-warning-dark ring-1 ring-warning/30' },
  plazo: { label: 'Plazo', color: 'bg-danger-bg text-danger ring-1 ring-danger/30' },
  foro: { label: 'Foro', color: 'bg-ink-50 text-ink-600 ring-1 ring-ink-200' },
  audiencia: { label: 'Audiencia', color: 'bg-info-bg text-info-fg ring-1 ring-info/30' },
  votacion: { label: 'Votación', color: 'bg-success-bg text-success-fg ring-1 ring-success/30' },
}

// Detecta eventos automáticos del feed (convocatorias reales de comisión,
// audiencias, sesiones, votaciones agendadas). Filtra los que tengan
// fecha futura y un status que indique evento programado.
function extractFeedEvents(items: NewsItem[] | undefined, todayMs: number, horizonDays = 90): MercosurEvent[] {
  if (!items?.length) return []
  const horizonMs = todayMs + horizonDays * 24 * 60 * 60 * 1000

  const events: MercosurEvent[] = []
  for (const item of items) {
    // Fecha del evento · prioriza dataPublicacao (puede ser fecha futura de convocatoria)
    const dateStr = item.dataPublicacao ?? item.date
    if (!dateStr) continue
    const eventMs = new Date(dateStr).getTime()
    if (Number.isNaN(eventMs) || eventMs < todayMs || eventMs > horizonMs) continue

    // Detectar tipo a partir de status / tipoConteudo / tipoDocumento / title
    const blob = ((item.status ?? '') + ' ' + (item.tipoConteudo ?? '') + ' ' + (item.tipoDocumento ?? '') + ' ' + (item.title ?? '')).toLowerCase()

    let type: MercosurEvent['type'] | null = null
    if (/audi[eê]ncia\s+p[uú]blica|audiencia\s+p[uú]blica/i.test(blob)) type = 'audiencia'
    else if (/votaci[óo]n|votação|voto\s+nominal/i.test(blob)) type = 'votacion'
    else if (/sess[ãa]o|sesi[óo]n\s+(plenaria|extraordinaria|ordinaria|deliberativa)/i.test(blob)) type = 'sesion'
    else if (/convocad|agendad|reuni[óo]n\s+(de\s+comisi[óo]n|extraordinaria|ordinaria)/i.test(blob)) type = 'reunion'

    if (!type) continue

    const c = countryByCode(item.country)
    events.push({
      id: `feed-${item.id}`,
      date: dateStr.slice(0, 10),
      title: (t => (t.length > 90 ? t.slice(0, 90) + '…' : t))(cleanTitle(item.title)),
      type,
      countries: [c.flag],
      description: item.source ?? item.excerpt?.slice(0, 80) ?? '',
      itemId: item.id,
    })
  }
  // Dedupe por (date + title) en caso de items con el mismo evento
  const seen = new Set<string>()
  return events.filter(e => {
    const key = e.date + '|' + e.title.slice(0, 40).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function AgendaMercosur({ items }: { items?: NewsItem[] } = {}) {
  const navigate = useNavigate()
  // Today estable por mount · evita new Date() durante render (react-hooks/purity)
  const { today, todayMs } = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return { today: d, todayMs: d.getTime() }
  }, [])

  // Combina eventos institucionales fijos (cumbres, plazos) con eventos
  // automáticos detectados del feed (convocatorias, audiencias, sesiones).
  const upcoming = useMemo(() => {
    const institutional = AGENDA.filter(e => new Date(e.date) >= today)
    const fromFeed = extractFeedEvents(items, todayMs)
    return [...institutional, ...fromFeed]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6)
  }, [items, todayMs]) // eslint-disable-line react-hooks/exhaustive-deps


  if (upcoming.length === 0) return null

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <CalendarDays size={11} /> Agenda Mercosur
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {upcoming.map(ev => {
          // Parseo LOCAL de 'YYYY-MM-DD' (new Date(iso) lo toma como UTC y en
          // AR/-3 retrocede un día). Día y mes se derivan por separado: es-AR
          // formatea 'short' con guión ('19-jun'), así que split(' ') fallaba.
          const dp = ev.date.slice(0, 10).split('-').map(Number)
          const d = new Date(dp[0], (dp[1] || 1) - 1, dp[2] || 1)
          const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
          const daysUntil = Math.round((d.getTime() - todayMid.getTime()) / (1000 * 60 * 60 * 24))
          const typeMeta = TYPE_META[ev.type]
          const dia = d.toLocaleDateString('es-AR', { day: '2-digit' })
          const mes = d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')
          const whenLabel = daysUntil <= 0 ? 'Hoy' : daysUntil === 1 ? 'Mañana' : `en ${daysUntil}d`

          const clickable = !!ev.itemId
          return (
            <li
              key={ev.id}
              onClick={clickable ? () => navigate(`/radar/${ev.itemId}`) : undefined}
              className={cn(
                'group flex items-start gap-3 rounded-2xl p-2.5 transition-colors',
                clickable ? 'cursor-pointer hover:bg-upm-50/60' : 'hover:bg-upm-50/40',
              )}
            >
              {/* Fecha */}
              <div className="flex w-10 shrink-0 flex-col items-center rounded-xl bg-upm-50 p-1.5 ring-1 ring-upm-100">
                <span className="text-[9px] font-bold uppercase tracking-wide text-upm-500">
                  {mes}
                </span>
                <span className="text-[16px] font-bold leading-none text-upm-800">
                  {dia}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[9.5px] font-bold', typeMeta.color)}>
                    {typeMeta.label}
                  </span>
                  {ev.countries && (
                    <span className="text-[11px]">{ev.countries.join(' ')}</span>
                  )}
                  <span className={cn(
                    'ml-auto text-[10px] font-bold tabular-nums',
                    daysUntil <= 1 ? 'text-danger' : daysUntil <= 7 ? 'text-warning-dark' : 'text-ink-500',
                  )}>
                    {whenLabel}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] font-semibold leading-snug text-ink-800">{ev.title}</p>
                {ev.description && <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-500">{ev.description}</p>}
              </div>
            </li>
          )
        })}
      </ul>

    </div>
  )
}
