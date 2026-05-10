import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  CalendarDays,
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
import { store, useStore } from '@/lib/store'
import { DOCUMENTS, NEWS as MOCK_NEWS, countryByCode, topicById } from '@/lib/data'
import { Badge, Button, Card, Chip, Eyebrow, PageHeader, Stat } from '@/components/ui'
import { SouthAmericaBackdrop } from '@/components/SouthAmerica'
import { useUI } from '@/lib/ui-provider'
import { useLiveFeed } from '@/lib/use-live-feed'
import { DiffSinceLastVisit } from '@/components/DiffSinceLastVisit'

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
  const { openDocument } = useUI()

  // Feed real (live) en lugar del mock estático. Si el feed todavía no cargó,
  // usamos los items mock como fallback para que el Home no se vea vacío.
  const { feed } = useLiveFeed(prefs ? { countries: prefs.countries, topics: prefs.topics } : undefined)
  const NEWS = feed?.items?.length ? feed.items : MOCK_NEWS

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 19) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  const lastName = operator?.name.split(' ').slice(-1)[0] ?? 'Legislador'

  // Stats reales del feed live
  const totalNovedades = NEWS.length
  const altaRelevancia = NEWS.filter(n => n.relevance === 'alta').length

  // Highlights: 3 más recientes ordenadas por fecha desc
  const highlightedNews = [...NEWS]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, 3)
  const recommendedDoc = DOCUMENTS.find(d => d.status === 'oficial' && d.type === 'informe') ?? DOCUMENTS[1]
  // Alerta prioritaria: primer item de alta relevancia y tema ambiente; fallback al primer alta
  const priorityAlert =
    NEWS.find(n => n.relevance === 'alta' && n.topic === 'ambiente') ??
    NEWS.find(n => n.relevance === 'alta') ??
    NEWS[0]
  const alertTopic = topicById(priorityAlert.topic)

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
              Tenés <span className="font-bold text-white">{totalNovedades} novedades</span> en tu radar y{' '}
              <span className="font-bold text-white">{altaRelevancia} de alta relevancia</span>. El radar UPM se actualizó hace minutos.
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

      {/* Diff "qué cambió desde tu última visita" · solo aparece si hay snapshot previo
          y al menos 1 norma nueva. Click en "Marcar como leídas" o navegar a /radar
          actualiza el snapshot. */}
      <DiffSinceLastVisit items={NEWS} />

      {/* Stats clickeables · todos vinculados al feed real */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button onClick={() => navigate('/radar')} className="text-left transition hover:-translate-y-0.5">
          <Stat label="Novedades en radar" value={totalNovedades} hint="Datos en vivo de fuentes oficiales" />
        </button>
        <button onClick={() => navigate('/radar')} className="text-left transition hover:-translate-y-0.5">
          <Stat label="Alta relevancia" value={altaRelevancia} hint="Para revisar primero" />
        </button>
        <button onClick={() => navigate('/biblioteca')} className="text-left transition hover:-translate-y-0.5">
          <Stat label="Documentos UPM" value={DOCUMENTS.length} hint="Biblioteca activa" />
        </button>
        <button onClick={() => navigate('/carpetas')} className="text-left transition hover:-translate-y-0.5">
          <Stat label="Mis guardados" value={saved.length} hint="En tu carpeta privada" />
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Resumen del día */}
        <div className="flex flex-col gap-4">
          <PageHeader
            eyebrow={<Eyebrow icon={<TrendingUp size={11} />}>Resumen del día</Eyebrow>}
            title="Lo que vale la pena mirar hoy"
            description="Novedades, alertas y materiales priorizados por tus temas y países."
          />

          {/* Alerta prioritaria, primero (urgente) */}
          <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.18em] text-danger-fg">
            <AlertTriangle size={11} /> Urgente · Alerta de tema prioritario
          </div>
          <Card className="animate-fade-up bg-gradient-to-br from-warning-bg/60 to-white ring-warning">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-warning text-white shadow-cta">
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="warning">Alerta UPM</Badge>
                  <Badge tone="ghost">{alertTopic.shortLabel}</Badge>
                  <Badge tone="danger">Revisar primero</Badge>
                </div>
                <h3 className="mt-2 text-[17px] font-bold leading-snug text-ink-900">{priorityAlert.title}</h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-700 line-clamp-2">{priorityAlert.excerpt}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => navigate(`/radar/${priorityAlert.id}`)}>
                    Abrir y conversar <ArrowRight size={13} />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* 3 novedades destacadas */}
          <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-500">
            Novedades normativas relevantes
          </div>
          <div className="flex flex-col gap-3">
            {highlightedNews.map((n, i) => {
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
                        <Button
                          size="sm"
                          variant="soft"
                          onClick={e => {
                            e.stopPropagation()
                            navigate(`/radar/${n.id}`)
                          }}
                        >
                          <Sparkles size={13} /> Explicámelo simple
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={e => {
                            e.stopPropagation()
                            store.saveItem({
                              id: 'sav-news-' + n.id,
                              type: 'novedad',
                              title: n.title,
                              ref: n.id,
                              meta: { country: n.country, topic: n.topic, type: n.type },
                            })
                            store.pushToast('success', 'Novedad guardada en tu carpeta')
                          }}
                        >
                          <Bookmark size={13} /> Guardar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Documento recomendado */}
          <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-500">
            Documento recomendado
          </div>
          <Card className="animate-fade-up bg-gradient-to-br from-upm-50/70 to-white ring-upm-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-upm-100 text-upm-700">
                <BookOpen size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="brand">{recommendedDoc.type}</Badge>
                  <Badge tone="success">Oficial UPM</Badge>
                  <Badge tone="ghost">{topicById(recommendedDoc.topic).shortLabel}</Badge>
                </div>
                <h3 className="mt-2 text-[16px] font-bold leading-snug text-ink-900">{recommendedDoc.title}</h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-500 line-clamp-2">{recommendedDoc.excerpt}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="soft" onClick={() => openDocument(recommendedDoc)}>
                    <FlaskConical size={13} /> Abrir documento
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate('/biblioteca')}>
                    <Library size={13} /> Ver en Biblioteca
                  </Button>
                </div>
              </div>
            </div>
          </Card>

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
              <QuickAction to="/briefing" icon={ScrollText} title="Briefing Pre-sesión" desc="1-pager imprimible para tu comisión" />
              <QuickAction to="/radar" icon={Radar} title="Ver Radar" desc="Novedades por país y tema" />
              <QuickAction to="/leyes" icon={BookOpen} title="Hablar con una ley" desc="Preguntá al documento" />
              <QuickAction to="/biblioteca" icon={Library} title="Buscar en Biblioteca UPM" desc="Memoria institucional" />
              <QuickAction to="/carpetas" icon={Bookmark} title="Mi carpeta" desc="Tus guardados privados" />
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

          <div className="rounded-3xl bg-gradient-to-br from-upm-700 to-upm-900 p-5 text-white shadow-floating ring-1 ring-white/10">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-upm-200">Tip institucional</div>
            <p className="mt-2 text-[13px] leading-relaxed text-white/85">
              El Asistente UPM trabaja sobre <span className="font-bold text-white">biblioteca y normativa cargada por la institución</span>. Cuando responde con respaldo lo verás marcado como "Con fuentes UPM".
            </p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => navigate('/asistente')}>
              <Sparkles size={13} /> Probar el Asistente
            </Button>
          </div>

          <button
            onClick={() => navigate('/radar')}
            className="group flex items-center gap-3 rounded-3xl bg-white p-4 text-left ring-1 ring-ink-100 shadow-card transition hover:-translate-y-0.5 hover:ring-upm-100 hover:shadow-card-hover"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-success-bg text-success-fg">
              <CalendarDays size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-success-fg">Radar al día</div>
              <div className="mt-0.5 text-[12.5px] text-ink-700">Actualizado hace 8 minutos · {NEWS.length} novedades</div>
            </div>
            <ArrowRight size={14} className="shrink-0 text-ink-300 group-hover:text-upm-600" />
          </button>
        </div>
      </div>
    </div>
  )
}
