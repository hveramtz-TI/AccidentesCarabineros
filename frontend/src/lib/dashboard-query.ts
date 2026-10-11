/**
 * Maps dashboard UI filters to GET /api/dashboard query parameters.
 *
 * The API only understands explicit 2025 date ranges plus numeric region /
 * identifier commune filters; presets (all/q1..q4) are a client concern.
 */

import catalogJson from "@/data/oversio-identifiers.json"
import type { DashboardQueryParams } from "@/lib/api/dashboard"
import { ALL_VALUE } from "@/types/dashboard"
import type { DashboardFilters, PeriodId } from "@/types/dashboard"
import type { TerritoryCatalog } from "@/types/dashboard"

const catalog = catalogJson as unknown as TerritoryCatalog

const PERIOD_RANGES: Record<PeriodId, { from: string; to: string }> = {
  all: { from: "2025-01-01", to: "2025-12-31" },
  q1: { from: "2025-01-01", to: "2025-03-31" },
  q2: { from: "2025-04-01", to: "2025-06-30" },
  q3: { from: "2025-07-01", to: "2025-09-30" },
  q4: { from: "2025-10-01", to: "2025-12-31" },
}

export function filtersToQueryParams(filters: DashboardFilters): DashboardQueryParams {
  const { from, to } = PERIOD_RANGES[filters.period]
  const params: DashboardQueryParams = { from, to }

  // The API derives the region from the commune, so a selected commune wins.
  if (filters.commune !== ALL_VALUE) {
    params.communeId = filters.commune
  } else if (filters.region !== ALL_VALUE) {
    const region = catalog.regions.find((r) => r.romanNumber === filters.region)
    if (region) params.regionId = Number(region.number)
  }

  return params
}
