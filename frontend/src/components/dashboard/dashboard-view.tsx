import { useMemo } from "react"

import type { DashboardQueryState } from "@/hooks/use-dashboard-query"
import { adaptDashboardResponse } from "@/lib/dashboard-adapter"
import type { DashboardFilters, TerritoryRow } from "@/types/dashboard"
import ContainerDashboardCharts from "../Sections/containerDashboardCharts"
import ContainerMapFilter from "../Sections/containerMapFilter"
import DashboardStatus from "./dashboard-status"

interface Props {
  query: DashboardQueryState
  filters: DashboardFilters
  onFiltersChange: (next: DashboardFilters) => void
  regionSeries: TerritoryRow[] | null
  regionSeriesLoading: boolean
}

export default function DashboardView({ query, filters, onFiltersChange, regionSeries, regionSeriesLoading }: Props) {
  const data = useMemo(
    () => (query.data ? adaptDashboardResponse(query.data) : null),
    [query.data],
  )

  return (
    <div className="flex w-full flex-col gap-4 p-4 md:p-10">
      <DashboardStatus
        status={query.status}
        error={query.error}
        emptyScope={data?.emptyScope ?? false}
        onRetry={query.retry}
      />

      <ContainerMapFilter
        filters={filters}
        onFiltersChange={onFiltersChange}
        data={data}
        loading={query.status === "loading" && !data}
        regionSeries={regionSeries}
        regionSeriesLoading={regionSeriesLoading}
      />

      <ContainerDashboardCharts data={data} />
    </div>
  )
}
