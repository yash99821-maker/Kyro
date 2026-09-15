import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  tone: ToastTone
}

interface UiContextValue {
  toasts: Toast[]
  showToast: (message: string, tone?: ToastTone) => void
  dismissToast: (id: string) => void
  isDark: boolean
  toggleTheme: () => void
}

const UiContext = createContext<UiContextValue | null>(null)

const THEME_KEY = 'kyro.theme'

/** Theme preference is a UI setting, so localStorage is the right home for it. */
function readStoredTheme(): boolean {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark') return true
    if (stored === 'light') return false
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isDark, setIsDark] = useState(readStoredTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light')
    } catch {
      /* ignore */
    }
  }, [isDark])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((current) => [...current, { id, message, tone }])
      window.setTimeout(() => dismissToast(id), 3800)
    },
    [dismissToast],
  )

  const value = useMemo<UiContextValue>(
    () => ({
      toasts,
      showToast,
      dismissToast,
      isDark,
      toggleTheme: () => setIsDark((v) => !v),
    }),
    [toasts, showToast, dismissToast, isDark],
  )

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi(): UiContextValue {
  const context = useContext(UiContext)
  if (!context) throw new Error('useUi must be used inside <UiProvider>')
  return context
}
