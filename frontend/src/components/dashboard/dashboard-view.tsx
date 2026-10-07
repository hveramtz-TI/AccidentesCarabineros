import type { DashboardData, DashboardFilters } from "@/types/dashboard"
import ContainerDashboardCharts from "../Sections/containerDashboardCharts"
import ContainerMapFilter from "../Sections/containerMapFilter"
import DashboardStatus from "./dashboard-status"

interface Props {
  data: DashboardData
  filters: DashboardFilters
  onFiltersChange: (next: DashboardFilters) => void
}

export default function DashboardView({ data, filters, onFiltersChange }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4 md:p-6">
      <DashboardStatus synthetic={data.synthetic} emptyScope={data.emptyScope} />

      <ContainerMapFilter filters={filters} onFiltersChange={onFiltersChange} data={data} />

      <ContainerDashboardCharts
        monthlyTrend={data.monthlyTrend}
        severityDistribution={data.severityDistribution}
        territories={data.territories}
        scopeLabel={data.scopeLabel}
      />
    </div>
  )
}
