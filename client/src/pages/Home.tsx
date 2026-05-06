import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  CalendarDays,
  FileStack,
  FlaskConical,
  Library,
  MessageSquareText,
  Radar,
  ScrollText,
  Sparkles,
  Tag,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import { AGENDA, DOSSIERS, NEWS, countryByCode, topicById } from '@/lib/data'
import { Badge, Button, Card, Chip, Eyebrow, PageHeader, Stat } from '@/components/ui'
import { SouthAmericaBackdrop } from '@/components/SouthAmerica'

const RELEVANCE: Record<string, { label: string; tone: 'danger' | 'warning' | 'info' }> = {
  alta: { label: 'Relevancia alta', tone: 'danger' },
  media: { label: 'Relevancia media', tone: 'warning' },
  baja: { label: 'Relevancia baja', tone: 'info' },
}

function QuickAction({ to, icon: Icon, title, desc }: { to: string; icon: LucideIcon; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-ink-100 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover hover:ring-upm-100"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-upm-500 to-upm-700 text-white shadow-cta">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-bold text-ink-900">{title}</div>
        <div className="text-[12px] text-ink-500">{desc}</div>
      </div>
      <ArrowUpRight size={15} className="mt-1 shrink-0 text-ink-300 transition-colors group-hover:text-upm-600" />
    </Link>
  )
}

export function HomePage() {
  const { operator } = useAuth()
  const prefs = useStore(s => s.prefs)
  const saved = useStore(s => s.saved)
  const navigate = useNavigate()

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 19) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  const lastName = operator?.name.split(' ').slice(-1)[0] ?? 'Legislador'
  const visibleNews = NEWS.slice(0, 3)
  const upcomingEvent = AGENDA[0]

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-upm-700 via-upm-800 to-upm-900 p-6 text-white shadow-floating sm:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-90">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-upm-500/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-upm-400/20 blur-3xl" />
        </div>
        <SouthAmericaBackdrop tone="dark" className="-right-6 -top-6 h-[140%] w-[55%] opacity-70" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/85 ring-1 ring-white/20">
              <Sparkles size={12} /> Tablero del legislador
            </div>
            <h1 className="mt-3 text-[28px] font-bold tracking-tight sm:text-[34px]">
              {greeting}, {lastName}
            </h1>
            <p className="mt-1 max-w-2xl text-[14.5px] text-white/75">
              Tenés <span className="font-bold text-white">{NEWS.length} novedades relevantes</span> y{' '}
              <span className="font-bold text-white">{DOSSIERS.length} dossiers activos</span>. El radar UPM se actualizó hace minutos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <Button size="lg" onClick={() => navigate('/asistente')}>
              <MessageSquareText size={17} /> Preguntar al Asistente
            </Button>
            <Button size="md" variant="secondary" className="bg-white/95" onClick={() => navigate('/radar')}>
              <Radar size={15} /> Ver Radar normativo
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Novedades hoy" value={NEWS.length} hint="Filtradas por tus temas" />
        <Stat label="Dossiers activos" value={DOSSIERS.length} hint="Listos para reunión" />
        <Stat label="Documentos guardados" value={saved.length} hint="Privado del legislador" />
        <Stat label="Próximo evento" value={upcomingEvent ? upcomingEvent.date.slice(5) : '—'} hint={upcomingEvent?.title ?? 'Sin agenda'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Resumen del día */}
        <div className="flex flex-col gap-4">
          <PageHeader
            eyebrow={<Eyebrow icon={<TrendingUp size={11} />}>Resumen del día</Eyebrow>}
            title="Lo que vale la pena mirar hoy"
            description="Novedades, alertas y materiales priorizados por tus temas y países."
          />

          <div className="flex flex-col gap-3">
            {visibleNews.map((n, i) => {
              const country = countryByCode(n.country)
              const topic = topicById(n.topic)
              const rel = RELEVANCE[n.relevance]
              return (
                <Card
                  key={n.id}
                  interactive
                  onClick={() => navigate(`/radar/${n.id}`)}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="animate-fade-up"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-upm-50 text-upm-700">
                      <ScrollText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="brand">{country.flag} {country.name}</Badge>
                        <Badge tone="ghost">{topic.shortLabel}</Badge>
                        <Badge tone={rel.tone}>{rel.label}</Badge>
                      </div>
                      <h3 className="mt-2 text-[16px] font-bold leading-snug text-ink-900">{n.title}</h3>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-500 line-clamp-2">{n.excerpt}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="soft">
                          <Sparkles size={13} /> Explicámelo simple
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Bookmark size={13} /> Guardar
                        </Button>
                        <Button size="sm" variant="ghost">
                          <FileStack size={13} /> Armar brief
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <Link
            to="/radar"
            className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-upm-700 hover:text-upm-800"
          >
            Ver todas las novedades del Radar <ArrowRight size={14} />
          </Link>
        </div>

        {/* Sidebar derecho */}
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">Acciones rápidas</div>
            <div className="mt-3 flex flex-col gap-2.5">
              <QuickAction to="/asistente" icon={MessageSquareText} title="Preguntar al Asistente" desc="Brief, resumen, redacción" />
              <QuickAction to="/radar" icon={Radar} title="Ver Radar" desc="Novedades por país y tema" />
              <QuickAction to="/leyes" icon={BookOpen} title="Hablar con una ley" desc="Preguntá al documento" />
              <QuickAction to="/dossiers" icon={FileStack} title="Crear dossier" desc="Paquete listo para reunión" />
              <QuickAction to="/biblioteca" icon={Library} title="Buscar en Biblioteca UPM" desc="Memoria institucional" />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">Mis prioridades</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(prefs?.topics ?? []).map(t => (
                <Chip key={t} size="sm">
                  <Tag size={10} /> {topicById(t).shortLabel}
                </Chip>
              ))}
              <Chip size="sm" onClick={() => navigate('/perfil')}>+ Editar</Chip>
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-upm-50 to-white p-5 ring-1 ring-upm-100 shadow-card">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-upm-700">
              <CalendarDays size={12} /> Próximo evento UPM
            </div>
            {upcomingEvent ? (
              <>
                <div className="mt-2 text-[15.5px] font-bold leading-snug text-ink-900">{upcomingEvent.title}</div>
                <div className="mt-1 text-[12.5px] text-ink-500 tabular-nums">
                  {upcomingEvent.date} · {upcomingEvent.documents} documentos
                </div>
                <Button size="sm" variant="soft" className="mt-3" onClick={() => navigate('/agenda')}>
                  <FlaskConical size={13} /> Preparar reunión
                </Button>
              </>
            ) : (
              <div className="mt-2 text-[13px] text-ink-500">Sin eventos por ahora.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
