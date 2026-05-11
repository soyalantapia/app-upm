import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boxes, ChevronDown, ChevronRight, Network } from 'lucide-react'
import { countryByCode } from '@/lib/data'
import { formatDate } from '@/lib/format'
import { clusterDisplayName, type Cluster } from '@/lib/clusters'

// Vista de clusters · agrupa el corpus por "ecosistema normativo".
// Cada cluster tiene una ley raíz + sus normas que la citan.
export function RadarClusters({ clusters, singletonsCount }: { clusters: Cluster[]; singletonsCount: number }) {
  if (clusters.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center text-[13px] text-ink-500 ring-1 ring-ink-100">
        El corpus actual no contiene leyes raíz con suficientes normas reglamentarias para formar clusters.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-upm-50/40 p-3 ring-1 ring-upm-100">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-700">
          <Boxes size={14} className="text-upm-700" />
          <span className="font-bold">{clusters.length} clusters</span> agrupan{' '}
          <span className="font-bold">{clusters.reduce((s, c) => s + c.size, 0)} normas</span> con
          <span className="font-bold"> {singletonsCount} sueltas</span> sin ecosistema detectado.
          Cada cluster ordena ley raíz + decretos reglamentarios + resoluciones implementadoras.
        </div>
      </div>
      <ul className="flex flex-col gap-2.5">
        {clusters.map((cluster, idx) => (
          <ClusterRow key={cluster.id} cluster={cluster} index={idx} />
        ))}
      </ul>
    </div>
  )
}

function ClusterRow({ cluster, index }: { cluster: Cluster; index: number }) {
  const [open, setOpen] = useState(index < 3) // primeros 3 abiertos por default
  const navigate = useNavigate()
  const country = countryByCode(cluster.root.country)
  const displayName = clusterDisplayName(cluster)

  // Top tipos en el cluster
  const tipos = new Map<string, number>()
  for (const m of cluster.members) {
    const t = m.type ?? 'otro'
    tipos.set(t, (tipos.get(t) ?? 0) + 1)
  }

  return (
    <li
      className="animate-fade-up rounded-2xl bg-white ring-1 ring-ink-100 shadow-card"
      style={{ animationDelay: `${Math.min(index, 15) * 30}ms` }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left transition hover:bg-upm-50/30"
      >
        <div className="flex flex-1 items-start gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-upm-50 text-upm-700">
            <Network size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
              <span className="inline-flex items-center gap-1 rounded-md bg-upm-50 px-1.5 py-0.5 font-bold uppercase tracking-wide text-upm-700 ring-1 ring-upm-100">
                {country.flag} {country.code}
              </span>
              <span className="font-bold text-ink-500">Ecosistema</span>
              <span className="rounded-full bg-upm-700 px-2 py-0.5 text-[10px] font-bold text-white">{cluster.size} normas</span>
              {Array.from(tipos.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([t, n]) => (
                  <span
                    key={t}
                    className="rounded-md bg-ink-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-ink-600 ring-1 ring-ink-100"
                  >
                    {t} · {n}
                  </span>
                ))}
            </div>
            <h3 className="mt-1.5 text-[15px] font-bold leading-snug text-ink-900">
              {displayName}
            </h3>
            <p className="mt-0.5 text-[11.5px] text-ink-500 line-clamp-1">
              Raíz: {cluster.root.title}
            </p>
          </div>
        </div>
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-50 text-ink-600">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {open && (
        <div className="border-t border-ink-100 p-4 pt-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">
            <Network size={11} /> Miembros del ecosistema
          </div>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {cluster.members.slice(0, 12).map(m => (
              <li key={m.id}>
                <button
                  onClick={() => navigate(`/radar/${m.id}`)}
                  className="group flex w-full items-start gap-2 rounded-xl bg-ink-50/30 px-2.5 py-2 text-left transition hover:bg-upm-50 hover:ring-1 hover:ring-upm-100"
                >
                  <span className={
                    'mt-0.5 inline-flex h-4 shrink-0 items-center rounded px-1.5 text-[9px] font-bold uppercase tracking-wide ring-1 ' +
                    (m.id === cluster.root.id
                      ? 'bg-upm-700 text-white ring-upm-700'
                      : 'bg-white text-ink-600 ring-ink-100')
                  }>
                    {m.id === cluster.root.id ? 'RAÍZ' : (m.type ?? 'norma')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold leading-tight text-ink-800 line-clamp-2 group-hover:text-upm-800">
                      {m.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-500 tabular-nums">{formatDate(m.date)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {cluster.members.length > 12 && (
            <p className="mt-2 text-[11px] italic text-ink-500">
              + {cluster.members.length - 12} normas más en este ecosistema
            </p>
          )}
        </div>
      )}
    </li>
  )
}
