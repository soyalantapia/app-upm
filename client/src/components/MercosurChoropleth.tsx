import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, MapPin } from 'lucide-react'
import { useLiveFeed } from '@/lib/use-live-feed'
import { TOPICS, countryByCode, topicById } from '@/lib/data'
import type { CountryCode, Topic } from '@/lib/types'

// Mapa coroplético del Mercosur ampliado · SVG hand-built con paths simplificados
// de cada país miembro. Colorea según volumen de normas y tema seleccionado.
// Hover → tooltip con métricas. Click → navega a Radar filtrado por país.
//
// Coordenadas: cuadrante 0,0 (top-left) a 600,520 (bottom-right). Países son
// polígonos aproximados, no GeoJSON real, para no agregar dependencias.

const COUNTRY_PATHS: Record<CountryCode, { d: string; centroid: [number, number] }> = {
  // Brasil · ~el más grande, centro-este
  BR: {
    d: 'M 320,80 L 480,90 L 540,160 L 560,260 L 530,360 L 460,400 L 380,400 L 340,360 L 310,300 L 290,220 L 295,140 Z',
    centroid: [410, 240],
  },
  // Argentina · cono sur
  AR: {
    d: 'M 220,260 L 290,250 L 310,320 L 320,400 L 305,470 L 270,510 L 230,490 L 215,420 L 200,340 Z',
    centroid: [255, 380],
  },
  // Uruguay · pequeño, entre AR y BR
  UY: {
    d: 'M 310,330 L 350,330 L 355,365 L 320,375 L 305,355 Z',
    centroid: [330, 350],
  },
  // Paraguay · interior
  PY: {
    d: 'M 290,200 L 360,210 L 365,255 L 310,260 L 285,235 Z',
    centroid: [325, 230],
  },
  // Bolivia · centro-oeste alto
  BO: {
    d: 'M 200,180 L 285,180 L 290,240 L 235,250 L 195,225 Z',
    centroid: [240, 215],
  },
  // Chile · costa oeste estrecho
  CL: {
    d: 'M 175,200 L 200,200 L 215,280 L 220,370 L 215,460 L 195,490 L 185,470 L 180,380 L 175,290 Z',
    centroid: [195, 350],
  },
  // Perú · norte-oeste
  PE: {
    d: 'M 130,140 L 215,150 L 220,200 L 175,205 L 130,180 Z',
    centroid: [175, 175],
  },
  // Colombia · norte
  CO: {
    d: 'M 165,60 L 240,70 L 245,140 L 195,150 L 160,120 Z',
    centroid: [200, 110],
  },
}

const COUNTRY_LABELS_ORDER: CountryCode[] = ['BR', 'AR', 'UY', 'PY', 'BO', 'CL', 'PE', 'CO']

