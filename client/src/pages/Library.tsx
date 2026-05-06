import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BookMarked,
  FileBadge,
  FilePieChart,
  FileText,
  GraduationCap,
  Handshake,
  Library,
  Megaphone,
  Search,
  Stamp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Card, Chip, EmptyState, Eyebrow, PageHeader } from '@/components/ui'
import { COUNTRIES, DOCUMENTS, TOPICS, countryByCode, topicById } from '@/lib/data'
import type { CountryCode, DocStatus, DocType, Topic } from '@/lib/types'
import { useUI } from '@/lib/ui-provider'
import { useStore } from '@/lib/store'

type CategoryKey = 'all' | 'convenios' | 'actas' | 'comunicados' | 'informes' | 'documentos-base' | 'normativa' | 'academico'

const CATEGORIES: { id: CategoryKey; label: string; desc: string; icon: LucideIcon; types?: DocType[]; statusFilter?: DocStatus }[] = [
  { id: 'all', label: 'Todos', desc: `${DOCUMENTS.length} documentos`, icon: Library },
  { id: 'convenios', label: 'Convenios', desc: 'Cooperación regional', icon: Handshake, types: ['convenio'] },
  { id: 'actas', label: 'Actas', desc: 'Foros y reuniones', icon: BookMarked, types: ['acta'] },
  { id: 'comunicados', label: 'Comunicados', desc: 'Oficiales UPM', icon: Megaphone, types: ['comunicado'] },
  { id: 'informes', label: 'Informes', desc: 'Análisis técnicos', icon: FilePieChart, types: ['informe'] },
  { id: 'documentos-base', label: 'Documentos base', desc: 'Marcos institucionales', icon: FileBadge, types: ['dossier', 'minuta'] },
  { id: 'normativa', label: 'Normativa', desc: 'Leyes, decretos, reglamentos', icon: Stamp, types: ['ley', 'decreto', 'reglamento'] },
  { id: 'academico', label: 'Material académico', desc: 'Foro académico', icon: GraduationCap, statusFilter: 'aporte' },
]

const STATUS_FILTERS: { id: DocStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'oficial', label: 'Oficial UPM' },
  { id: 'curado', label: 'Curado por UPM' },
  { id: 'aporte', label: 'Aporte de foro' },
]

function matchesCategory(doc: { type: DocType; status: DocStatus }, category: CategoryKey) {
  if (category === 'all') return true
  const cat = CATEGORIES.find(c => c.id === category)
  if (!cat) return true
  if (cat.statusFilter && doc.status !== cat.statusFilter) return false
  if (cat.types && !cat.types.includes(doc.type)) return false
  return true
}

export function LibraryPage() {
  const { openDocument } = useUI()
  const savedRefs = useStore(s => new Set(s.saved.map(i => i.ref).filter(Boolean) as string[]))
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<CategoryKey>('all')
  const [country, setCountry] = useState<CountryCode | 'all'>('all')
  const [status, setStatus] = useState<DocStatus | 'all'>('all')
  const [topic, setTopic] = useState<Topic | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const id = setTimeout(() => setLoading(false), 480)
    return () => clearTimeout(id)
  }, [q, category, country, status, topic])

  const results = useMemo(
    () =>
      DOCUMENTS.filter(d =>
        (q.trim() === '' || (d.title + ' ' + d.excerpt).toLowerCase().includes(q.toLowerCase())) &&
        matchesCategory(d, category) &&
        (status === 'all' || d.status === status) &&
        (country === 'all' || d.country === country) &&
        (topic === 'all' || d.topic === topic),
      ),
    [q, category, country, status, topic],
  )

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow={<Eyebrow icon={<Library size={11} />}>Biblioteca UPM</Eyebrow>}
        title="Memoria institucional, accesible y trabajable"
        description="Documentos institucionales, convenios, actas, informes y materiales por foro. Buscá por tema, país o palabra."
      />

      {/* Categorías destacadas */}
      <div>
        <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">Categorías</div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {CATEGORIES.map(c => {
            const active = category === c.id
            const count =
              c.id === 'all'
                ? DOCUMENTS.length
                : DOCUMENTS.filter(d => matchesCategory(d, c.id)).length
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={
                  'group flex flex-col items-start gap-2 rounded-2xl border-2 p-3.5 text-left transition-all duration-200 ' +
                  (active
                    ? 'border-upm-500 bg-upm-50 shadow-card'
                    : 'border-transparent bg-white ring-1 ring-ink-100 hover:border-upm-200 hover:bg-upm-50/40')
                }
              >
                <div className={'grid h-9 w-9 place-items-center rounded-xl ' + (active ? 'bg-gradient-to-br from-upm-500 to-upm-700 text-white shadow-cta' : 'bg-upm-50 text-upm-700')}>
                  <c.icon size={16} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-ink-900">{c.label}</div>
                  <div className="text-[11px] text-ink-500">{c.desc}</div>
                </div>
                <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-500 tabular-nums">
                  {count} {count === 1 ? 'doc' : 'docs'}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Buscador + filtros */}
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

      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-500">
        {loading ? (
          <>
            <span className="inline-block h-2 w-2 animate-pulse-soft rounded-full bg-upm-400" />
            Buscando fuentes UPM…
          </>
        ) : (
          `${results.length} ${results.length === 1 ? 'documento encontrado' : 'documentos encontrados'}`
        )}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
              <div className="flex items-start gap-3">
                <div className="skeleton h-10 w-10 rounded-2xl" />
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
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Library size={22} />}
          title="No encontramos documentos para este filtro"
          description="Probá con otro país, tema o palabra clave. La Biblioteca UPM crece con cada foro y reunión."
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
                onClick={() => openDocument(d)}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-upm-50 text-upm-700">
                    <FileText size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="brand">{d.type}</Badge>
                      {d.status === 'oficial' && <Badge tone="success">Oficial UPM</Badge>}
                      {d.status === 'curado' && <Badge tone="info">Curado por UPM</Badge>}
                      {d.status === 'aporte' && <Badge tone="warning">Aporte de foro</Badge>}
                      {c && <Badge tone="ghost">{c.flag} {c.name}</Badge>}
                      {savedRefs.has(d.id) && <Badge tone="success">Guardado</Badge>}
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

