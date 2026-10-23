/**
 * Panel page (`/`) — the original dashboard composition (EXP-00 T1/T3).
 *
 * Filters now come from the URL instead of component state, so a deep link, a
 * refresh, and back/forward all restore the same view. The data flow is
 * unchanged: one dashboard query plus, only when a territory filter is active,
 * one quiet national query that feeds the choropleth.
 */

import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"

import DashboardView from "@/components/dashboard/dashboard-view"
import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import { usePageEffects, pageTitle } from "@/hooks/use-page-effects"
import { filtersToQueryParams } from "@/lib/dashboard-query"
import { filtersToSearchParams, parseFilters } from "@/lib/filters-url"
import { ALL_VALUE } from "@/types/dashboard"
import type { DashboardFilters, RegionSeriesState } from "@/types/dashboard"

export default function DashboardPage() {
  usePageEffects(pageTitle())

  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(searchParams), [searchParams])

  const params = useMemo(() => filtersToQueryParams(filters), [filters])
  const query = useDashboardQuery(params)

  // Every filter change writes the URL and pushes a history entry, so the
  // browser back button walks the filter states the user actually selected.
  const onFiltersChange = useCallback(
    (next: DashboardFilters) => setSearchParams(filtersToSearchParams(next)),
    [setSearchParams],
  )

  // The choropleth always shows the national series for the active period
  // (S3/S4). While no territory filter narrows the main response it already
  // carries that series, so no second request is made; with a region/commune
  // selected a quiet national query feeds the map colors only.
  const territoryFilterActive = filters.region !== ALL_VALUE || filters.commune !== ALL_VALUE
  const mapParams = useMemo(
    () => filtersToQueryParams({ period: filters.period, region: ALL_VALUE, commune: ALL_VALUE }),
    [filters.period],
  )
  const mapQuery = useDashboardQuery(mapParams, territoryFilterActive)
  const seriesQuery = territoryFilterActive ? mapQuery : query
  const regionSeries = seriesQuery.data?.territories.all ?? null
  // Honest state machine (ODD T1): loading, error, a response without
  // territories.all (older deployment), and a loaded series never collapse
  // into one another — "no data for this period" only means a loaded series
  // that genuinely lacks the region row.
  const regionSeriesState: RegionSeriesState =
    seriesQuery.status === "loading" && !seriesQuery.data
      ? "loading"
      : seriesQuery.status === "error"
        ? "error"
        : seriesQuery.data?.territories.all
          ? "ready"
          : "missing-series"

  return (
    <DashboardView
      query={query}
      filters={filters}
      onFiltersChange={onFiltersChange}
      regionSeries={regionSeries}
      regionSeriesState={regionSeriesState}
    />
  )
}
