import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts"
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion"
import type { SeverityBucket } from "@/types/dashboard"

interface Props {
  severityDistribution: SeverityBucket[]
  scopeLabel: string
}

const config = {
  count: { label: "Cases", color: "var(--color-chart-1)" },
} satisfies ChartConfig

/** Category colors are decorative; category names are always labeled. */
const BAR_COLORS = [
  "var(--color-chart-4)", // Fatal           – gray
  "var(--color-chart-3)", // Serious injuries – teal-gray
  "var(--color-chart-2)", // Minor injuries   – green
  "var(--color-chart-1)", // Uninjured only   – emerald
]

export default function SeverityChart({ severityDistribution, scopeLabel }: Props) {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <Card className="glass-card rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Severity distribution</CardTitle>
        <CardDescription className="font-mono text-xs">
          {scopeLabel} — MECE severity buckets from the API
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="img"
            aria-label={`Bar chart of accident severity categories for ${scopeLabel}. Categories are labeled on the axis and counts are printed above each bar.`}
        >
          <ChartContainer config={config} className="h-64 w-full">
            <BarChart
              data={severityDistribution}
              margin={{ top: 20, right: 8, bottom: 0, left: -12 }}
            >
              <XAxis
                dataKey="severity"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 10 }}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                tick={{ fontSize: 11 }}
                tickFormatter={(value: number) => value.toLocaleString("en-US")}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel={false} />} />
              <Bar dataKey="count" radius={[2, 2, 0, 0]} isAnimationActive={!reducedMotion}>
                {severityDistribution.map((bucket, index) => (
                  <Cell
                    key={bucket.severity}
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                  />
                ))}
                <LabelList
                  dataKey="count"
                  position="top"
                  formatter={(value) => Number(value).toLocaleString("en-US")}
                  style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
