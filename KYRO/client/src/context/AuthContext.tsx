import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authService, userService } from '../services'
import { getStoredToken, setStoredToken, setUnauthorizedHandler } from '../services/api'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  /** True while the stored token is being validated on first load. */
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => Promise<void>
  /** Replaces the cached user after the server returns an updated copy. */
  setUser: (user: User) => void
  /** Re-fetches the user, e.g. after a payment changes the balance. */
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On boot, exchange any stored token for the current user. An invalid or
  // expired token simply lands the visitor on the login screen.
  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      if (!getStoredToken()) {
        setIsLoading(false)
        return
      }
      try {
        const { user: me } = await authService.me()
        if (!cancelled) setUserState(me)
      } catch {
        setStoredToken(null)
        if (!cancelled) setUserState(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  // A 401 from any request drops the session immediately.
  useEffect(() => {
    setUnauthorizedHandler(() => setUserState(null))
  }, [])

  const login = useCallback((token: string, nextUser: User) => {
    setStoredToken(token)
    setUserState(nextUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      /* signing out locally matters more than the server acknowledging it */
    }
    setStoredToken(null)
    setUserState(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const { user: fresh } = await userService.getProfile()
      setUserState(fresh)
    } catch {
      /* leave the cached user in place; the next screen will surface errors */
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      setUser: setUserState,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