export function MercosurChoropleth() {
  const navigate = useNavigate()
  const { feed } = useLiveFeed()
  const items = feed?.items ?? []
  const [topic, setTopic] = useState<Topic | 'all'>('all')
  const [hovered, setHovered] = useState<CountryCode | null>(null)

  // Computar conteos por país, opcional filtrado por tema
  const counts = useMemo(() => {
    const m = new Map<CountryCode, number>()
    const alta = new Map<CountryCode, number>()
    for (const item of items) {
      if (topic !== 'all' && item.topic !== topic) continue
      m.set(item.country, (m.get(item.country) ?? 0) + 1)
      if (item.relevance === 'alta') alta.set(item.country, (alta.get(item.country) ?? 0) + 1)
    }
    return { total: m, alta }
  }, [items, topic])

  // Escala de color · azul claro a azul oscuro
  const maxCount = Math.max(...Array.from(counts.total.values()), 1)
  const colorFor = (count: number): string => {
    if (count === 0) return '#F3F4F6'
    const ratio = Math.min(count / maxCount, 1)
    const step = ratio < 0.2 ? 50 : ratio < 0.4 ? 100 : ratio < 0.6 ? 300 : ratio < 0.8 ? 500 : 700
    return {
      50: '#EFF6FF',
      100: '#DBEAFE',
      300: '#93C5FD',
      500: '#3B82F6',
      700: '#1D4ED8',
    }[step] ?? '#1D4ED8'
  }

  const hoveredCountry = hovered ? countryByCode(hovered) : null
  const hoveredCount = hovered ? counts.total.get(hovered) ?? 0 : 0
  const hoveredAlta = hovered ? counts.alta.get(hovered) ?? 0 : 0

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <Globe size={11} /> Mapa regulatorio del Mercosur ampliado
        </div>
        <select
          value={topic}
          onChange={e => setTopic(e.target.value as Topic | 'all')}
          className="rounded-full bg-ink-50 px-3 py-1 text-[11.5px] font-bold text-ink-700 ring-1 ring-ink-100 focus:outline-none focus:ring-upm-300"
        >
          <option value="all">Todos los temas</option>
          {TOPICS.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* SVG del mapa */}
        <div className="relative">
          <svg viewBox="0 0 600 520" className="w-full" preserveAspectRatio="xMidYMid meet">
            {/* Fondo · océano sutil */}
            <rect width="600" height="520" fill="#F8FAFC" />
            {COUNTRY_LABELS_ORDER.map(code => {
              const path = COUNTRY_PATHS[code]
              const count = counts.total.get(code) ?? 0
              const fillColor = colorFor(count)
              const c = countryByCode(code)
              return (
                <g
                  key={code}
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered(code)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => navigate(`/radar`)}
                >
                  <path
                    d={path.d}
                    fill={fillColor}
                    stroke={hovered === code ? '#062B4D' : '#94A3B8'}
                    strokeWidth={hovered === code ? 2.5 : 1.2}
                    className="transition-colors"
                  />
                  <text
                    x={path.centroid[0]}
                    y={path.centroid[1] - 4}
                    textAnchor="middle"
                    className={'pointer-events-none text-[12px] font-bold ' + (count > maxCount * 0.5 ? 'fill-white' : 'fill-ink-700')}
                  >
                    {c.flag}
                  </text>
                  <text
                    x={path.centroid[0]}
                    y={path.centroid[1] + 12}
                    textAnchor="middle"
                    className={'pointer-events-none text-[9px] font-bold tabular-nums ' + (count > maxCount * 0.5 ? 'fill-white' : 'fill-ink-700')}
                  >
                    {count}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Escala de color */}
          <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-ink-500">
            <span>0</span>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full">
              <div className="flex-1" style={{ background: '#F3F4F6' }} />
              <div className="flex-1" style={{ background: '#EFF6FF' }} />
              <div className="flex-1" style={{ background: '#DBEAFE' }} />
              <div className="flex-1" style={{ background: '#93C5FD' }} />
              <div className="flex-1" style={{ background: '#3B82F6' }} />
              <div className="flex-1" style={{ background: '#1D4ED8' }} />
            </div>
            <span className="tabular-nums">{maxCount}</span>
          </div>
        </div>

        {/* Panel lateral: hover detail + tabla */}
        <div className="flex flex-col gap-3">
          {/* Hover card */}
          {hoveredCountry ? (
            <div className="rounded-2xl bg-upm-700 p-3 text-white shadow-card">
              <div className="flex items-center gap-2">
                <span className="text-[18px]">{hoveredCountry.flag}</span>
                <span className="text-[13px] font-bold">{hoveredCountry.name}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <p className="text-white/70">Total normas</p>
                  <p className="text-[18px] font-bold tabular-nums">{hoveredCount}</p>
                </div>
                <div>
                  <p className="text-white/70">Alta relevancia</p>
                  <p className="text-[18px] font-bold tabular-nums">{hoveredAlta}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-ink-50/40 p-3 text-[11.5px] text-ink-500 ring-1 ring-ink-100">
              Hover sobre cada país para ver sus métricas.
            </div>
          )}

          {/* Tabla compacta */}
          <div className="rounded-2xl bg-ink-50/40 p-3 ring-1 ring-ink-100">
            <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-500">
              <MapPin size={9} className="inline" /> Ranking por país
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {COUNTRY_LABELS_ORDER
                .map(code => ({ code, count: counts.total.get(code) ?? 0, alta: counts.alta.get(code) ?? 0 }))
                .sort((a, b) => b.count - a.count)
                .map(({ code, count, alta }) => {
                  const c = countryByCode(code)
                  return (
                    <li key={code} className="flex items-center gap-2 text-[11px]">
                      <span>{c.flag}</span>
                      <span className="font-bold text-ink-700 w-6">{c.code}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white overflow-hidden">
                        <div
                          className="h-full rounded-full bg-upm-500"
                          style={{ width: `${Math.min((count / maxCount) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="font-bold tabular-nums text-ink-800 w-12 text-right">{count}</span>
                      <span className="text-[9.5px] text-danger-fg font-bold tabular-nums w-12 text-right">
                        {alta > 0 ? `↑ ${alta}` : ''}
                      </span>
                    </li>
                  )
                })}
            </ul>
            <p className="mt-2 text-[10px] italic text-ink-500">
              ↑ N · cantidad de alta relevancia
              {topic !== 'all' && ` · Filtrado por ${topicById(topic).label}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
