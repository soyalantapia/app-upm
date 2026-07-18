import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, Newspaper, Search, Sparkles, User } from 'lucide-react'
import { Modal } from './Modal'
import { Badge } from './ui'
import { DOCUMENTS, NEWS as MOCK_NEWS, countryByCode, topicById } from '@/lib/data'
import { cleanTitle } from '@/lib/pt-es'
import { useUI } from '@/lib/ui-provider'
import { cn } from '@/lib/cn'
import { useLiveFeed } from '@/lib/use-live-feed'
import { getAllLegisladores, type Legislador } from '@/lib/legisladores'
import { useDebounced } from '@/lib/use-debounced'
import { useSemanticSearch } from '@/lib/use-semantic-search'

const ROUTES = [
  { label: 'Asistente IA', path: '/asistente', desc: 'Chat con respaldo institucional' },
  { label: 'Radar normativo', path: '/radar', desc: 'Novedades por país y tema' },
  { label: 'Hablar con leyes', path: '/leyes', desc: 'Consultá artículos directos' },
  { label: 'Perfil', path: '/perfil', desc: 'Preferencias y membresía' },
]

export function GlobalSearch({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { openDocument } = useUI()
  const [q, setQ] = useState('')
  const debouncedQ = useDebounced(q, 150)
  const inputRef = useRef<HTMLInputElement>(null)
  const { feed } = useLiveFeed()
  const [legisladores, setLegisladores] = useState<Legislador[]>([])

  useEffect(() => {
    if (open) {
      setQ('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Cargar legisladores cuando abre por primera vez
  useEffect(() => {
    if (open && legisladores.length === 0) {
      getAllLegisladores().then(setLegisladores).catch(() => {})
    }
  }, [open, legisladores.length])

  // Universo de búsqueda · usa feed live + legisladores + mock fallback
  const allNews = useMemo(() => {
    return feed?.items?.length ? feed.items : MOCK_NEWS
  }, [feed])

  // Normas: búsqueda SEMÁNTICA contra el backend (significado, no solo keyword),
  // con fallback local. Los demás grupos siguen filtrando en cliente (baratos).
  const semantic = useSemanticSearch(debouncedQ, { fallback: allNews })

  const matches = useMemo(() => {
    const term = debouncedQ.trim()
    if (!term) {
      return {
        news: allNews.slice(0, 4),
        docs: DOCUMENTS.slice(0, 3),
        legs: legisladores.slice(0, 3),
        routes: ROUTES.slice(0, 4),
      }
    }
    const lower = term.toLowerCase()
    return {
      news: semantic.items.slice(0, 8),
      docs: DOCUMENTS.filter(d => (d.title + ' ' + d.excerpt).toLowerCase().includes(lower)).slice(0, 4),
      legs: legisladores.filter(l => l.name.toLowerCase().includes(lower) || (l.partido ?? '').toLowerCase().includes(lower)).slice(0, 6),
      routes: ROUTES.filter(r => r.label.toLowerCase().includes(lower) || r.desc.toLowerCase().includes(lower)),
    }
  }, [debouncedQ, allNews, legisladores, semantic.items])

  const total = matches.news.length + matches.docs.length + matches.legs.length + matches.routes.length

  // Navegación por teclado (command-palette): flechas + Enter sobre la lista plana
  // en orden de render (rutas → normas → legisladores → biblioteca).
  const [activeIndex, setActiveIndex] = useState(0)
  useEffect(() => { setActiveIndex(0) }, [debouncedQ, total])
  const flatActions = useMemo(() => {
    const acts: (() => void)[] = []
    for (const r of matches.routes) acts.push(() => { navigate(r.path); onClose() })
    for (const n of matches.news) acts.push(() => { navigate(`/radar/${n.id}${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); onClose() })
    for (const l of matches.legs) acts.push(() => { navigate(`/legislador/${l.id}`); onClose() })
    for (const d of matches.docs) acts.push(() => { onClose(); setTimeout(() => openDocument(d), 80) })
    return acts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, q])
  const newsOffset = matches.routes.length
  const legsOffset = newsOffset + matches.news.length
  const docsOffset = legsOffset + matches.legs.length

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Search size={16} className="text-upm-600" /> Buscar en UPM
        </span>
      }
      description="Encontrá novedades, documentos y secciones del producto."
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-2xl bg-upm-50/40 px-4 py-3 ring-1 ring-upm-100 focus-within:bg-white focus-within:ring-upm-400">
          <Search size={16} className="text-upm-600" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(total - 1, i + 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(0, i - 1)) }
              else if (e.key === 'Enter') { e.preventDefault(); flatActions[activeIndex]?.() }
            }}
            placeholder="Buscá normas, legisladores o secciones…"
            className="flex-1 bg-transparent text-[14.5px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
          <span className="hidden rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-ink-500 ring-1 ring-ink-100 sm:block">
            ESC
          </span>
        </div>

        {total === 0 ? (
          <div className="rounded-2xl bg-ink-50 px-4 py-6 text-center text-[13px] text-ink-500">
            No encontramos resultados. Probá otra palabra clave.
          </div>
        ) : (
          <>
            {matches.routes.length > 0 && (
              <Section title="Ir a">
                {matches.routes.map((r, i) => (
                  <ResultItem
                    key={r.path}
                    active={activeIndex === i}
                    icon={<Sparkles size={14} className="text-upm-600" />}
                    title={r.label}
                    desc={r.desc}
                    onClick={() => {
                      navigate(r.path)
                      onClose()
                    }}
                  />
                ))}
              </Section>
            )}

            {matches.news.length > 0 && (
              <Section
                title={
                  <span className="flex items-center gap-1.5">
                    Normas del corpus ({matches.news.length})
                    {semantic.mode === 'hybrid' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-upm-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-upm-600 ring-1 ring-upm-100">
                        <Sparkles size={9} /> IA · por significado
                      </span>
                    )}
                  </span>
                }
              >
                {matches.news.map((n, i) => {
                  const c = countryByCode(n.country)
                  return (
                    <ResultItem
                      key={n.id}
                      active={activeIndex === newsOffset + i}
                      icon={<Newspaper size={14} className="text-warning" />}
                      title={cleanTitle(n.title)}
                      desc={`${c.flag} ${c.name} · ${topicById(n.topic).shortLabel}${n.tipoDocumento ? ` · ${n.tipoDocumento}` : ''}`}
                      tone="news"
                      onClick={() => {
                        // Pasar query como highlight inline
                        navigate(`/radar/${n.id}${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
                        onClose()
                      }}
                    />
                  )
                })}
              </Section>
            )}

            {matches.legs.length > 0 && (
              <Section title={`Legisladores (${matches.legs.length})`}>
                {matches.legs.map((l, i) => {
                  const c = countryByCode(l.country)
                  return (
                    <ResultItem
                      key={l.id}
                      active={activeIndex === legsOffset + i}
                      icon={<User size={14} className="text-upm-600" />}
                      title={l.name}
                      desc={`${c.flag} ${l.camara} · ${l.partido}${l.provincia ? ` (${l.provincia})` : ''}`}
                      onClick={() => {
                        navigate(`/legislador/${l.id}`)
                        onClose()
                      }}
                    />
                  )
                })}
              </Section>
            )}

            {matches.docs.length > 0 && (
              <Section title="Biblioteca UPM">
                {matches.docs.map((d, i) => (
                  <ResultItem
                    key={d.id}
                    active={activeIndex === docsOffset + i}
                    icon={<FileText size={14} className="text-upm-600" />}
                    title={d.title}
                    desc={`${d.type} · ${d.status === 'oficial' ? 'Oficial UPM' : d.status === 'curado' ? 'Curado' : 'Aporte'}`}
                    onClick={() => {
                      onClose()
                      setTimeout(() => openDocument(d), 80)
                    }}
                  >
                    <Badge tone="brand">Biblioteca</Badge>
                  </ResultItem>
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">{title}</div>
      <div className="mt-1.5 flex flex-col gap-1">{children}</div>
    </div>
  )
}

function ResultItem({
  icon,
  title,
  desc,
  onClick,
  tone,
  active,
  children,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  onClick: () => void
  tone?: 'news'
  active?: boolean
  children?: React.ReactNode
}) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (active) ref.current?.scrollIntoView({ block: 'nearest' }) }, [active])
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-upm-50',
        tone === 'news' && 'bg-white ring-1 ring-warning-bg/60',
        active && 'bg-upm-50 ring-1 ring-upm-200',
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-upm-50">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-ink-900">{title}</span>
        <span className="block truncate text-[11.5px] text-ink-500">{desc}</span>
      </span>
      {children}
      <ArrowRight size={13} className="text-ink-300 group-hover:text-upm-600" />
    </button>
  )
}
