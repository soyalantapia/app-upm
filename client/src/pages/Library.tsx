import { useMemo, useState } from 'react'
import { ArrowUpRight, Library, Search } from 'lucide-react'
import { Badge, Card, Chip, EmptyState, Eyebrow, PageHeader } from '@/components/ui'
import { COUNTRIES, DOCUMENTS, TOPICS, countryByCode, topicById } from '@/lib/data'
import type { CountryCode, DocStatus, DocType, Topic } from '@/lib/types'
import { store } from '@/lib/store'

const TYPE_FILTERS: { id: DocType | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'ley', label: 'Leyes' },
  { id: 'decreto', label: 'Decretos' },
  { id: 'reglamento', label: 'Reglamentos' },
  { id: 'informe', label: 'Informes' },
  { id: 'acta', label: 'Actas' },
  { id: 'convenio', label: 'Convenios' },
  { id: 'comunicado', label: 'Comunicados' },
  { id: 'minuta', label: 'Minutas' },
  { id: 'dossier', label: 'Dossiers' },
]

const STATUS_FILTERS: { id: DocStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'oficial', label: 'Oficial UPM' },
  { id: 'curado', label: 'Curado por UPM' },
  { id: 'aporte', label: 'Aporte de foro' },
]

export function LibraryPage() {
  const [q, setQ] = useState('')
  const [type, setType] = useState<DocType | 'all'>('all')
  const [country, setCountry] = useState<CountryCode | 'all'>('all')
  const [status, setStatus] = useState<DocStatus | 'all'>('all')
  const [topic, setTopic] = useState<Topic | 'all'>('all')

  const results = useMemo(
    () =>
      DOCUMENTS.filter(d =>
        (q.trim() === '' || (d.title + ' ' + d.excerpt).toLowerCase().includes(q.toLowerCase())) &&
        (type === 'all' || d.type === type) &&
        (status === 'all' || d.status === status) &&
        (country === 'all' || d.country === country) &&
        (topic === 'all' || d.topic === topic),
      ),
    [q, type, country, status, topic],
  )

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={<Eyebrow icon={<Library size={11} />}>Biblioteca UPM</Eyebrow>}
        title="Memoria institucional, accesible y trabajable"
        description="Documentos institucionales, convenios, actas, informes y materiales por foro. Buscá por tema, país o palabra."
      />

      {/* Buscador */}
      <div className="rounded-3xl bg-white p-4 ring-1 ring-ink-100 shadow-card">
        <label className="flex items-center gap-3 rounded-2xl bg-upm-50/40 px-4 py-3 ring-1 ring-upm-100 focus-within:bg-white focus-within:ring-upm-400">
          <Search size={17} className="text-upm-600" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por tema, país o palabra"
            className="flex-1 bg-transparent text-[14.5px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
        </label>

        <div className="mt-3 flex flex-col gap-2.5">
          <FilterRow label="Tipo">
            {TYPE_FILTERS.map(t => (
              <Chip key={t.id} size="sm" active={type === t.id} onClick={() => setType(t.id)}>
                {t.label}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Estado">
            {STATUS_FILTERS.map(s => (
              <Chip key={s.id} size="sm" active={status === s.id} onClick={() => setStatus(s.id)}>
                {s.label}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="País">
            <Chip size="sm" active={country === 'all'} onClick={() => setCountry('all')}>Todos</Chip>
            {COUNTRIES.map(c => (
              <Chip key={c.code} size="sm" active={country === c.code} onClick={() => setCountry(c.code)}>
                <span aria-hidden>{c.flag}</span> {c.name}
              </Chip>
            ))}
          </FilterRow>
          <FilterRow label="Tema">
            <Chip size="sm" active={topic === 'all'} onClick={() => setTopic('all')}>Todos</Chip>
            {TOPICS.map(t => (
              <Chip key={t.id} size="sm" active={topic === t.id} onClick={() => setTopic(t.id)}>
                {t.shortLabel}
              </Chip>
            ))}
          </FilterRow>
        </div>
      </div>

      <div className="text-[12.5px] font-semibold text-ink-500">
        {results.length} {results.length === 1 ? 'documento' : 'documentos'} encontrados
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={<Library size={22} />}
          title="No encontramos documentos"
          description="Probá con otro filtro o palabra clave. La Biblioteca UPM crece con cada foro y reunión."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((d, i) => {
            const t = topicById(d.topic)
            const c = d.country ? countryByCode(d.country) : null
            return (
              <Card
                key={d.id}
                interactive
                style={{ animationDelay: `${i * 35}ms` }}
                className="animate-fade-up"
                onClick={() => store.pushToast('info', `Abriendo "${d.title}"`)}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-upm-50 text-upm-700">
                    <Library size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="brand">{d.type}</Badge>
                      {d.status === 'oficial' && <Badge tone="success">Oficial UPM</Badge>}
                      {d.status === 'curado' && <Badge tone="info">Curado por UPM</Badge>}
                      {d.status === 'aporte' && <Badge tone="warning">Aporte de foro</Badge>}
                      {c && <Badge tone="ghost">{c.flag} {c.name}</Badge>}
                    </div>
                    <h3 className="mt-2 text-[15px] font-bold leading-snug text-ink-900">{d.title}</h3>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500 line-clamp-2">{d.excerpt}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px] text-ink-500">
                        <span>{t.shortLabel}</span>
                        {d.forum && <span>· Foro {d.forum}</span>}
                        <span className="tabular-nums">· {d.date}</span>
                      </div>
                      <ArrowUpRight size={15} className="text-upm-600" />
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
    <div className="flex flex-col gap-1.5">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}
