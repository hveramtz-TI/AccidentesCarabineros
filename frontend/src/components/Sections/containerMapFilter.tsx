/**
 * Panel map workspace: the reusable `MapExplorer` with KPI cards in the aside
 * slot (EXP-02 T2). This file keeps the Panel composition so `/` renders exactly
 * what it rendered before the extraction.
 */

import KpiCards from '../dashboard/kpi-cards'
import MapExplorer from '@/components/map/map-explorer'
import type { DashboardData, DashboardFilters, RegionSeriesState, TerritoryRow } from '@/types/dashboard'

type Props = {
  filters: DashboardFilters
  onFiltersChange: (next: DashboardFilters) => void
  data: DashboardData | null
  loading: boolean
  /** Full national region series (period view) driving the choropleth. */
  regionSeries: TerritoryRow[] | null
  regionSeriesState: RegionSeriesState
}

const ContainerMapFilter = (props: Props) => {
  return (
    <MapExplorer
      filters={props.filters}
      onFiltersChange={props.onFiltersChange}
      regionSeries={props.regionSeries}
      regionSeriesState={props.regionSeriesState}
      aside={
        <KpiCards
          kpis={props.data?.kpis ?? null}
          monthlyTrend={props.data?.monthlyTrend ?? []}
          loading={props.loading}
        />
      }
    />
  )
}

export default ContainerMapFilter
