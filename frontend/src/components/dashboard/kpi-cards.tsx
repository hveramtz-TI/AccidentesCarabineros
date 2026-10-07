import { Card, CardContent } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { LineChart, Line, YAxis } from "recharts"
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion"
import type { Kpis, MonthlyPoint } from "@/types/dashboard"

interface Props {
  kpis: Kpis
  monthlyTrend: MonthlyPoint[]
}

interface KpiSpec {
  key: keyof Kpis
  label: string
  /** Token name in the sparkline ChartConfig below. */
  token: string
}

const KPI_SPECS: KpiSpec[] = [
  { key: "accidents", label: "Accidents", token: "accidents" },
  { key: "fatalities", label: "Fatalities", token: "fatalities" },
  { key: "injuries", label: "Injuries", token: "injuries" },
  { key: "activeCases", label: "Active cases", token: "activeCases" },
]

const SPARK_CONFIG = {
  accidents: { label: "Accidents", color: "var(--color-chart-1)" },
  fatalities: { label: "Fatalities", color: "var(--color-chart-4)" },
  injuries: { label: "Injuries", color: "var(--color-chart-3)" },
  activeCases: { label: "Active cases", color: "var(--color-chart-2)" },
} satisfies ChartConfig

function formatMetric(value: number): string {
  return value.toLocaleString("en-US")
}


function sparkSeries(kpis: Kpis, monthlyTrend: MonthlyPoint[]): MonthlyPoint[] {
  const ratio =
    kpis.accidents > 0 ? kpis.activeCases / kpis.accidents : 0
  return monthlyTrend.map((p) => ({
    ...p,
    activeCases: Math.round(p.accidents * ratio),
  }))
}

export default function KpiCards({ kpis, monthlyTrend }: Props) {
  const reducedMotion = usePrefersReducedMotion()
  const series = sparkSeries(kpis, monthlyTrend)

  return (
    <section
      aria-label="Key telemetry indicators"
      className="grid h-full min-h-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:grid-rows-2 xl:grid-cols-4 xl:grid-rows-1"
    >
      {KPI_SPECS.map((spec) => (
        <Card
          key={spec.key}
          className="glass-card overflow-hidden rounded-lg py-0 shadow-none"
        >
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="px-4 pt-3">
              <div className="metric-label">{spec.label}</div>
              <div className="metric-value mt-1 text-3xl font-semibold leading-tight text-foreground">
                {formatMetric(kpis[spec.key])}
              </div>
            </div>
            <div
              className="mt-2 min-h-9 w-full flex-1"
              role="img"
              aria-label={`${spec.label} monthly trend sparkline`}
            >
              <ChartContainer
                config={SPARK_CONFIG satisfies ChartConfig}
                className="aspect-auto h-full w-full"
              >
                <LineChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <YAxis hide domain={["dataMin", "dataMax"]} />
                  <Line
                    type="linear"
                    dataKey={spec.key}
                    stroke={`var(--color-${spec.token})`}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={!reducedMotion}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
