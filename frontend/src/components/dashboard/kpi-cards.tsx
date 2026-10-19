import { Card, CardContent } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { LineChart, Line, YAxis } from "recharts"
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion"
import type { Kpis, MonthlyPoint } from "@/types/dashboard"

interface Props {
  kpis: Kpis | null
  monthlyTrend: MonthlyPoint[]
  loading: boolean
}

interface KpiSpec {
  key: keyof Kpis
  label: string
  /** Token name in the sparkline ChartConfig below. */
  token: string
}

const KPI_SPECS: KpiSpec[] = [
  { key: "accidents", label: "Siniestros", token: "accidents" },
  { key: "fatalities", label: "Fallecidos", token: "fatalities" },
  { key: "injuries", label: "Lesionados", token: "injuries" },
  { key: "seriousInjuries", label: "Lesionados graves", token: "seriousInjuries" },
]

const SPARK_CONFIG = {
  accidents: { label: "Siniestros", color: "var(--color-chart-1)" },
  fatalities: { label: "Fallecidos", color: "var(--color-chart-4)" },
  injuries: { label: "Lesionados", color: "var(--color-chart-3)" },
  seriousInjuries: { label: "Lesionados graves", color: "var(--color-chart-2)" },
} satisfies ChartConfig

function formatMetric(value: number): string {
  return value.toLocaleString("es-CL")
}

export default function KpiCards({ kpis, monthlyTrend, loading }: Props) {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <section
      aria-label="Indicadores clave"
      className="grid h-full min-h-0 grid-cols-1 grid-rows-4 gap-4 sm:grid-cols-2 sm:grid-rows-2"
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
                {loading || !kpis ? (
                  <span
                    role="status"
                    aria-label={`${spec.label}: cargando`}
                    className="inline-block h-8 w-24 animate-pulse rounded bg-muted"
                  />
                ) : (
                  formatMetric(kpis[spec.key])
                )}
              </div>
            </div>
            <div
              className="mt-2 min-h-9 w-full flex-1"
              role="img"
              aria-label={`${spec.label}: tendencia mensual`}
            >
              {!loading && kpis && (
                <ChartContainer
                  config={SPARK_CONFIG satisfies ChartConfig}
                  className="aspect-auto h-full w-full"
                >
                  <LineChart data={monthlyTrend} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
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
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
