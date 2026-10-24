/**
 * Shared dashboard workspace data (EXP-02 T2).
 *
 * The Panel and the Mapas page read exactly the same thing, so the request rule
 * lives here once: one filtered dashboard query, plus one quiet national query
 * for the choropleth colors only when a territory filter is active. Keeping it
 * in one place prevents the two pages from ever disagreeing about which series
 * drives the map.
 */

import { useMemo } from "react"

import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import type { DashboardQueryState } from "@/hooks/use-dashboard-query"
import { filtersToQueryParams } from "@/lib/dashboard-query"
import { ALL_VALUE } from "@/types/dashboard"
import type { DashboardFilters, RegionSeriesState, TerritoryRow } from "@/types/dashboard"

export interface DashboardWorkspace {
  query: DashboardQueryState
  /** Full national region series for the active period, driving the map bins. */
  regionSeries: TerritoryRow[] | null
  /** Honest series state: loading/error/missing never collapse into "no data". */
  regionSeriesState: RegionSeriesState
  loading: boolean
}

export function useDashboardWorkspace(filters: DashboardFilters): DashboardWorkspace {
  const params = useMemo(() => filtersToQueryParams(filters), [filters])
  const query = useDashboardQuery(params)

  const territoryFilterActive = filters.region !== ALL_VALUE || filters.commune !== ALL_VALUE
  const mapParams = useMemo(
    () => filtersToQueryParams({ period: filters.period, region: ALL_VALUE, commune: ALL_VALUE }),
    [filters.period],
  )
  const mapQuery = useDashboardQuery(mapParams, territoryFilterActive)
  const seriesQuery = territoryFilterActive ? mapQuery : query
  const regionSeries = seriesQuery.data?.territories.all ?? null
  const regionSeriesState: RegionSeriesState =
    seriesQuery.status === "loading" && !seriesQuery.data
      ? "loading"
      : seriesQuery.status === "error"
        ? "error"
        : seriesQuery.data?.territories.all
          ? "ready"
          : "missing-series"

  return {
    query,
    regionSeries,
    regionSeriesState,
    loading: query.status === "loading" && !query.data,
  }
}
