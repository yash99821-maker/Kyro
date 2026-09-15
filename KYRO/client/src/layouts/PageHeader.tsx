import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Standard header for every secondary page: back button, title, optional
 * subtitle and a slot for an action on the right.
 */
export default function PageHeader({
  title,
  subtitle,
  action,
  onBack,
  variant = 'plain',
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  onBack?: () => void
  variant?: 'plain' | 'navy'
}) {
  const navigate = useNavigate()
  const isNavy = variant === 'navy'

  return (
    <header
      className={`safe-top sticky top-0 z-30 px-4 pb-4 ${
        isNavy ? 'kyro-gradient text-white' : 'border-b border-app bg-card/95 backdrop-blur'
      }`}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <button
          onClick={() => (onBack ? onBack() : navigate(-1))}
          aria-label="Go back"
          className={`focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
            isNavy ? 'bg-white/10 text-white hover:bg-white/20' : 'text-strong hover:bg-muted'
          }`}
        >
          <ArrowLeft size={19} />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className={`truncate text-base font-bold ${isNavy ? 'text-white' : 'text-strong'}`}>
            {title}
          </h1>
          {subtitle && (
            <p className={`truncate text-xs ${isNavy ? 'text-white/70' : 'text-soft'}`}>
              {subtitle}
            </p>
          )}
        </div>

        {action}
      </div>
    </header>
  )
}

/** Constrains page content and keeps consistent gutters at every breakpoint. */
export function PageBody({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`mx-auto w-full max-w-3xl px-4 py-5 ${className}`}>{children}</div>
  )
}
