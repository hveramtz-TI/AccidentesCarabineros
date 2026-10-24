import { Card, CardContent } from "@/components/ui/card"
import type { Kpis, MonthlyPoint } from "@/types/dashboard"

interface Props {
  kpis: Kpis | null
  monthlyTrend: MonthlyPoint[]
  loading: boolean
}

interface KpiSpec {
  key: keyof Kpis
  label: string
  /** Chart token used by the inline sparkline (no chart library needed). */
  color: string
}

const KPI_SPECS: KpiSpec[] = [
  { key: "accidents", label: "Siniestros", color: "var(--color-chart-1)" },
  { key: "fatalities", label: "Fallecidos", color: "var(--color-chart-4)" },
  { key: "injuries", label: "Lesionados", color: "var(--color-chart-3)" },
  { key: "seriousInjuries", label: "Lesionados graves", color: "var(--color-chart-2)" },
]

const SPARK_WIDTH = 100
const SPARK_HEIGHT = 32
const SPARK_PADDING = 1

function formatMetric(value: number): string {
  return value.toLocaleString("es-CL")
}

/**
 * Minimal sparkline drawn as a single `<polyline>`. Keeping it out of Recharts
 * leaves the chart library in the deferred dashboard-charts chunk instead of the
 * initial bundle, without changing the KPI card layout.
 */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = SPARK_WIDTH / (values.length - 1)
  const innerHeight = SPARK_HEIGHT - SPARK_PADDING * 2

  const points = values
    .map((value, index) => {
      const x = index * stepX
      const y = SPARK_PADDING + (1 - (value - min) / span) * innerHeight
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export default function KpiCards({ kpis, monthlyTrend, loading }: Props) {
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
                <Sparkline
                  values={monthlyTrend.map((point) => point[spec.key])}
                  color={spec.color}
                />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
