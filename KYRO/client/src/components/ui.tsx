import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'

/* ============================ BUTTON ============================ */

type ButtonVariant = 'primary' | 'accent' | 'ghost' | 'outline' | 'danger' | 'save'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  isLoading?: boolean
  fullWidth?: boolean
  icon?: ReactNode
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-navy-800 text-white hover:bg-navy-700 shadow-lg shadow-navy-900/20',
  accent: 'bg-kyro-500 text-white hover:bg-kyro-600 shadow-lg shadow-kyro-500/25',
  save: 'bg-mint-600 text-white hover:bg-mint-700 shadow-lg shadow-mint-600/25',
  ghost: 'bg-muted text-strong hover:opacity-80',
  outline: 'border border-app text-strong hover:bg-muted',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20',
}

export function Button({
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  icon,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      // Disabling while a request is in flight is what stops a double-click
      // from submitting the same payment twice.
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold
        transition-all active:scale-[0.97] focus-ring
        disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100
        ${VARIANT_CLASSES[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {isLoading ? <Loader2 size={17} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

/* ============================ INPUTS ============================ */

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string
  hint?: string
  error?: string
  prefix?: ReactNode
}

export function Field({ label, hint, error, prefix, id, className = '', ...rest }: FieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className="w-full">
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-soft">
        {label}
      </label>
      <div
        className={`flex items-center gap-2 rounded-2xl border bg-card px-4 transition-colors
          ${error ? 'border-red-400' : 'border-app focus-within:border-kyro-400'}`}
      >
        {prefix && <span className="shrink-0 text-sm text-soft">{prefix}</span>}
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full bg-transparent py-3.5 text-sm text-strong outline-none placeholder:text-soft/60 ${className}`}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs font-medium text-red-500">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-soft">{hint}</p>
      ) : null}
    </div>
  )
}

/* ============================ STATES ============================ */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden="true" />
}

/** Standard "we are loading a list" placeholder. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="kyro-card flex items-center gap-3 p-4">
          <Skeleton className="h-11 w-11 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-app px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-soft">
        {icon}
      </div>
      <h3 className="text-base font-bold text-strong">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-soft">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900/50 dark:bg-red-950/30"
    >
      <AlertTriangle size={30} className="mb-3 text-red-500" />
      <h3 className="text-base font-bold text-strong">Something went wrong</h3>
      <p className="mt-1.5 max-w-sm text-sm text-soft">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" icon={<RefreshCw size={15} />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/* ============================ MISC ============================ */

export function Avatar({
  name,
  size = 44,
  color,
  image,
}: {
  name: string
  size?: number
  color: string
  image?: string
}) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-2xl object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-2xl font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
    >
      {name}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'success' | 'danger' | 'warning' | 'neutral' | 'accent'
}) {
  const tones = {
    success: 'bg-mint-100 text-mint-700 dark:bg-mint-500/15 dark:text-mint-300',
    danger: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    accent: 'bg-kyro-100 text-kyro-700 dark:bg-kyro-500/15 dark:text-kyro-200',
    neutral: 'bg-muted text-soft',
  }
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  )
}

/** Section heading with an optional right-hand action. */
export function SectionHeader({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-bold text-strong">{title}</h2>
      {action}
    </div>
  )
}

/** Small banner reminding viewers that this is a simulation. */
export function DemoNotice({ className = '' }: { className?: string }) {
  return (
    <p className={`text-center text-[11px] leading-relaxed text-soft ${className}`}>
      Demo project · Payments are simulated and no real money is transferred.
    </p>
  )
}
