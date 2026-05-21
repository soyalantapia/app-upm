import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { matchAuthors, type Legislador } from '@/lib/legisladores'

// Muestra los legisladores conocidos detectados en authors del item,
// como chips clickables que llevan a /legislador/:id.
export function AuthorChips({ authorsString }: { authorsString: string | undefined }) {
  const navigate = useNavigate()
  const [legs, setLegs] = useState<Legislador[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    matchAuthors(authorsString)
      .then(l => {
        if (mounted) {
          setLegs(l)
          setLoading(false)
        }
      })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [authorsString])

  if (loading || legs.length === 0) return null

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
        <Users size={11} /> Legisladores autores identificados
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {legs.map(l => (
          <li key={l.id}>
            <button
              onClick={() => navigate(`/legislador/${l.id}`)}
              className="group flex items-center gap-2 rounded-2xl bg-upm-50 px-3 py-2 ring-1 ring-upm-100 transition hover:-translate-y-0.5 hover:bg-upm-100"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-upm-700 text-[10.5px] font-bold text-white">
                {l.name.split(' ').slice(0, 2).map(p => p[0]).join('')}
              </span>
              <div className="text-left">
                <p className="text-[11.5px] font-bold leading-tight text-ink-900 group-hover:text-upm-800">{l.name}</p>
                <p className="text-[9.5px] text-ink-500">{l.partido} · {l.provincia}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
