/**
 * Typed client for GET /api/compare (EXP-07 T4/T6).
 *
 * Same request barrier as the other dashboard-family endpoints
 * (`VITE_UUID_CONNECTION` is a public barrier by design, never printed). The
 * comparator is fetched ONLY when the user selects codes: an empty selection
 * never reaches the API (`codes` is required server-side too).
 */

export interface CompareMonthPoint {
  /** `YYYY-MM`; dense over the requested period, zero months included. */
  month: string
  accidents: number
  fatalities: number
}

export interface CompareTerritoryTotals {
  accidents: number
  fatalities: number
  /** Percent over the SCOPE total (never renormalized to the selection). */
  share: number
}

export interface CompareTerritoryEntry {
  /** Catalog identifier: region roman (`XIII`) or commune (`XIII-1`). */
  code: string
  name: string
  totals: CompareTerritoryTotals
  trend: CompareMonthPoint[]
}

export interface CompareFilters {
  from: string
  to: string
  regionId: number | null
  communeId: string | null
}

export interface CompareApiResponse {
  schemaVersion: 1
  meta: { generatedAt: string }
  level: "region" | "commune"
  period: { from: string; to: string }
  filters: CompareFilters
  territories: CompareTerritoryEntry[]
}

export interface CompareQueryParams {
  from?: string
  to?: string
  regionId?: number
  communeId?: string
  /** De-duplicated 1..4 codes; the client sends them comma-joined. */
  codes: string[]
}

interface ApiErrorBody {
  error?: { code?: string; message?: string }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080").replace(/\/+$/, "")
const CONNECTION_TOKEN = import.meta.env.VITE_UUID_CONNECTION ?? ""

export class CompareApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "CompareApiError"
    this.status = status
    this.code = code
  }
}

export function buildCompareUrl(params: CompareQueryParams): string {
  const search = new URLSearchParams()
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  if (params.regionId !== undefined) search.set("regionId", String(params.regionId))
  if (params.communeId !== undefined) search.set("communeId", params.communeId)
  search.set("codes", params.codes.join(","))
  return `${API_BASE_URL}/api/compare?${search.toString()}`
}

export async function fetchCompare(
  params: CompareQueryParams,
  signal: AbortSignal,
): Promise<CompareApiResponse> {
  let response: Response
  try {
    response = await fetch(buildCompareUrl(params), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${CONNECTION_TOKEN}`,
      },
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new CompareApiError(0, "NETWORK", "could not reach the comparator API")
  }

  if (!response.ok) {
    let code = "HTTP_ERROR"
    let message = `comparator API responded ${response.status}`
    try {
      const body = (await response.json()) as ApiErrorBody
      if (body.error?.code) code = body.error.code
      if (body.error?.message) message = body.error.message
    } catch {
      /* non-JSON error body: keep the generic message */
    }
    throw new CompareApiError(response.status, code, message)
  }

  return (await response.json()) as CompareApiResponse
}
