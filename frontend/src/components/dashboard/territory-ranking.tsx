import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion"
import type { TerritorialRow } from "@/types/dashboard"

interface Props {
  territories: TerritorialRow[]
  scopeLabel: string
}

const config = {
  accidents: { label: "Accidents", color: "var(--color-chart-1)" },
} satisfies ChartConfig

const TOP_N = 10

const fmt = (value: number) => value.toLocaleString("en-US")

export default function TerritoryRanking({ territories, scopeLabel }: Props) {
  const reducedMotion = usePrefersReducedMotion()
  const top = territories.slice(0, TOP_N)

  return (
    <Card className="glass-card rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Top territories by accidents</CardTitle>
        <CardDescription className="font-mono text-xs">
          {scopeLabel} — top {top.length} of {territories.length} rows in scope (synthetic)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart">
          <TabsList aria-label="Territorial ranking view">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            <div
              role="img"
              aria-label={`Horizontal bar chart of the top ${top.length} territories by accident count. Commune names label each bar and counts are printed at the bar ends. Values are synthetic.`}
            >
              <ChartContainer config={config} className="h-80 w-full">
                <BarChart
                  layout="vertical"
                  data={top}
                  margin={{ top: 4, right: 48, bottom: 0, left: 8 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value: number) => fmt(value)}
                  />
                  <YAxis
                    type="category"
                    dataKey="commune"
                    width={120}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="commune"
                        formatter={(value, name) => (
                          <>
                            <span className="text-muted-foreground">{String(name)}</span>
                            <span className="font-mono tabular-nums">{fmt(Number(value))}</span>
                          </>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="accidents" fill="var(--color-accidents)" radius={[0, 2, 2, 0]} barSize={16} isAnimationActive={!reducedMotion}>
                    <LabelList
                      dataKey="accidents"
                      position="right"
                      formatter={(value) => fmt(Number(value))}
                      style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </TabsContent>

          <TabsContent value="table">
            <Table>
              <TableCaption>
                Accessible fallback — top {top.length} territories by accidents
                (synthetic example data, keyed by official commune identifiers).
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Commune</TableHead>
                  <TableHead>Identifier</TableHead>
                  <TableHead className="text-right">Accidents</TableHead>
                  <TableHead className="text-right">Fatalities</TableHead>
                  <TableHead className="text-right">Injuries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top.map((row, index) => (
                  <TableRow key={row.identifier}>
                    <TableCell className="font-mono text-muted-foreground tabular-nums">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-sm">{row.regionRoman}</TableCell>
                    <TableCell className="text-sm">{row.commune}</TableCell>
                    <TableCell className="font-mono text-xs">{row.identifier}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmt(row.accidents)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmt(row.fatalities)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmt(row.injuries)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
