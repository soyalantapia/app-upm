// Utility para resaltar ocurrencias de uno o más términos dentro de un texto.
// Usado por NewsConversation/Laws cuando llegan con ?q=energia para que el
// fullText completo muestre las apariciones con <mark>.

export function HighlightedText({
  text,
  terms,
  className,
}: {
  text: string
  terms: string[]
  className?: string
}) {
  if (!text) return null
  const valid = terms.filter(t => t && t.trim().length >= 2)
  if (valid.length === 0) {
    return <span className={className}>{text}</span>
  }
  const escaped = valid.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const splitRe = new RegExp(`(${escaped.join('|')})`, 'gi')
  const matchRe = new RegExp(`^(${escaped.join('|')})$`, 'i')
  const parts = text.split(splitRe)
  return (
    <span className={className}>
      {parts.map((p, i) =>
        matchRe.test(p) ? (
          <mark key={`hl-${i}`} className="rounded bg-warning-bg/70 px-0.5 text-ink-900">
            {p}
          </mark>
        ) : (
          <span key={`tx-${i}`}>{p}</span>
        ),
      )}
    </span>
  )
}
