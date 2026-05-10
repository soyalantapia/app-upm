import { cn } from '@/lib/cn'

function renderInline(text: string, key: string) {
  const parts: (string | { bold: string })[] = []
  const regex = /\*\*([^*]+)\*\*/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push({ bold: match[1] })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return (
    <span key={key}>
      {parts.map((p, i) =>
        typeof p === 'string'
          ? <span key={`s-${key}-${i}`}>{p}</span>
          : <strong key={`b-${key}-${i}`} className="font-bold text-ink-900">{p.bold}</strong>,
      )}
    </span>
  )
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  const lines = content.split('\n')
  const blocks: { type: 'p' | 'h' | 'ul' | 'ol'; items: string[]; level?: number }[] = []
  let buffer: string[] = []
  let mode: 'p' | 'ul' | 'ol' | null = null

  const flush = () => {
    if (!buffer.length) return
    if (mode === 'ul' || mode === 'ol') blocks.push({ type: mode, items: [...buffer] })
    else blocks.push({ type: 'p', items: [buffer.join(' ')] })
    buffer = []
    mode = null
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    if (line.startsWith('## ')) {
      flush()
      blocks.push({ type: 'h', items: [line.slice(3)], level: 2 })
      continue
    }
    if (line.startsWith('# ')) {
      flush()
      blocks.push({ type: 'h', items: [line.slice(2)], level: 1 })
      continue
    }
    if (/^\*\*[^*]+\*\*$/.test(line)) {
      flush()
      blocks.push({ type: 'h', items: [line.replace(/\*\*/g, '')], level: 3 })
      continue
    }
    if (line.startsWith('- ')) {
      if (mode !== 'ul') flush()
      mode = 'ul'
      buffer.push(line.slice(2))
      continue
    }
    const ol = line.match(/^(\d+)\.\s+(.*)$/)
    if (ol) {
      if (mode !== 'ol') flush()
      mode = 'ol'
      buffer.push(ol[2])
      continue
    }
    if (mode === 'ul' || mode === 'ol') flush()
    if (mode !== 'p') flush()
    mode = 'p'
    buffer.push(line)
  }
  flush()

  return (
    <div className={cn('flex flex-col gap-3 text-[14.5px] leading-relaxed text-ink-700', className)}>
      {blocks.map((b, i) => {
        if (b.type === 'h') {
          const sz = b.level === 1 ? 'text-lg' : b.level === 2 ? 'text-base' : 'text-[14.5px]'
          return (
            <h4 key={i} className={cn('font-bold tracking-tight text-ink-900', sz)}>
              {renderInline(b.items[0], 'h-' + i)}
            </h4>
          )
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="ml-1 flex flex-col gap-1.5">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-upm-400" />
                  <span>{renderInline(it, `ul-${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          )
        }
        if (b.type === 'ol') {
          return (
            <ol key={i} className="ml-1 flex flex-col gap-1.5">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-upm-50 text-[11px] font-bold text-upm-700">{j + 1}</span>
                  <span>{renderInline(it, `ol-${i}-${j}`)}</span>
                </li>
              ))}
            </ol>
          )
        }
        return (
          <p key={i} className="leading-relaxed">
            {renderInline(b.items[0], 'p-' + i)}
          </p>
        )
      })}
    </div>
  )
}
