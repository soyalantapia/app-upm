import { cn } from '@/lib/cn'
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-upm-500 to-upm-700 text-white shadow-cta hover:from-upm-500 hover:to-upm-800 hover:-translate-y-0.5 hover:shadow-floating active:translate-y-0 active:scale-[0.98]',
  secondary:
    'bg-white text-upm-800 ring-1 ring-ink-100 shadow-card hover:bg-upm-50 hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0',
  ghost: 'text-upm-700 hover:bg-upm-50 active:scale-[0.98]',
  soft: 'bg-upm-50 text-upm-800 ring-1 ring-upm-100 hover:bg-upm-100 active:scale-[0.98]',
  danger:
    'bg-white text-danger-fg ring-1 ring-danger-bg shadow-card hover:bg-danger-bg/40 active:scale-[0.98]',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-[13px] gap-1.5 rounded-xl',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-2xl',
  lg: 'px-6 py-3.5 text-[15px] gap-2.5 rounded-full',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-200',
        'focus-visible:ring-2 focus-visible:ring-upm-400 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({
  className,
  children,
  interactive,
  onClick,
  onKeyDown,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  // Cards interactivas: keyboard-navigable via Enter/Space, role=button,
  // tabIndex=0 y focus visible.
  const handleKeyDown = interactive && onClick
    ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          ;(onClick as (e: React.MouseEvent<HTMLDivElement>) => void)(e as unknown as React.MouseEvent<HTMLDivElement>)
        }
        onKeyDown?.(e)
      }
    : onKeyDown

  return (
    <div
      className={cn(
        'rounded-3xl bg-white p-5 ring-1 ring-ink-100 shadow-card transition-all duration-300 ease-out',
        interactive && 'hover:-translate-y-0.5 hover:shadow-card-hover hover:ring-upm-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-upm-500',
        className,
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={interactive && onClick ? 'button' : undefined}
      tabIndex={interactive && onClick ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

export function GlassCard({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'glass rounded-3xl p-6 transition-all duration-300',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

type ChipProps = {
  active?: boolean
  className?: string
  children: ReactNode
  onClick?: () => void
  size?: 'sm' | 'md'
}

export function Chip({ active, className, children, onClick, size = 'md' }: ChipProps) {
  const isButton = Boolean(onClick)
  const Comp = isButton ? 'button' : 'span'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold transition-all duration-200',
        size === 'md' ? 'px-3.5 py-1.5 text-[13px]' : 'px-2.5 py-1 text-[11px]',
        active
          ? 'bg-gradient-to-br from-upm-500 to-upm-700 text-white shadow-cta'
          : 'bg-white text-ink-700 ring-1 ring-ink-100 hover:bg-upm-50 hover:text-upm-800 hover:ring-upm-100',
        isButton && 'cursor-pointer active:scale-[0.97]',
        className,
      )}
    >
      {children}
    </Comp>
  )
}

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'ghost'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-50 text-ink-700',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-danger-bg text-danger-fg',
  info: 'bg-info-bg text-info-fg',
  brand: 'bg-upm-50 text-upm-800',
  ghost: 'bg-white/70 text-upm-800 ring-1 ring-upm-100',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Eyebrow({ icon, children, className }: { icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full bg-upm-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-upm-700',
        className,
      )}
    >
      {icon}
      {children}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        {eyebrow}
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900 sm:text-[34px]">{title}</h1>
        {description && <p className="max-w-2xl text-[15px] leading-relaxed text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="animate-fade-in mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl bg-white px-6 py-12 text-center shadow-card ring-1 ring-ink-100">
      {icon && (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-upm-50 text-upm-600">{icon}</div>
      )}
      <div>
        <h3 className="text-base font-bold text-ink-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  const { className, ...rest } = props
  return (
    <input
      {...rest}
      className={cn(
        'w-full rounded-2xl bg-white px-4 py-3 text-[15px] text-ink-900 ring-1 ring-ink-100 shadow-card placeholder:text-ink-300',
        'focus:outline-none focus:ring-2 focus:ring-upm-400 transition-all duration-200',
        className,
      )}
    />
  )
}

export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label) return <div className={cn('h-px w-full bg-ink-100', className)} />
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="h-px flex-1 bg-ink-100" />
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-300">{label}</span>
      <div className="h-px flex-1 bg-ink-100" />
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-100 shadow-card">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-ink-900 tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[12px] text-ink-500">{hint}</div>}
    </div>
  )
}
