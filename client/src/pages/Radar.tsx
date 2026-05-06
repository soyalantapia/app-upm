import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Bookmark, FileStack, Filter, Radar, ScrollText, Sparkles, Tag, Wand2 } from 'lucide-react'
import { Badge, Button, Card, Chip, Eyebrow, EmptyState, PageHeader } from '@/components/ui'
import { COUNTRIES, NEWS, TOPICS, countryByCode, topicById } from '@/lib/data'
import type { CountryCode, DocType, Relevance, Topic } from '@/lib/types'
import { store } from '@/lib/store'

const TYPE_OPTIONS: { id: DocType; label: string }[] = [
  { id: 'ley', label: 'Ley' },
  { id: 'decreto', label: 'Decreto' },
  { id: 'reglamento', label: 'Reglamento' },
  { id: 'informe', label: 'Informe' },
  { id: 'comunicado', label: 'Comunicado UPM' },
  { id: 'acta', label: 'Acta' },
]

const RELEVANCE: Record<Relevance, { label: string; tone: 'danger' | 'warning' | 'info'; dot: string }> = {
  alta: { label: 'Alta', tone: 'danger', dot: 'bg-danger' },
  media: { label: 'Media', tone: 'warning', dot: 'bg-warning' },
  baja: { label: 'Baja', tone: 'info', dot: 'bg-info' },
}

export function RadarPage() {
  const navigate = useNavigate()
  const [country, setCountry] = useState<CountryCode | 'all'>('all')
  const [topic, setTopic] = useState<Topic | 'all'>('all')
  const [type, setType] = useState<DocType | 'all'>('all')
  const [relevance, setRelevance] = useState<Relevance | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const id = setTimeout(() => setLoading(false), 420)
    return () => clearTimeout(id)
  }, [country, topic, type, relevance])

  const filtered = useMemo(
    () =>
      NEWS.filter(n =>
        (country === 'all' || n.country === country) &&
        (topic === 'all' || n.topic === topic) &&
        (type === 'all' || n.type === type) &&
        (relevance === 'all' || n.relevance === relevance),
      ),
    [country, topic, type, relevance],
  )

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={<Eyebrow icon={<Radar size={11} />}>Radar normativo</Eyebrow>}
        title="Te avisa lo importante por país y tema"
        description="Sin perder horas revisando fuentes. Filtros, novedades y acciones inmediatas para convertir cada novedad en trabajo útil."
        actions={
          <Badge tone="brand">
            <Sparkles size={11} /> Actualización: hace 8 minutos
          </Badge>
        }
      />

      {/* Filtros */}
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 ring-1 ring-ink-100 shadow-card">
        <FilterRow label="País">
          <Chip active={country === 'all'} onClick={() => setCountry('all')} size="sm">Todos</Chip>
          {COUNTRIES.map(c => (
            <Chip key={c.code} active={country === c.code} onClick={() => setCountry(c.code)} size="sm">
              <span aria-hidden>{c.flag}</span> {c.name}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="Tema">
          <Chip active={topic === 'all'} onClick={() => setTopic('all')} size="sm">Todos</Chip>
          {TOPICS.map(t => (
            <Chip key={t.id} active={topic === t.id} onClick={() => setTopic(t.id)} size="sm">
              <Tag size={10} /> {t.shortLabel}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="Tipo">
          <Chip active={type === 'all'} onClick={() => setType('all')} size="sm">Todos</Chip>
          {TYPE_OPTIONS.map(t => (
            <Chip key={t.id} active={type === t.id} onClick={() => setType(t.id)} size="sm">
              {t.label}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="Relevancia">
          <Chip active={relevance === 'all'} onClick={() => setRelevance('all')} size="sm">Toda</Chip>
          {(Object.keys(RELEVANCE) as Relevance[]).map(r => (
            <Chip key={r} active={relevance === r} onClick={() => setRelevance(r)} size="sm">
              <span className={`h-1.5 w-1.5 rounded-full ${RELEVANCE[r].dot}`} /> {RELEVANCE[r].label}
            </Chip>
          ))}
        </FilterRow>
      </div>

      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-500">
        {loading ? (
          <>
            <span className="inline-block h-2 w-2 animate-pulse-soft rounded-full bg-upm-400" />
            Buscando fuentes UPM…
          </>
        ) : (
          `${filtered.length} ${filtered.length === 1 ? 'novedad' : 'novedades'} encontradas`
        )}
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
              <div className="flex items-start gap-3">
                <div className="skeleton h-11 w-11 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-1/3 rounded" />
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-2/3 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Filter size={22} />}
          title="No encontramos novedades"
          description="Probá con otro país, tema o palabra clave. El Radar UPM se actualiza varias veces al día."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((n, i) => {
            const country = countryByCode(n.country)
            const topic = topicById(n.topic)
            const rel = RELEVANCE[n.relevance]
            return (
              <Card
                key={n.id}
                interactive
                onClick={() => navigate(`/radar/${n.id}`)}
                style={{ animationDelay: `${i * 50}ms` }}
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
                      <Badge tone={rel.tone}>Relevancia {rel.label}</Badge>
                      <span className="text-[11px] font-semibold text-ink-500 tabular-nums">{n.date}</span>
                    </div>
                    <h3 className="mt-2 text-[16px] font-bold leading-snug text-ink-900">{n.title}</h3>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-500 line-clamp-2">{n.excerpt}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="soft" onClick={e => { e.stopPropagation(); navigate(`/radar/${n.id}`) }}>
                        <Wand2 size={13} /> Explicámelo simple
                      </Button>
                      <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); store.pushToast('success', 'Guardado en tu carpeta'); store.saveItem({ id: 'sav-' + n.id, type: 'novedad', title: n.title, ref: n.id }) }}>
                        <Bookmark size={13} /> Guardar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); store.pushToast('info', 'Brief en preparación') }}>
                        <FileStack size={13} /> Armar brief
                      </Button>
                      <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-upm-700">
                        Abrir <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}
