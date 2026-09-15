import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../services/api'

interface ApiResource<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  /** Re-runs the fetcher; used by retry buttons and after mutations. */
  reload: () => Promise<void>
  setData: (value: T) => void
}

/**
 * Loads data from the API with consistent loading / error / retry handling,
 * so every screen gets skeletons and a friendly error state for free.
 *
 * Pass a `deps` array exactly as you would to useEffect — the fetcher re-runs
 * whenever it changes.
 */
export function useApiResource<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: { enabled?: boolean } = {},
): ApiResource<T> {
  const enabled = options.enabled ?? true

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  // Keeps the latest fetcher without making it a dependency of `load`.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  // Guards against a slow earlier request overwriting a newer result.
  const requestId = useRef(0)

  const load = useCallback(async () => {
    if (!enabled) return
    const id = ++requestId.current
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetcherRef.current()
      if (id === requestId.current) setData(result)
    } catch (err) {
      if (id === requestId.current) setError(getErrorMessage(err))
    } finally {
      if (id === requestId.current) setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps])

  return { data, isLoading, error, reload: load, setData }
}
