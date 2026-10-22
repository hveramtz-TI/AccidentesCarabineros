import ChartSkeleton from "@/components/dashboard/chart-skeleton"
import SeverityChart from "@/components/dashboard/severity-chart"
import TerritoryRanking from "@/components/dashboard/territory-ranking"
import TrendChart from "@/components/dashboard/trend-chart"
import type { DashboardData } from "@/types/dashboard"

type Props = {
  /** Adapted dashboard payload; null until it exists (loading or error state). */
  data: DashboardData | null
}

const ContainerDashboardCharts = ({ data }: Props) => {
  return (
    <section
      aria-label="Gráficos de tendencia, gravedad y análisis territorial"
      className="flex min-w-0 flex-col gap-4"
    >
      {data ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          <div className="min-w-0 lg:col-span-4">
            <TrendChart
              monthlyTrend={data.monthlyTrend}
              scopeLabel={data.scopeLabel}
            />
          </div>
          <div className="min-w-0 lg:col-span-3">
            <SeverityChart
              severityDistribution={data.severityDistribution}
              scopeLabel={data.scopeLabel}
            />
          </div>
        </div>
      ) : (
        // Same grid, titles and body heights as the real charts, so nothing
        // shifts when the data arrives. Skeleton semantics match KpiCards.
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          <div className="min-w-0 lg:col-span-4">
            <ChartSkeleton
              title="Tendencia mensual"
              description="Cargando datos del período seleccionado"
              bodyClass="h-64 w-full"
            />
          </div>
          <div className="min-w-0 lg:col-span-3">
            <ChartSkeleton
              title="Distribución por gravedad"
              description="Cargando datos del período seleccionado"
              bodyClass="h-64 w-full"
            />
          </div>
        </div>
      )}

      <div className="space-y-4 border-t border-border/70 pt-5">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Ranking territorial
        </h3>
        {data ? (
          <TerritoryRanking
            territories={data.territories}
            scopeLabel={data.scopeLabel}
          />
        ) : (
          <ChartSkeleton
            title="Territorios con más siniestros"
            description="Cargando datos territoriales"
            bodyClass="h-80 w-full"
          />
        )}
      </div>
    </section>
  )
}

export default ContainerDashboardCharts
