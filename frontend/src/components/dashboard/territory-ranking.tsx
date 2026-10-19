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
import type { TerritoryRankingData } from "@/types/dashboard"

interface Props {
  territories: TerritoryRankingData
  scopeLabel: string
}

const config = {
  accidents: { label: "Siniestros", color: "var(--color-chart-1)" },
} satisfies ChartConfig

const fmt = (value: number) => value.toLocaleString("es-CL")

export default function TerritoryRanking({ territories, scopeLabel }: Props) {
  const reducedMotion = usePrefersReducedMotion()
  const rows = territories.rows
  const territoryNoun = territories.scope === "region" ? "regiones" : "comunas"
  const territoryLabel = territories.scope === "region" ? "Región" : "Comuna"

  return (
    <Card className="glass-card rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Territorios con más siniestros</CardTitle>
        <CardDescription className="font-mono text-xs">
          {scopeLabel} — {rows.length} {territoryNoun} con más siniestros
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart">
          <TabsList aria-label="Vista del ranking territorial">
            <TabsTrigger value="chart">Gráfico</TabsTrigger>
            <TabsTrigger value="table">Tabla</TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            <div
              role="img"
              aria-label={`Gráfico de barras horizontal de las ${rows.length} ${territoryNoun} con más siniestros. Los nombres identifican cada barra y las cantidades aparecen al final.`}
            >
              <ChartContainer config={config} className="h-80 w-full">
                <BarChart
                  layout="vertical"
                  data={rows}
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
                    dataKey="name"
                    width={120}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="name"
                        formatter={(value, name) => (
                          <>
                            <span className="text-muted-foreground">{String(name)}</span>
                            <span className="font-mono tabular-nums">{fmt(Number(value))}</span>
                          </>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="accidents" fill="var(--color-chart-1)" radius={[0, 2, 2, 0]} barSize={16} isAnimationActive={!reducedMotion}>
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
                Vista accesible: {rows.length} {territoryNoun} con más siniestros,
                según los datos del panel.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>{territoryLabel}</TableHead>
                  <TableHead className="text-right">Siniestros</TableHead>
                  <TableHead className="text-right">Fallecidos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.code}>
                    <TableCell className="font-mono text-muted-foreground tabular-nums">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell className="text-sm">{row.name}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmt(row.accidents)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmt(row.fatalities)}</TableCell>
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
