import MapPlaceholder from '../dashboard/map-placeholder'
import DashboardFiltersBar from '../dashboard/dashboard-filters'
import type { DashboardData, DashboardFilters } from '@/types/dashboard'
import KpiCards from '../dashboard/kpi-cards'

type Props = {
  filters: DashboardFilters
  onFiltersChange: (next: DashboardFilters) => void
  data: DashboardData
}

const ContainerMapFilter = (props: Props) => {
  return (
    <section className="h-dvh w-auto flex flex-row">
        <div className="absolute flex-col w-[55%] left-10">
          <MapPlaceholder />
        </div>
        <div className="absolute flex flex-col h-full gap-4 w-[50%] right-10 py-2">
          <div className="glass-card shrink-0 p-4">
            <DashboardFiltersBar
              filters={props.filters}
              onChange={props.onFiltersChange}
            />
          </div>
          <div className="min-h-0 flex-1 [&>section]:xl:grid-cols-2! [&>section]:xl:grid-rows-2!">
            <KpiCards kpis={props.data.kpis} monthlyTrend={props.data.monthlyTrend} />
          </div>
        </div>
    </section>
  )
}

export default ContainerMapFilter