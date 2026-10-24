/**
 * Typed client for GET /api/meta (EXP-01).
 *
 * Same protected read path as the dashboard client: `VITE_UUID_CONNECTION` is
 * the public request barrier, never user authentication. The page renders the
 * endpoint's counts and caveats as-is and has no synthetic fallback, so a
 * failure must surface through the shared error state.
 */

import type { ApiErrorBody } from "@/types/dashboard-api"

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080").replace(/\/+$/, "")
const CONNECTION_TOKEN = import.meta.env.VITE_UUID_CONNECTION ?? ""

/** Mirrors backend/src/types/meta-api.ts — keep both in sync. */
export interface MetaApiResponse {
  schemaVersion: 1
  source: "carabineros-2025-normalized"
  synthetic: false
  coverage: { from: string; to: string }
  rowCounts: { siniestros: number; personas: number; vehiculos: number }
  caveats: string[]
  generatedAt: string
}

export class MetaApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "MetaApiError"
    this.status = status
    this.code = code
  }
}

export async function fetchMeta(signal: AbortSignal): Promise<MetaApiResponse> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/meta`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${CONNECTION_TOKEN}`,
      },
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new MetaApiError(0, "NETWORK", "could not reach the metadata API")
  }

  if (!response.ok) {
    let code = "HTTP_ERROR"
    let message = `metadata API responded ${response.status}`
    try {
      const body = (await response.json()) as ApiErrorBody
      if (body.error?.code) code = body.error.code
      if (body.error?.message) message = body.error.message
    } catch {
      /* non-JSON error body: keep the generic message */
    }
    throw new MetaApiError(response.status, code, message)
  }

  return (await response.json()) as MetaApiResponse
}
