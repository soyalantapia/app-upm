import { type VigenciaInfo, VIGENCIA_META } from '@/lib/vigencia'

export function VigenciaBadge({ info, compact }: { info: VigenciaInfo; compact?: boolean }) {
  const meta = VIGENCIA_META[info.status]
  const colorClass =
    info.status === 'activa'
      ? 'bg-success-bg/60 text-success-fg ring-success-bg'
      : info.status === 'latente'
        ? 'bg-warning-bg/40 text-warning-fg ring-warning-bg'
        : info.status === 'en-revision'
          ? 'bg-upm-50 text-upm-700 ring-upm-100'
          : 'bg-ink-100 text-ink-700 ring-ink-200'

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ring-1 ${colorClass}`}
        title={info.reasons.join(' · ')}
      >
        <span>{meta.emoji}</span>
        <span>{meta.label}</span>
        {info.score > 0 && info.status === 'activa' && (
          <span className="tabular-nums opacity-70">{info.score}</span>
        )}
      </span>
    )
  }

  return (
    <div className={`flex flex-col gap-1 rounded-2xl px-3 py-2 ring-1 ${colorClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em]">
          <span>{meta.emoji}</span>
          <span>Vigencia · {meta.label}</span>
        </span>
        {info.score > 0 && (
          <span className="text-[11px] font-bold tabular-nums opacity-80">Score {info.score}</span>
        )}
      </div>
      {info.reasons.length > 0 && (
        <ul className="text-[11.5px] font-medium leading-relaxed">
          {info.reasons.map((r, i) => (
            <li key={`r-${i}`} className="flex items-start gap-1.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
