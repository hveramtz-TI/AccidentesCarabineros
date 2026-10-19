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
    // Mobile-first stack (map block then filters/KPIs); the approved
    // desktop 50/50 absolute layout is restored from lg up. The previous
    // all-widths absolute container was the known mobile-stacking
    // regression carried from the map-placeholder slice.
    <section className="flex w-full flex-col gap-4 lg:relative lg:h-dvh lg:gap-0">
      <div className="h-[60dvh] w-full lg:absolute lg:inset-y-0 lg:left-10 lg:h-full lg:w-1/2">
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
      <div className="flex w-full flex-col gap-4 lg:absolute lg:inset-y-0 lg:right-10 lg:w-1/2 lg:py-2">
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
