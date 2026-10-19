import RegionMap from '../dashboard/region-map'
import DashboardFiltersBar from '../dashboard/dashboard-filters'
import type { DashboardData, DashboardFilters, TerritoryRow } from '@/types/dashboard'
import { ALL_VALUE } from '@/types/dashboard'
import KpiCards from '../dashboard/kpi-cards'

type Props = {
  filters: DashboardFilters
  onFiltersChange: (next: DashboardFilters) => void
  data: DashboardData | null
  loading: boolean
  /** Full national region series (period view) driving the choropleth. */
  regionSeries: TerritoryRow[] | null
}

const ContainerMapFilter = (props: Props) => {
  return (
    <section className="relative h-dvh w-full">
      <div className="absolute inset-y-0 left-4 w-1/2 sm:left-6 lg:left-10">
        <RegionMap
          series={props.regionSeries}
          activeRegion={props.filters.region}
          onSelectRegion={(romanNumber) =>
            // Same cascade contract as the Region dropdown: a region click
            // clears the commune; clicking the active region toggles it off.
            props.onFiltersChange({
              ...props.filters,
              region: romanNumber ?? ALL_VALUE,
              commune: ALL_VALUE,
            })
          }
        />
      </div>
      <div className="absolute inset-y-0 right-4 flex w-1/2 flex-col gap-4 py-2 sm:right-6 lg:right-10">
        <div className="glass-card shrink-0 p-4">
          <DashboardFiltersBar
            filters={props.filters}
            onChange={props.onFiltersChange}
          />
        </div>
        <div className="min-h-0 flex-1">
          <KpiCards kpis={props.data?.kpis ?? null} monthlyTrend={props.data?.monthlyTrend ?? []} loading={props.loading} />
        </div>
      </div>
    </section>
  )
}

export default ContainerMapFilter
