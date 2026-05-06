import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, Newspaper, Search, Sparkles } from 'lucide-react'
import { Modal } from './Modal'
import { Badge } from './ui'
import { DOCUMENTS, NEWS, countryByCode, topicById } from '@/lib/data'
import { useUI } from '@/lib/ui-provider'
import { cn } from '@/lib/cn'

const ROUTES = [
  { label: 'Asistente AI', path: '/asistente', desc: 'Chat con respaldo institucional' },
  { label: 'Radar normativo', path: '/radar', desc: 'Novedades por país y tema' },
  { label: 'Hablar con leyes', path: '/leyes', desc: 'Consultá artículos directos' },
  { label: 'Biblioteca UPM', path: '/biblioteca', desc: 'Memoria institucional' },
  { label: 'Mi carpeta', path: '/carpetas', desc: 'Tus guardados privados' },
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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) {
      return {
        news: NEWS.slice(0, 4),
        docs: DOCUMENTS.slice(0, 4),
        routes: ROUTES.slice(0, 4),
      }
    }
    return {
      news: NEWS.filter(n => (n.title + ' ' + n.excerpt).toLowerCase().includes(term)).slice(0, 6),
      docs: DOCUMENTS.filter(d => (d.title + ' ' + d.excerpt).toLowerCase().includes(term)).slice(0, 6),
      routes: ROUTES.filter(r => r.label.toLowerCase().includes(term) || r.desc.toLowerCase().includes(term)),
    }
  }, [q])

  const total = matches.news.length + matches.docs.length + matches.routes.length

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
            placeholder="Probá: 'corredores', 'ambiente', 'mercosur'…"
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
                {matches.routes.map(r => (
                  <ResultItem
                    key={r.path}
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
              <Section title="Novedades del Radar">
                {matches.news.map(n => {
                  const c = countryByCode(n.country)
                  return (
                    <ResultItem
                      key={n.id}
                      icon={<Newspaper size={14} className="text-warning" />}
                      title={n.title}
                      desc={`${c.flag} ${c.name} · ${topicById(n.topic).shortLabel}`}
                      tone="news"
                      onClick={() => {
                        navigate(`/radar/${n.id}`)
                        onClose()
                      }}
                    />
                  )
                })}
              </Section>
            )}

            {matches.docs.length > 0 && (
              <Section title="Biblioteca UPM">
                {matches.docs.map(d => (
                  <ResultItem
                    key={d.id}
                    icon={<FileText size={14} className="text-upm-600" />}
                    title={d.title}
                    desc={`${d.type} · ${d.status === 'oficial' ? 'Oficial UPM' : d.status === 'curado' ? 'Curado' : 'Aporte'}`}
                    onClick={() => {
                      onClose()
                      setTimeout(() => openDocument(d), 80)
                    }}
                  >
                    <Badge tone="brand">Library</Badge>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
  children,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  onClick: () => void
  tone?: 'news'
  children?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-upm-50',
        tone === 'news' && 'bg-white ring-1 ring-warning-bg/60',
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
