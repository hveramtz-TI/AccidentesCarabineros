import KpiCards from "@/components/dashboard/kpi-cards"
import SeverityChart from "@/components/dashboard/severity-chart"
import TerritoryRanking from "@/components/dashboard/territory-ranking"
import TrendChart from "@/components/dashboard/trend-chart"
import { syntheticBanner } from "@/lib/data"
import type { DashboardData } from "@/types/dashboard"

interface Props {
  data: DashboardData
}

export default function DashboardView({ data }: Props) {
  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="chip chip-warning" role="status">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
          Synthetic demo
        </span>
        <p className="font-mono text-xs text-muted-foreground">
          {syntheticBanner.periodLabel}
        </p>
      </div>

      {data.synthetic === false && (
        <p className="text-xs text-destructive">
          Fixture markers missing: these values may not be safe to show as demo
          data. Verify the source before publishing.
        </p>
      )}

      {data.emptyScope && (
        <div
          role="status"
          className="rounded-lg border border-[rgba(255,178,36,0.25)] bg-[rgba(255,178,36,0.08)] px-4 py-3 text-sm text-accent-foreground"
        >
          This scope has no rows in the synthetic territorial fixture (coverage
          is partial by design). Pick another commune, another region, or
          return to “All regions”.
        </div>
      )}

      <KpiCards kpis={data.kpis} monthlyTrend={data.monthlyTrend} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <TrendChart monthlyTrend={data.monthlyTrend} scopeLabel={data.scopeLabel} />
        </div>
        <div className="lg:col-span-3">
          <SeverityChart
            severityDistribution={data.severityDistribution}
            scopeLabel={data.scopeLabel}
          />
        </div>
      </div>

      <TerritoryRanking territories={data.territories} scopeLabel={data.scopeLabel} />
    </div>
  )
}
