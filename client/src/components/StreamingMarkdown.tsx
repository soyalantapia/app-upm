import { useEffect, useMemo, useState } from 'react'
import { Markdown } from './Markdown'

// StreamingMarkdown · revela la respuesta del Asistente bloque por bloque,
// con efecto "IA escribiendo" (cursor que parpadea + fade del último bloque).
// Seguro: cada bloque es markdown completo (no se corta la sintaxis).
// Solo anima en el montaje del mensaje nuevo; respeta prefers-reduced-motion.

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function StreamingMarkdown({
  content,
  animate = true,
  className,
}: {
  content: string
  animate?: boolean
  className?: string
}) {
  const blocks = useMemo(() => content.split(/\n{2,}/).filter(b => b.trim()), [content])
  const instant = !animate || prefersReducedMotion()
  const [revealed, setRevealed] = useState(instant ? blocks.length : Math.min(1, blocks.length))

  useEffect(() => {
    if (instant) {
      setRevealed(blocks.length)
      return
    }
    if (revealed >= blocks.length) return
    const t = setTimeout(() => setRevealed(r => Math.min(r + 1, blocks.length)), 95)
    return () => clearTimeout(t)
  }, [revealed, blocks.length, instant])

  const done = revealed >= blocks.length

  return (
    <div className={className}>
      <div className="flex flex-col gap-3">
        {blocks.slice(0, revealed).map((b, i) => (
          <div key={i} className={!instant && i === revealed - 1 ? 'animate-fade-up [animation-fill-mode:both]' : ''}>
            <Markdown content={b} />
          </div>
        ))}
      </div>
      {!done && (
        <span
          className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse-soft rounded-full bg-upm-500 align-middle"
          aria-hidden
        />
      )}
    </div>
  )
}
