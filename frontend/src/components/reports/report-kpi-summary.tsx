/**
 * KPI summary of the report (EXP-06 T4): siniestros, fallecidos, territory
 * count, and the leading territory. The leading card renders an explicit
 * "Sin siniestros en el alcance" state when the scope is empty — never a crash
 * on a missing first row, and never relying on color alone.
 */

import type { Kpis, TerritoryRow } from "@/types/dashboard"

interface Props {
  kpis: Kpis
  /** `territories.all.length`: every row of the scope, zeros included. */
  territoryCount: number
  /** First row of `territories.items`, or null for the empty-scope state. */
  leading: TerritoryRow | null
}

const numberFormatter = new Intl.NumberFormat("es-CL")

export default function ReportKpiSummary({ kpis, territoryCount, leading }: Props) {
  const cards: Array<{ label: string; value: string; detail: string | null }> = [
    { label: "Siniestros", value: numberFormatter.format(kpis.accidents), detail: null },
    { label: "Fallecidos", value: numberFormatter.format(kpis.fatalities), detail: null },
    { label: "Territorios", value: numberFormatter.format(territoryCount), detail: null },
    {
      label: "Territorio líder",
      value: leading ? leading.name : "Sin siniestros en el alcance",
      detail: leading
        ? `${numberFormatter.format(leading.accidents)} siniestros (${leading.code})`
        : null,
    },
  ]

  return (
    <section aria-label="Resumen de indicadores" className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="glass-card min-w-0 rounded-lg p-4">
          <p className="metric-label">{card.label}</p>
          <p className="metric-value mt-2 text-xl font-semibold leading-snug text-foreground">
            {card.value}
          </p>
          {card.detail ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{card.detail}</p>
          ) : null}
        </div>
      ))}
    </section>
  )
}
