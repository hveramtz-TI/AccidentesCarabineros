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

/** Filter params shared by every dashboard-family endpoint (same wire schema). */
function buildSearch(params: DashboardQueryParams): string {
  const search = new URLSearchParams()
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  if (params.regionId !== undefined) search.set("regionId", String(params.regionId))
  if (params.communeId !== undefined) search.set("communeId", params.communeId)
  return search.toString()
}

export function buildDashboardUrl(params: DashboardQueryParams): string {
  const query = buildSearch(params)
  return `${API_BASE_URL}/api/dashboard${query ? `?${query}` : ""}`
}

/**
 * GET /api/dashboard/export.csv (EXP-06): the territory CSV carries exactly the
 * same filter params as the JSON dashboard request.
 */
export function buildDashboardExportUrl(params: DashboardQueryParams): string {
  const query = buildSearch(params)
  return `${API_BASE_URL}/api/dashboard/export.csv${query ? `?${query}` : ""}`
}

/**
 * Request barrier headers for the dashboard API. The token stays module-private
 * so no caller can accidentally render or log it (EXP-06 download path).
 */
export function dashboardRequestHeaders(accept: string): Record<string, string> {
  return {
    Accept: accept,
    Authorization: `Bearer ${CONNECTION_TOKEN}`,
  }
}

export async function fetchDashboard(
  params: DashboardQueryParams,
  signal: AbortSignal,
): Promise<DashboardApiResponse> {
  let response: Response
  try {
    response = await fetch(buildDashboardUrl(params), {
      method: "GET",
      headers: dashboardRequestHeaders("application/json"),
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
