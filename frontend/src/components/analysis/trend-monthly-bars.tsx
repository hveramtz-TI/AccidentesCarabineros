/**
 * Monthly trend of the scope (EXP-07 T6): 12 CSS bars over `trend.months` with
 * the counts printed on each column — the reading never depends on color —
 * plus a details-disclosed `<table>` as the full accessible fallback (months,
 * accidents and fatalities, totals row reconciling with the scope).
 */

import { monthLabel } from "@/lib/month-label"
import type { AnalysisTrendSection } from "@/lib/api/analysis"

interface Props {
  trend: AnalysisTrendSection
}

const COUNT_FORMAT = new Intl.NumberFormat("es-CL")

export default function TrendMonthlyBars({ trend }: Props) {
  const max = Math.max(1, ...trend.months.map((month) => month.accidents))

  return (
    <section aria-label="Tendencia mensual" className="glass-card min-w-0 rounded-lg p-4 md:p-5">
      <h2 className="text-base font-semibold text-foreground">Siniestros por mes</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Total del alcance: {COUNT_FORMAT.format(trend.totalAccidents)} siniestros ·{" "}
        {COUNT_FORMAT.format(trend.totalFatalities)} fallecidos. Un mes sin
        registros aparece con 0.
      </p>

      <div
        role="img"
        aria-label={`Barras de siniestros mensuales: ${trend.months
          .map((month) => `${monthLabel(month.month)} ${month.accidents}`)
          .join(", ")}.`}
        className="mt-4 flex min-w-0 items-stretch gap-1.5 sm:gap-2"
        style={{ height: "12rem" }}
      >
        {trend.months.map((month) => {
          const heightPct = (month.accidents / max) * 100
          return (
            <div key={month.month} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {COUNT_FORMAT.format(month.accidents)}
              </span>
              {/* Minimum 2 % keeps zero months visible as real (empty) bars. */}
              <div
                className="w-full rounded-t bg-primary/70"
                style={{ height: `${Math.max(heightPct, month.accidents === 0 ? 0 : 2)}%` }}
              />
              <span className="text-xs text-muted-foreground">{monthLabel(month.month)}</span>
            </div>
          )
        })}
      </div>

      <details className="mt-4">
        <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Ver tabla mensual
        </summary>
        <table className="mt-2 w-full border-collapse text-sm">
          <caption className="sr-only">
            Siniestros y fallecidos por mes del período seleccionado, con el
            total del alcance.
          </caption>
          <thead>
            <tr className="border-b border-border/70 text-left">
              <th scope="col" className="py-2 pr-3 font-normal">Mes</th>
              <th scope="col" className="py-2 pr-3 text-right font-normal">Siniestros</th>
              <th scope="col" className="py-2 text-right font-normal">Fallecidos</th>
            </tr>
          </thead>
          <tbody>
            {trend.months.map((month) => (
              <tr key={month.month} className="border-b border-border/40 last:border-0">
                <td className="py-1.5 pr-3 text-foreground">{monthLabel(month.month)} · {month.month}</td>
                <td className="py-1.5 pr-3 text-right font-mono tabular-nums">
                  {COUNT_FORMAT.format(month.accidents)}
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums">
                  {COUNT_FORMAT.format(month.fatalities)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}
