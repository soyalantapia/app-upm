import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Network } from 'lucide-react'
import { useCitationGraph } from '@/lib/use-citations'
import { useSimilarItems } from '@/lib/use-similarity'
import { extractContext } from '@/lib/extract-context'
import { countryByCode } from '@/lib/data'
import { extractLawNumberFromId } from '@/lib/citations'
import type { NewsItem } from '@/lib/types'

// Constelación regulatoria · visualización SVG radial centrada en la norma activa.
// No usa D3 (no quiero agregar dependencia). Layout analítico: anillos concéntricos.
//   Anillo interior: leyes que la norma activa cita (outbound)
//   Anillo medio: normas que la citan (backlinks · inbound)
//   Anillo exterior: similares cross-país (TF-IDF)
//
// Click en cualquier nodo → navega a su detalle.
// Hover muestra preview.
export function RegulatoryConstellation({ item }: { item: NewsItem }) {
  const navigate = useNavigate()
  const { graph } = useCitationGraph()
  const { similar } = useSimilarItems(item.id, 8)
  const [hovered, setHovered] = useState<NewsItem | null>(null)

  // Outbound: leyes citadas por esta norma
  const outbound = useMemo(() => {
    const ctx = extractContext(item.fullText ?? item.excerpt ?? '')
    return ctx.leyesCitadas.slice(0, 8)
  }, [item])

  // Inbound: normas que citan a esta
  const inbound = useMemo(() => {
    if (!graph) return [] as NewsItem[]
    const num = extractLawNumberFromId(item.id)
    if (!num) return []
    const backlinks = graph.backlinks.get(num) ?? []
    return backlinks.slice(0, 12).map(b => b.item)
  }, [item.id, graph])

  // Similares cross-país
  const crossCountry = useMemo(() => similar.map(s => s.item).slice(0, 6), [similar])

  const totalNodes = outbound.length + inbound.length + crossCountry.length
  if (totalNodes === 0) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center text-[13px] text-ink-500 ring-1 ring-ink-100">
        Esta norma todavía no tiene suficientes conexiones para visualizar.
      </div>
    )
  }

  // Layout: SVG 600×500
  const cx = 300
  const cy = 250
  const r1 = 90   // outbound (interior)
  const r2 = 165  // inbound (medio)
  const r3 = 230  // crossCountry (exterior)

  function nodesOnRing(arr: NewsItem[] | string[], radius: number): { x: number; y: number; payload: NewsItem | string }[] {
    const n = arr.length
    if (n === 0) return []
    return arr.map((payload, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2
      return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        payload,
      }
    })
  }

  const outNodes = nodesOnRing(outbound, r1)
  const inNodes = nodesOnRing(inbound, r2)
  const crossNodes = nodesOnRing(crossCountry, r3)

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
          <Network size={11} /> Constelación regulatoria
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-ink-600">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-upm-500" /> Cita
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-warning-fg" /> La citan
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success-fg" /> Similar región
          </span>
        </div>
      </div>

      <div className="relative">
        <svg viewBox="0 0 600 500" className="w-full" preserveAspectRatio="xMidYMid meet">
          {/* Rings de fondo */}
          <circle cx={cx} cy={cy} r={r1} fill="none" stroke="#E5E7EB" strokeDasharray="2 4" />
          <circle cx={cx} cy={cy} r={r2} fill="none" stroke="#E5E7EB" strokeDasharray="2 4" />
          <circle cx={cx} cy={cy} r={r3} fill="none" stroke="#E5E7EB" strokeDasharray="2 4" />

          {/* Líneas desde centro a cada nodo */}
          {outNodes.map((n, i) => (
            <line key={`oe-${i}`} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke="#062B4D" strokeOpacity="0.18" strokeWidth="1" />
          ))}
          {inNodes.map((n, i) => (
            <line key={`ie-${i}`} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke="#B45309" strokeOpacity="0.22" strokeWidth="1" />
          ))}
          {crossNodes.map((n, i) => (
            <line key={`ce-${i}`} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke="#15803D" strokeOpacity="0.18" strokeWidth="1" strokeDasharray="3 3" />
          ))}

          {/* Nodos outbound */}
          {outNodes.map((n, i) => (
            <g key={`o-${i}`} className="cursor-default" style={{ pointerEvents: 'none' }}>
              <circle cx={n.x} cy={n.y} r={8} fill="#062B4D" />
              <text x={n.x} y={n.y + 3} textAnchor="middle" className="fill-white text-[8px] font-bold">
                {String(n.payload).slice(-3)}
              </text>
            </g>
          ))}

          {/* Nodos inbound · interactivos */}
          {inNodes.map((n, i) => {
            const item = n.payload as NewsItem
            return (
              <g
                key={`i-${i}`}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(item)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => navigate(`/radar/${item.id}`)}
              >
                <circle cx={n.x} cy={n.y} r={10} fill="#B45309" className="transition hover:fill-warning" />
                <text x={n.x} y={n.y + 3} textAnchor="middle" className="pointer-events-none fill-white text-[8.5px] font-bold">
                  {countryByCode(item.country).flag}
                </text>
              </g>
            )
          })}

          {/* Nodos cross-country · interactivos */}
          {crossNodes.map((n, i) => {
            const item = n.payload as NewsItem
            return (
              <g
                key={`c-${i}`}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(item)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => navigate(`/radar/${item.id}`)}
              >
                <circle cx={n.x} cy={n.y} r={11} fill="#15803D" className="transition hover:fill-success" />
                <text x={n.x} y={n.y + 3} textAnchor="middle" className="pointer-events-none fill-white text-[8.5px] font-bold">
                  {countryByCode(item.country).flag}
                </text>
              </g>
            )
          })}

          {/* Nodo central · la norma activa */}
          <g>
            <circle cx={cx} cy={cy} r={28} fill="#062B4D" />
            <circle cx={cx} cy={cy} r={28} fill="none" stroke="#062B4D" strokeOpacity="0.25" strokeWidth="12" />
            <text x={cx} y={cy - 2} textAnchor="middle" className="fill-white text-[10px] font-bold uppercase tracking-wider">
              {countryByCode(item.country).code}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" className="fill-white text-[9px]">
              {item.tipoDocumento?.slice(0, 14) ?? ''}
            </text>
          </g>
        </svg>

        {/* Preview hover */}
        {hovered && (
          <div className="absolute bottom-2 left-2 right-2 rounded-2xl bg-ink-900/95 p-3 text-white shadow-floating">
            <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wide text-white/70">
              <span>{countryByCode(hovered.country).flag} {countryByCode(hovered.country).code}</span>
              <span>·</span>
              <span>{hovered.tipoDocumento ?? hovered.type}</span>
            </div>
            <p className="mt-1 text-[12.5px] font-bold leading-snug line-clamp-2">{hovered.title}</p>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-[10.5px] text-ink-500">
        Anillo interior: <span className="font-bold text-ink-700">{outbound.length}</span> leyes que esta norma cita ·
        Medio: <span className="font-bold text-ink-700">{inbound.length}</span> normas que la citan ·
        Exterior: <span className="font-bold text-ink-700">{crossCountry.length}</span> equivalentes regionales
      </p>
    </div>
  )
}
