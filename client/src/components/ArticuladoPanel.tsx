import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hash, MessageSquareText, Search, X } from 'lucide-react'
import { HighlightedText } from './HighlightedText'

type Articulo = {
  numero: string
  texto: string
}

// ArticuladoPanel · panel del detalle de Leyes que muestra el articulado
// extraído del fullText con:
// · Búsqueda within (filter + highlight)
// · Paginación incremental (10 inicial, +10 al click)
// · Botón "Asistente" por artículo · navega a /asistente con el contexto
//   del artículo precargado vía sessionStorage.

const PAGE_SIZE = 10

export function ArticuladoPanel({
  articulos,
  lawId,
  lawTitle,
}: {
  articulos: Articulo[]
  lawId: string
  lawTitle: string
}) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return articulos
    return articulos.filter(a =>
      a.texto.toLowerCase().includes(term) ||
      a.numero.toLowerCase().includes(term),
    )
  }, [articulos, q])

  const handleAskAssistant = (art: Articulo) => {
    // Pasamos el contexto al Asistente vía sessionStorage para que precargue
    // el chat con una pregunta sobre este artículo.
    try {
      sessionStorage.setItem('upm.asistente.prefill', JSON.stringify({
        lawId,
        lawTitle,
        articleNumber: art.numero,
        articleText: art.texto,
        suggestedQuestion: `Explicame qué dice el Artículo ${art.numero} de ${lawTitle} y por qué importa.`,
      }))
    } catch {
      // ignore
    }
    navigate('/asistente')
  }

  if (articulos.length < 2) return null

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
          <Hash size={11} /> Articulado ({articulos.length})
        </div>
        {articulos.length > 5 && (
          <label className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] ring-1 ring-ink-100 focus-within:ring-upm-400">
            <Search size={11} className="text-ink-400" />
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setVisibleCount(PAGE_SIZE) }}
              placeholder="Buscar en artículos…"
              className="w-40 bg-transparent text-[11.5px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
            {q && (
              <button onClick={() => setQ('')} className="text-ink-400 hover:text-ink-700" aria-label="Limpiar">
                <X size={10} />
              </button>
            )}
          </label>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-3 rounded-2xl bg-white p-4 text-center text-[12px] text-ink-500 ring-1 ring-ink-100">
          No hay artículos que contengan "{q}"
        </div>
      ) : (
        <>
          <ol className="mt-3 space-y-2">
            {filtered.slice(0, visibleCount).map((a, i) => (
              <li
                key={`art-${i}-${a.numero}`}
                className="group rounded-2xl bg-white p-3 ring-1 ring-ink-100 transition hover:ring-upm-200"
              >
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0 rounded-md bg-upm-50 px-2 py-0.5 text-[11px] font-bold text-upm-800 ring-1 ring-upm-100">
                    Art. {a.numero}
                  </span>
                  <p className="flex-1 text-[13.5px] leading-relaxed text-ink-800 line-clamp-4">
                    {q ? <HighlightedText text={a.texto} terms={[q]} /> : a.texto}
                  </p>
                  <button
                    onClick={() => handleAskAssistant(a)}
                    title={`Preguntar al Asistente sobre el artículo ${a.numero}`}
                    className="ml-1 shrink-0 inline-flex items-center gap-1 rounded-full bg-upm-50 px-2 py-1 text-[10.5px] font-bold text-upm-700 ring-1 ring-upm-100 opacity-0 transition group-hover:opacity-100 hover:bg-upm-100"
                  >
                    <MessageSquareText size={10} /> Asistente
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {filtered.length > visibleCount && (
            <button
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              className="mt-3 w-full rounded-2xl bg-white px-3 py-2 text-[12px] font-bold text-upm-700 ring-1 ring-upm-100 transition hover:bg-upm-50"
            >
              Ver más artículos ({filtered.length - visibleCount} restantes)
            </button>
          )}
        </>
      )}
    </div>
  )
}
