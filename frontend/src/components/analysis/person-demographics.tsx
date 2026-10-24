import type { AnalysisPersonAgeRow, AnalysisPersonSexRow } from "@/lib/api/analysis"

interface Props {
  /** Sex marginals in API order (sexId ASC); `SE IGNORA` renders inside the bars. */
  sexRows: AnalysisPersonSexRow[]
  /** Always the six approved bands in order, zero-valued ones included. */
  ageRows: AnalysisPersonAgeRow[]
  /** `persons.rows` — the person-grain denominator for every share here. */
  totalPersons: number
}

const COUNT_FORMAT = new Intl.NumberFormat("es-CL")
const SHARE_FORMAT = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** The `unknown` band key is a fixed wire value; its es-CL label is "Sin dato". */
const BAND_LABELS: Record<string, string> = { unknown: "Sin dato" }

interface BarRow {
  key: string
  label: string
  persons: number
  share: number
}

function BarList({ rows, barClass, label }: { rows: BarRow[]; barClass: string; label: string }) {
  const max = rows.reduce((current, row) => Math.max(current, row.persons), 0)

  return (
    <ol className="space-y-3" aria-label={label}>
      {rows.map((row) => {
        const width = max > 0 ? Math.min(100, (row.persons / max) * 100) : 0

        return (
          <li key={row.key} className="space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
              <span className="min-w-0 text-foreground">{row.label}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {COUNT_FORMAT.format(row.persons)} personas · {SHARE_FORMAT.format(row.share)} %
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted" aria-hidden="true">
              <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${width}%` }} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Sex and age distributions as plain CSS bars (the Causas visual language —
 * no chart library). The unknown rows (`SE IGNORA`, `Sin dato`) render inside
 * the bars as their own categories: nothing is imputed or dropped. The whole
 * block is not drawn for an empty scope — the layout's DashboardStatus already
 * announces it (EXP-03 lesson), and `byAge` would otherwise show six zero
 * bars.
 */
export default function PersonDemographics({ sexRows, ageRows, totalPersons }: Props) {
  if (totalPersons === 0) return null

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section aria-labelledby="analysis-persons-sex" className="min-w-0">
        <h3
          id="analysis-persons-sex"
          className="mb-3 border-b border-border/70 pb-2 font-heading text-sm font-semibold text-foreground"
        >
          Sexo
        </h3>
        <div className="glass-card rounded-lg p-4">
          <BarList
            label="Personas por sexo"
            barClass="bg-chart-1"
            rows={sexRows.map((row) => ({
              key: String(row.sexId),
              label: row.name,
              persons: row.persons,
              share: row.share,
            }))}
          />
        </div>
      </section>

      <section aria-labelledby="analysis-persons-age" className="min-w-0">
        <h3
          id="analysis-persons-age"
          className="mb-3 border-b border-border/70 pb-2 font-heading text-sm font-semibold text-foreground"
        >
          Edad
        </h3>
        <div className="glass-card rounded-lg p-4">
          <BarList
            label="Personas por banda de edad"
            barClass="bg-chart-2"
            rows={ageRows.map((row) => ({
              key: row.bucket,
              label: BAND_LABELS[row.bucket] ?? row.bucket,
              persons: row.persons,
              share: row.share,
            }))}
          />
        </div>
      </section>
    </div>
  )
}
