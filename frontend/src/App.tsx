import { useMemo, useState } from "react"
import DashboardView from "@/components/dashboard/dashboard-view"
import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import { filtersToQueryParams } from "@/lib/dashboard-query"
import Layout from "@/layout/Layout"
import { ALL_VALUE } from "@/types/dashboard"
import type { DashboardFilters } from "@/types/dashboard"

function App() {
  const [filters, setFilters] = useState<DashboardFilters>({
    period: "all",
    region: ALL_VALUE,
    commune: ALL_VALUE,
  })

  const params = useMemo(() => filtersToQueryParams(filters), [filters])
  const query = useDashboardQuery(params)

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
  const regionSeries = (territoryFilterActive ? mapQuery.data : query.data)?.territories.all ?? null

  return (
    <Layout>
      <DashboardView
        query={query}
        filters={filters}
        onFiltersChange={setFilters}
        regionSeries={regionSeries}
      />
    </Layout>
  )
}

export default App
