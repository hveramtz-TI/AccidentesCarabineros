/**
 * Minimal fetch hook for the single dashboard endpoint.
 *
 * Cancels the in-flight request whenever the query changes or the component
 * unmounts, and exposes explicit loading/error/data states. No server-state
 * dependency for one endpoint (KISS).
 */

import { useCallback, useEffect, useReducer, useState } from "react"

import { fetchDashboard } from "@/lib/api/dashboard"
import type { DashboardQueryParams } from "@/lib/api/dashboard"
import type { DashboardApiResponse } from "@/types/dashboard-api"

interface State {
  status: "loading" | "success" | "error"
  data: DashboardApiResponse | null
  error: string | null
}

export interface DashboardQueryState extends State {
  retry: () => void
}

type Action =
  | { type: "loading" }
  | { type: "success"; data: DashboardApiResponse }
  | { type: "error"; message: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loading":
      return { status: "loading", data: state.data, error: null }
    case "success":
      return { status: "success", data: action.data, error: null }
    case "error":
      return { status: "error", data: null, error: action.message }
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return "the dashboard request failed"
}

export function useDashboardQuery(params: DashboardQueryParams, enabled = true): DashboardQueryState {
  const [state, dispatch] = useReducer(reducer, { status: "loading", data: null, error: null })
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  const paramsKey = `${params.from ?? ""}|${params.to ?? ""}|${params.regionId ?? ""}|${params.communeId ?? ""}`

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    dispatch({ type: "loading" })
    fetchDashboard(params, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) dispatch({ type: "success", data })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        if (!controller.signal.aborted) dispatch({ type: "error", message: describeError(error) })
      })
    return () => controller.abort()
    // `paramsKey` is the primitive identity of `params`; `attempt` forces a
    // manual refetch with identical params; `enabled` gates the fetch (the
    // map query stays quiet while no territory filter narrows the scope).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, attempt, enabled])

  return { ...state, retry }
}
