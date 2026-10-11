/**
 * Typed client for GET /api/dashboard.
 *
 * Sends the approved basic Bearer barrier (`VITE_UUID_CONNECTION`, public by
 * design — a request barrier, not authentication). Never falls back to
 * synthetic data on failure; callers must render the error state.
 */

import type { ApiErrorBody, DashboardApiResponse } from "@/types/dashboard-api"

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080").replace(/\/+$/, "")
const CONNECTION_TOKEN = import.meta.env.VITE_UUID_CONNECTION ?? ""

export class DashboardApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "DashboardApiError"
    this.status = status
    this.code = code
  }
}

export interface DashboardQueryParams {
  from?: string
  to?: string
  regionId?: number
  communeId?: string
}

export function buildDashboardUrl(params: DashboardQueryParams): string {
  const search = new URLSearchParams()
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  if (params.regionId !== undefined) search.set("regionId", String(params.regionId))
  if (params.communeId !== undefined) search.set("communeId", params.communeId)
  const query = search.toString()
  return `${API_BASE_URL}/api/dashboard${query ? `?${query}` : ""}`
}

export async function fetchDashboard(
  params: DashboardQueryParams,
  signal: AbortSignal,
): Promise<DashboardApiResponse> {
  let response: Response
  try {
    response = await fetch(buildDashboardUrl(params), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${CONNECTION_TOKEN}`,
      },
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new DashboardApiError(0, "NETWORK", "could not reach the dashboard API")
  }

  if (!response.ok) {
    let code = "HTTP_ERROR"
    let message = `dashboard API responded ${response.status}`
    try {
      const body = (await response.json()) as ApiErrorBody
      if (body.error?.code) code = body.error.code
      if (body.error?.message) message = body.error.message
    } catch {
      /* non-JSON error body: keep the generic message */
    }
    throw new DashboardApiError(response.status, code, message)
  }

  return (await response.json()) as DashboardApiResponse
}
