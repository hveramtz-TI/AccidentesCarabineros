/**
 * Dashboard-facing wrapper over the shared abortable query hook.
 *
 * Keeps the original public shape (`useDashboardQuery(params, enabled)`) so the
 * panel, the map's quiet national series, and their tests are untouched; only
 * the transport logic moved to `useApiQuery`. No server-state dependency for a
 * single endpoint (KISS).
 */

import { useApiQuery } from "@/hooks/use-api-query"
import type { ApiQueryState } from "@/hooks/use-api-query"
import { fetchDashboard } from "@/lib/api/dashboard"
import type { DashboardQueryParams } from "@/lib/api/dashboard"
import type { DashboardApiResponse } from "@/types/dashboard-api"

export type DashboardQueryState = ApiQueryState<DashboardApiResponse>

export function useDashboardQuery(params: DashboardQueryParams, enabled = true): DashboardQueryState {
  // Primitive identity of the request: any filter change starts a new query and
  // aborts the previous one.
  const key = `${params.from ?? ""}|${params.to ?? ""}|${params.regionId ?? ""}|${params.communeId ?? ""}`

  return useApiQuery((signal) => fetchDashboard(params, signal), key, {
    enabled,
    fallbackError: "the dashboard request failed",
  })
}
