/**
 * Shared abortable query hook for the protected read-only API (EXP-00 T6).
 *
 * Every dashboard-family page needs the same three states and the same
 * cancellation rule: a request in flight is aborted when the query key changes
 * or the component unmounts, and an aborted response never overwrites a newer
 * one. `key` is the primitive identity of the request (built by the caller), so
 * the fetcher closure can stay inline without re-triggering the effect.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from "react"

export interface ApiQueryState<T> {
  status: "loading" | "success" | "error"
  data: T | null
  error: string | null
  retry: () => void
}

export interface ApiQueryOptions {
  /** Skip the request entirely (e.g. a secondary query that is not needed yet). */
  enabled?: boolean
  /** Message shown when the thrown error carries none. */
  fallbackError?: string
}

interface State<T> {
  status: "loading" | "success" | "error"
  data: T | null
  error: string | null
}

type Action<T> = { type: "loading" } | { type: "success"; data: T } | { type: "error"; message: string }

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case "loading":
      // Keep the previous data while refetching the same page: filters change
      // one at a time and a blank chart per keystroke reads as a failure.
      return { status: "loading", data: state.data, error: null }
    case "success":
      return { status: "success", data: action.data, error: null }
    case "error":
      return { status: "error", data: null, error: action.message }
  }
}

function describeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function useApiQuery<T>(
  load: (signal: AbortSignal) => Promise<T>,
  key: string,
  options: ApiQueryOptions = {},
): ApiQueryState<T> {
  const { enabled = true, fallbackError = "the request failed" } = options
  const [state, dispatch] = useReducer(reducer<T>, { status: "loading", data: null, error: null })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((current) => current + 1), [])

  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    dispatch({ type: "loading" })
    loadRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) dispatch({ type: "success", data })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        if (!controller.signal.aborted) dispatch({ type: "error", message: describeError(error, fallbackError) })
      })
    return () => controller.abort()
  }, [key, attempt, enabled, fallbackError])

  return { ...state, retry }
}
