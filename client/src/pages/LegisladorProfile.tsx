import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, User, Building2, MapPin, ScrollText } from 'lucide-react'
import { Badge, Eyebrow, PageHeader } from '@/components/ui'
import { getLegislador, matchAuthors, type Legislador } from '@/lib/legisladores'
import { useLiveFeed } from '@/lib/use-live-feed'
import { countryByCode } from '@/lib/data'
import { formatDate } from '@/lib/format'
import type { NewsItem } from '@/lib/types'

export function LegisladorProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { feed } = useLiveFeed()
  const [leg, setLeg] = useState<Legislador | null>(null)
  const [loading, setLoading] = useState(true)
  const [coAutores, setCoAutores] = useState<Map<string, number>>(new Map())

  // Encontrar al legislador
  useEffect(() => {
    if (!id) return
    let mounted = true
    setLoading(true)
    getLegislador(id).then(l => {
      if (mounted) {
        setLeg(l)
        setLoading(false)
      }
    })
    return () => { mounted = false }
  }, [id])

  // Leyes que firma: filtrar feed donde authors contiene su nombre
  const [leyesFirmadas, setLeyesFirmadas] = useState<NewsItem[]>([])

  useEffect(() => {
    if (!leg || !feed?.items) return
    let mounted = true
    ;(async () => {
      const matches: NewsItem[] = []
      const coCounts = new Map<string, number>()
      for (const item of feed.items) {
        const authors = (item.authors ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        const needle = leg.name.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        if (!authors.includes(needle)) continue
        matches.push(item)
        // Co-autores: matchear todos los legisladores del dataset contra este item
        const coLegs = await matchAuthors(item.authors)
        for (const c of coLegs) {
          if (c.id === leg.id) continue
          coCounts.set(c.id, (coCounts.get(c.id) ?? 0) + 1)
        }
      }
      if (mounted) {
        setLeyesFirmadas(matches)
        setCoAutores(coCounts)
      }
    })()
    return () => { mounted = false }
  }, [leg, feed?.items])

  if (loading) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-10">
        <div className="skeleton h-64 w-full rounded-3xl" />
      </div>
    )
  }

  if (!leg) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-[14px] text-ink-500">Legislador no encontrado.</p>
        <Link to="/radar" className="mt-3 inline-flex text-upm-700 hover:underline">← Volver al Radar</Link>
      </div>
    )
  }

  const country = countryByCode(leg.country)

  return (
    <div className="animate-fade-up mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 self-start text-[12.5px] font-semibold text-upm-700 hover:text-upm-800"
      >
        <ArrowLeft size={14} /> Volver
      </button>

      {/* Hero · perfil del legislador */}
      <div className="rounded-3xl bg-gradient-to-br from-upm-700 via-upm-800 to-upm-900 p-6 text-white shadow-floating sm:p-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/85 ring-1 ring-white/20">
          <User size={11} /> Perfil del legislador
        </div>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white/15 text-[28px] font-bold text-white ring-1 ring-white/25">
            {leg.name.split(' ').slice(0, 2).map(p => p[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-bold tracking-tight sm:text-[28px]">{leg.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 ring-1 ring-white/25">
                {country.flag} {country.name}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 ring-1 ring-white/25">
                <Building2 size={11} /> {leg.camara}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 ring-1 ring-white/25">
                {leg.partido}
              </span>
              {leg.bloque && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 ring-1 ring-white/25">
                  {leg.bloque}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 ring-1 ring-white/25">
                <MapPin size={11} /> {leg.provincia}
              </span>
            </div>
            {leg.bio && (
              <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-white/85">{leg.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Leyes que firma" value={leyesFirmadas.length} />
        <StatCard label="Co-autores frecuentes" value={coAutores.size} />
        <StatCard label="Sancionadas" value={leyesFirmadas.filter(l => /sancion|promulgad/i.test(l.status ?? '')).length} />
        <StatCard label="En trámite" value={leyesFirmadas.filter(l => !/sancion|promulgad/i.test(l.status ?? '')).length} />
      </div>

      {/* Leyes firmadas */}
      <PageHeader
        eyebrow={<Eyebrow icon={<ScrollText size={11} />}>Producción legislativa</Eyebrow>}
        title="Leyes y proyectos que firma"
      />

      {leyesFirmadas.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center text-[13px] text-ink-500 ring-1 ring-ink-100">
          No detectamos firmas de este legislador en los items del corpus actual.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {leyesFirmadas.slice(0, 30).map(item => (
            <li key={item.id}>
              <button
                onClick={() => navigate(`/radar/${item.id}`)}
                className="group flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-ink-100 shadow-card transition hover:-translate-y-0.5 hover:ring-upm-200"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-upm-50 text-upm-700">
                  <ScrollText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                    {item.tipoDocumento && (
                      <span className="rounded-md bg-ink-50 px-1.5 py-0.5 font-bold text-ink-700 ring-1 ring-ink-100">{item.tipoDocumento}</span>
                    )}
                    {item.status && <Badge tone="success">{item.status}</Badge>}
                    <span className="text-ink-500 tabular-nums">{formatDate(item.date)}</span>
                  </div>
                  <p className="mt-1 text-[13.5px] font-semibold text-ink-900 line-clamp-2 group-hover:text-upm-800">{item.title}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Co-autores */}
      {coAutores.size > 0 && (
        <CoAutoresPanel coCounts={coAutores} navigate={navigate} />
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-ink-100">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">{label}</div>
      <div className="mt-1 text-[22px] font-bold tabular-nums text-ink-900">{value}</div>
    </div>
  )
}

function CoAutoresPanel({
  coCounts,
  navigate,
}: {
  coCounts: Map<string, number>
  navigate: (path: string) => void
}) {
  const [enriched, setEnriched] = useState<{ legislador: Legislador; count: number }[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const out: { legislador: Legislador; count: number }[] = []
      for (const [id, count] of coCounts.entries()) {
        const l = await getLegislador(id)
        if (l) out.push({ legislador: l, count })
      }
      out.sort((a, b) => b.count - a.count)
      if (mounted) setEnriched(out)
    })()
    return () => { mounted = false }
  }, [coCounts])

  if (enriched.length === 0) return null

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
        <User size={11} /> Co-autores frecuentes
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {enriched.slice(0, 8).map(({ legislador, count }) => {
          const c = countryByCode(legislador.country)
          return (
            <li key={legislador.id}>
              <button
                onClick={() => navigate(`/legislador/${legislador.id}`)}
                className="group flex w-full items-center gap-3 rounded-2xl bg-ink-50/40 p-3 text-left ring-1 ring-ink-100 transition hover:bg-upm-50 hover:ring-upm-100"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-upm-700 text-[12px] font-bold text-white">
                  {legislador.name.split(' ').slice(0, 2).map(p => p[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold text-ink-900 line-clamp-1 group-hover:text-upm-800">{legislador.name}</p>
                  <p className="text-[10.5px] text-ink-500">{c.flag} {legislador.partido} · {legislador.provincia}</p>
                </div>
                <span className="rounded-full bg-upm-50 px-2 py-0.5 text-[10.5px] font-bold tabular-nums text-upm-700 ring-1 ring-upm-100">
                  {count} co-firmas
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
