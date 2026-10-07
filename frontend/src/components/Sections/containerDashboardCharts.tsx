import SeverityChart from "@/components/dashboard/severity-chart"
import TerritoryRanking from "@/components/dashboard/territory-ranking"
import TrendChart from "@/components/dashboard/trend-chart"
import type {
  MonthlyPoint,
  SeverityBucket,
  TerritorialRow,
} from "@/types/dashboard"

type Props = {
  monthlyTrend: MonthlyPoint[]
  severityDistribution: SeverityBucket[]
  territories: TerritorialRow[]
  scopeLabel: string
}

const ContainerDashboardCharts = (props: Props) => {
  return (
    <section
      aria-label="Trend, severity, and territorial analysis charts"
      className="flex min-w-0 flex-col gap-4"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <div className="min-w-0 lg:col-span-4">
          <TrendChart
            monthlyTrend={props.monthlyTrend}
            scopeLabel={props.scopeLabel}
          />
        </div>
        <div className="min-w-0 lg:col-span-3">
          <SeverityChart
            severityDistribution={props.severityDistribution}
            scopeLabel={props.scopeLabel}
          />
        </div>
      </div>

      <TerritoryRanking
        territories={props.territories}
        scopeLabel={props.scopeLabel}
      />
    </section>
  )
}

export default ContainerDashboardCharts
