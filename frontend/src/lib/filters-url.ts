/**
 * Dashboard filters as URL search params (EXP-00 T3).
 *
 * The URL is the only source of truth for filters: no global store. Values are
 * validated against the canonical territorial catalog, and anything unknown
 * falls back to the national default instead of producing a broken request.
 * A selected commune always wins over a region (the API derives the region from
 * the commune), and its parent region is normalized into the filter.
 */

import { periodOptions, regions } from "@/lib/data"
import { ALL_VALUE } from "@/types/dashboard"
import type { DashboardFilters, PeriodId } from "@/types/dashboard"

const PERIOD_IDS = periodOptions.map((option) => option.value) as string[]

const DEFAULT_FILTERS: DashboardFilters = {
  period: "all",
  region: ALL_VALUE,
  commune: ALL_VALUE,
}

/** Region roman number that owns a commune identifier, or null when unknown. */
function parentRegionOf(commune: string): string | null {
  const match = regions.find((region) => region.communes.some((c) => c.identifier === commune))
  return match ? match.romanNumber : null
}

function isKnownRegion(region: string): boolean {
  return regions.some((entry) => entry.romanNumber === region)
}

export function parseFilters(searchParams: URLSearchParams): DashboardFilters {
  const rawPeriod = searchParams.get("period")
  const period: PeriodId = rawPeriod && PERIOD_IDS.includes(rawPeriod) ? (rawPeriod as PeriodId) : DEFAULT_FILTERS.period

  const rawRegion = searchParams.get("region")
  const rawCommune = searchParams.get("commune")

  // Commune first: it wins over the region and re-derives its parent, so an
  // inconsistent pair (`?region=IX&commune=XIII-1`) still resolves to the
  // commune's real region instead of silently filtering two territories.
  if (rawCommune && rawCommune !== ALL_VALUE) {
    const owner = parentRegionOf(rawCommune)
    if (owner) return { period, region: owner, commune: rawCommune }
    return { ...DEFAULT_FILTERS, period }
  }

  if (rawRegion && rawRegion !== ALL_VALUE && isKnownRegion(rawRegion)) {
    return { period, region: rawRegion, commune: ALL_VALUE }
  }

  return { ...DEFAULT_FILTERS, period }
}

/** Serializes only the non-default filters so the bare URL stays readable. */
export function filtersToSearchParams(filters: DashboardFilters): URLSearchParams {
  const searchParams = new URLSearchParams()
  if (filters.period !== DEFAULT_FILTERS.period) searchParams.set("period", filters.period)
  if (filters.region !== ALL_VALUE) searchParams.set("region", filters.region)
  if (filters.commune !== ALL_VALUE) searchParams.set("commune", filters.commune)
  return searchParams
}
