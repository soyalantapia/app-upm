import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

// Normaliza la URL de un enlace markdown a un href usable.
// Internos (#/… o /…) → hash-link del HashRouter; http(s) → externo.
function linkHref(url: string): { href: string; external: boolean } {
  if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) return { href: url, external: /^https?:/i.test(url) }
  if (url.startsWith('#')) return { href: url, external: false }
  if (url.startsWith('/')) return { href: '#' + url, external: false }
  return { href: '#/' + url, external: false }
}

// Tokeniza inline: enlaces [texto](url), **negrita** y *itálica*.
// El orden de las alternativas importa (negrita antes que itálica).
function renderInline(text: string, key: string): ReactNode {
  const nodes: ReactNode[] = []
  const regex = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\n]+)\*/g
  let last = 0
  let i = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text))) {
    if (match.index > last) nodes.push(<span key={`t-${key}-${i}`}>{text.slice(last, match.index)}</span>)
    if (match[1] !== undefined) {
      const { href, external } = linkHref(match[2])
      nodes.push(
        <a
          key={`a-${key}-${i}`}
          href={href}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="font-semibold text-upm-700 underline decoration-upm-300 underline-offset-2 hover:text-upm-800"
        >
          {match[1]}
        </a>,
      )
    } else if (match[3] !== undefined) {
      nodes.push(<strong key={`b-${key}-${i}`} className="font-bold text-ink-900">{match[3]}</strong>)
    } else if (match[4] !== undefined) {
      nodes.push(<em key={`i-${key}-${i}`} className="italic">{match[4]}</em>)
    }
    last = match.index + match[0].length
    i++
  }
  if (last < text.length) nodes.push(<span key={`t-${key}-end`}>{text.slice(last)}</span>)
  return <span key={key}>{nodes}</span>
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
    if (line.startsWith('### ')) {
      flush()
      blocks.push({ type: 'h', items: [line.slice(4)], level: 3 })
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
