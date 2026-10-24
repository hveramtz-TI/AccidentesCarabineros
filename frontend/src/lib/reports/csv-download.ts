/**
 * Territory CSV download for `/informes` (EXP-06 T4).
 *
 * The export endpoint is Bearer-protected, so a plain anchor would 401: the
 * file is fetched with the same request barrier the dashboard JSON uses, read
 * as a blob, and handed to the browser through a temporary object URL that is
 * revoked immediately after the click. The token itself never reaches the UI.
 */

import { buildDashboardExportUrl, dashboardRequestHeaders } from "@/lib/api/dashboard"
import { filtersToQueryParams } from "@/lib/dashboard-query"
import type { DashboardFilters } from "@/types/dashboard"

/** Fixed server-side filename (L2 contract): no date stamp. */
export const TERRITORY_CSV_FILENAME = "accidentes-2025-territorios.csv"

export type TerritoryCsvFailureReason = "auth" | "unavailable" | "network"

export class TerritoryCsvError extends Error {
  readonly reason: TerritoryCsvFailureReason

  constructor(reason: TerritoryCsvFailureReason, message: string) {
    super(message)
    this.name = "TerritoryCsvError"
    this.reason = reason
  }
}

/** Fetches the filtered territory CSV and triggers the browser download. */
export async function downloadTerritoryCsv(filters: DashboardFilters): Promise<void> {
  const url = buildDashboardExportUrl(filtersToQueryParams(filters))

  let response: Response
  try {
    response = await fetch(url, {
      method: "GET",
      headers: dashboardRequestHeaders("text/csv"),
    })
  } catch {
    throw new TerritoryCsvError("network", "the territory CSV request failed")
  }

  if (!response.ok) {
    const reason: TerritoryCsvFailureReason =
      response.status === 401 || response.status === 403 ? "auth" : "unavailable"
    throw new TerritoryCsvError(reason, `territory CSV API responded ${response.status}`)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = TERRITORY_CSV_FILENAME
  anchor.rel = "noopener"
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
