import { cn } from '@/lib/cn'

export function SouthAmericaBackdrop({
  className,
  tone = 'light',
}: {
  className?: string
  tone?: 'light' | 'dark'
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute select-none',
        tone === 'dark' ? 'text-upm-200/40' : 'text-upm-700/15',
        className,
      )}
    >
      <svg viewBox="0 0 600 800" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
          <path d="M295 60 L335 70 L370 95 L395 130 L420 155 L445 180 L460 215 L470 250 L478 290 L482 335 L490 380 L500 420 L505 460 L498 500 L478 535 L455 565 L425 595 L395 625 L370 655 L355 690 L342 720 L320 745 L295 760 L270 750 L255 720 L248 685 L260 650 L268 615 L255 585 L228 560 L195 540 L168 515 L150 485 L138 450 L132 410 L125 370 L120 330 L130 295 L155 265 L180 235 L200 200 L218 165 L240 130 L265 100 Z" />
          <path d="M210 250 Q260 290 310 320 T420 380" strokeDasharray="3 6" opacity="0.6" />
          <path d="M280 600 Q300 640 320 670" strokeDasharray="3 6" opacity="0.6" />
        </g>
        <g fill="currentColor">
          {[
            [285, 280], [220, 380], [320, 500], [370, 425],
            [345, 555], [290, 540], [245, 195], [200, 265],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="3.5" />
          ))}
        </g>
        <g stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.7">
          <line x1="245" y1="195" x2="200" y2="265" />
          <line x1="200" y1="265" x2="285" y2="280" />
          <line x1="285" y1="280" x2="370" y2="425" />
          <line x1="285" y1="280" x2="290" y2="540" />
          <line x1="370" y1="425" x2="345" y2="555" />
          <line x1="290" y1="540" x2="320" y2="500" />
          <line x1="320" y1="500" x2="345" y2="555" />
          <line x1="220" y1="380" x2="320" y2="500" />
        </g>
      </svg>
    </div>
  )
}
