import { useMemo } from "react"

import type { DashboardQueryState } from "@/hooks/use-dashboard-query"
import { adaptDashboardResponse } from "@/lib/dashboard-adapter"
import type { DashboardFilters, RegionSeriesState, TerritoryRow } from "@/types/dashboard"
import ContainerDashboardCharts from "../Sections/containerDashboardCharts"
import ContainerMapFilter from "../Sections/containerMapFilter"
import DashboardStatus from "./dashboard-status"

interface Props {
  query: DashboardQueryState
  filters: DashboardFilters
  onFiltersChange: (next: DashboardFilters) => void
  regionSeries: TerritoryRow[] | null
  regionSeriesState: RegionSeriesState
}

export default function DashboardView({ query, filters, onFiltersChange, regionSeries, regionSeriesState }: Props) {
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

      <section aria-labelledby="dashboard-overview-title" className="min-w-0">
        <h2
          id="dashboard-overview-title"
          className="mb-4 border-b border-border/70 pb-3 font-heading text-lg font-semibold text-foreground"
        >
          Mapa e indicadores
        </h2>
        <ContainerMapFilter
          filters={filters}
          onFiltersChange={onFiltersChange}
          data={data}
          loading={query.status === "loading" && !data}
          regionSeries={regionSeries}
          regionSeriesState={regionSeriesState}
        />
      </section>

      <section
        aria-labelledby="dashboard-analysis-title"
        className="min-w-0 space-y-4 border-t border-border/70 pt-6"
      >
        <h2
          id="dashboard-analysis-title"
          className="font-heading text-lg font-semibold text-foreground"
        >
          Tendencia y gravedad
        </h2>
        <ContainerDashboardCharts data={data} />
      </section>
    </div>
  )
}
