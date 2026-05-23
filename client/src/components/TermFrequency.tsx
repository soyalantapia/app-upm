import { useMemo } from 'react'
import { Hash } from 'lucide-react'
import type { NewsItem } from '@/lib/types'

// Stopwords en español, portugués e inglés para filtrar del análisis
const STOPWORDS = new Set([
  // ES
  'de', 'del', 'la', 'las', 'los', 'el', 'en', 'y', 'a', 'que', 'se', 'un', 'una', 'por',
  'con', 'para', 'al', 'su', 'sus', 'o', 'es', 'no', 'lo', 'más', 'como', 'sobre',
  'entre', 'está', 'son', 'ha', 'fue', 'le', 'les', 'si', 'hay', 'ya', 'este', 'esta',
  'ley', 'leyes', 'decreto', 'decretos', 'resolución', 'resoluciones', 'proyecto',
  'nacional', 'general', 'artículo', 'art', 'n°', 'nro',
  // PT
  'da', 'das', 'do', 'dos', 'ao', 'aos', 'às', 'ou', 'na', 'nas', 'no', 'nos',
  'com', 'um', 'uma', 'são', 'foi', 'por', 'para', 'que', 'de', 'e', 'em',
  'lei', 'decreto', 'resolução', 'projeto', 'artigo',
  // Extra regulatorio
  'república', 'nación', 'poder', 'ejecutivo', 'legislativo', 'federal',
  'publicado', 'establece', 'crea', 'modifica', 'aprueba', 'emite',
  'mediante', 'cual', 'cuyo', 'dicho', 'dichos', 'acuerdo',
])

type TermData = { term: string; count: number; pct: number }

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar tildes para normalizar
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w))
}

export function TermFrequency({ items, topN = 20 }: { items: NewsItem[]; topN?: number }) {
  const terms = useMemo((): TermData[] => {
    const freq = new Map<string, number>()
    for (const item of items) {
      const words = tokenize(item.title + ' ' + (item.excerpt ?? '') + ' ' + (item.fullText?.slice(0, 300) ?? ''))
      for (const w of words) {
        freq.set(w, (freq.get(w) ?? 0) + 1)
      }
    }
    const sorted = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
    const max = sorted[0]?.[1] ?? 1
    return sorted.map(([term, count]) => ({ term, count, pct: count / max }))
  }, [items, topN])

  if (terms.length === 0) return null

  const max = terms[0].count

  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-upm-700">
        <Hash size={11} /> Términos más frecuentes en el corpus
      </div>
      <p className="mt-1 text-[11.5px] text-ink-500">
        Las {terms.length} palabras que más aparecen en títulos y ementas. Muestra qué domina la agenda regulatoria regional.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {terms.map((t, i) => (
          <div key={t.term} className="flex items-center gap-3">
            <span className="w-5 text-right text-[10px] font-bold tabular-nums text-ink-300">{i + 1}</span>
            <span className="w-32 shrink-0 truncate text-[12.5px] font-semibold capitalize text-ink-800">{t.term}</span>
            <div className="flex-1 h-2 rounded-full bg-ink-50 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${t.pct * 100}%`,
                  background: `hsl(${210 + i * 3}, ${60 - i}%, ${45 + i}%)`,
                }}
              />
            </div>
            <span className="w-10 text-right text-[11.5px] font-bold tabular-nums text-ink-600">{t.count}</span>
            <span className="w-12 text-right text-[10.5px] text-ink-400">
              {((t.count / max) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {/* Tag cloud decorativo */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {terms.slice(0, 15).map(t => (
          <span
            key={t.term}
            className="rounded-full bg-upm-50 px-2.5 py-1 font-semibold capitalize text-upm-700 ring-1 ring-upm-100"
            style={{ fontSize: `${Math.max(9, 9 + t.pct * 6)}px` }}
          >
            {t.term}
          </span>
        ))}
      </div>
    </div>
  )
}
