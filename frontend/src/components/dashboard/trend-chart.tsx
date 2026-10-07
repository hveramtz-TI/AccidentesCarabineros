import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion"
import type { MonthlyPoint } from "@/types/dashboard"

interface Props {
  monthlyTrend: MonthlyPoint[]
  scopeLabel: string
}

const config = {
  accidents: { label: "Accidents", color: "var(--color-chart-1)" },
  fatalities: { label: "Fatalities", color: "var(--color-chart-4)" },
  injuries: { label: "Injuries", color: "var(--color-chart-3)" },
} satisfies ChartConfig

export default function TrendChart({ monthlyTrend, scopeLabel }: Props) {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <Card className="glass-card rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Monthly trend</CardTitle>
        <CardDescription className="font-mono text-xs">
          {scopeLabel} — synthetic example data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="img"
          aria-label={`Line chart of accidents, fatalities and injuries by month for ${scopeLabel}. Values are synthetic. Series names are shown in the legend.`}
        >
          <ChartContainer config={config} className="h-64 w-full">
            <LineChart data={monthlyTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                tick={{ fontSize: 11 }}
                tickFormatter={(value: number) => value.toLocaleString("en-US")}
              />
              <ChartTooltip content={<ChartTooltipContent />} cursor={{ stroke: "var(--color-ring)" }} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="accidents"
                stroke="var(--color-accidents)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={!reducedMotion}
              />
              <Line
                type="monotone"
                dataKey="injuries"
                stroke="var(--color-injuries)"
                strokeWidth={2}
                dot={false}
                strokeDasharray="6 3"
                isAnimationActive={!reducedMotion}
              />
              <Line
                type="monotone"
                dataKey="fatalities"
                stroke="var(--color-fatalities)"
                strokeWidth={2}
                dot={{ r: 2.5 }}
                isAnimationActive={!reducedMotion}
              />
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
