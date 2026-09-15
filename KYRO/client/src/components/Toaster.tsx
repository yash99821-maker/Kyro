import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useUi } from '../context/UiContext'

const ICONS = {
  success: <CheckCircle2 size={19} className="shrink-0 text-mint-500" />,
  error: <XCircle size={19} className="shrink-0 text-red-500" />,
  info: <Info size={19} className="shrink-0 text-kyro-500" />,
}

export default function Toaster() {
  const { toasts, dismissToast } = useUi()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-fade-up pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-app bg-card px-4 py-3 shadow-xl"
        >
          {ICONS[toast.tone]}
          <span className="flex-1 text-sm font-medium text-strong">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="focus-ring rounded-lg p-1 text-soft transition-colors hover:bg-muted"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}
