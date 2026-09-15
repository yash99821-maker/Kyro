import axios, { AxiosError } from 'axios'

/**
 * The single axios instance every request goes through.
 *
 * Requests go to `/api`, which Vite proxies to the Express backend in
 * development. Nothing in the app talks to the database directly — every
 * read and write is an HTTP call handled here.
 */
export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

const TOKEN_KEY = 'kyro.auth.token'

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * localStorage here holds ONLY the session token (and, elsewhere, the theme
 * preference). All financial data lives in MongoDB.
 */
export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private browsing — the session simply will not survive a reload */
  }
}

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Called when the backend reports the session is no longer valid. */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      setStoredToken(null)
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)

/**
 * Turns any failure — validation error, offline backend, timeout — into a
 * message that is safe and useful to show a user.
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiMessage = (error.response?.data as { message?: string } | undefined)?.message
    if (apiMessage) return apiMessage
    if (error.code === 'ECONNABORTED') {
      return 'That took too long. Please check your connection and try again.'
    }
    if (!error.response) {
      return 'Cannot reach the KYRO server. Make sure the backend is running, then try again.'
    }
    if (error.response.status >= 500) {
      return 'Something went wrong on our side. Please try again.'
    }
  }
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong. Please try again.'
}

/** Envelope used by every KYRO API response. */
export interface ApiEnvelope<T> {
  success: boolean
  message?: string
  data: T
}

/** Unwraps `{ success, data }` so callers deal only with the payload. */
export async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const response = await promise
  return response.data.data
}
