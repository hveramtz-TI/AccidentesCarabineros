/**
 * Personas tab (`/analisis/personas`, EXP-05 T5).
 *
 * Presentational: the layout owns the single `/api/analysis` request and passes
 * the response through the router outlet context — this page never issues a
 * second one. Everything is derived from `persons`: the grain disclosure
 * (always before any numbers), a compact summary, sex/age CSS bars, the
 * sex × age and role × outcome matrices, and the coverage notes for unknown
 * age/sex. The section is read defensively: a stale server without `persons`
 * shows an explicit notice instead of crashing the tab. No person count is ever
 * placed on a siniestro axis and no value is imputed.
 */

import { useMemo } from "react"
import { useOutletContext } from "react-router"

import PersonDemographics from "@/components/analysis/person-demographics"
import PersonMatrix from "@/components/analysis/person-matrix"
import type { MatrixCell, MatrixColumn, MatrixRow } from "@/components/analysis/person-matrix"
import type { AnalysisPersonQualityOutcomeRow, AnalysisPersonsSection } from "@/lib/api/analysis"
import type { AnalysisOutletContext } from "@/routes/analysis-layout"

const COUNT_FORMAT = new Intl.NumberFormat("es-CL")
const SHARE_FORMAT = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** Same rounding rule as the API's `percent`: one decimal, 0 on an empty scope. */
function shareOf(persons: number, rows: number): number {
  return rows === 0 ? 0 : Math.round((persons / rows) * 1_000) / 10
}

/** The `unknown` band key is a fixed wire value; its es-CL label is "Sin dato". */
const BAND_LABELS: Record<string, string> = { unknown: "Sin dato" }

/**
 * Build the role × outcome matrix rows and column totals from the flat cell
 * list. The cells are a MECE partition of `persons.rows`, so summing them per
 * role/outcome reproduces the exact marginals — the same structural
 * reconciliation the API guarantees between `bySexAge` and `rows`.
 */
function deriveRoleOutcomeMatrix(cells: AnalysisPersonQualityOutcomeRow[]): {
  rows: MatrixRow[]
  columns: MatrixColumn[]
  matrixCells: MatrixCell[]
} {
  const roleTotals = new Map<number, MatrixRow>()
  const outcomeTotals = new Map<number, MatrixColumn>()
  for (const cell of cells) {
    const role = roleTotals.get(cell.qualityId)
    if (role) role.total += cell.persons
    else roleTotals.set(cell.qualityId, { id: cell.qualityId, label: cell.qualityName, total: cell.persons })
    const outcome = outcomeTotals.get(cell.outcomeId)
    if (outcome) outcome.total += cell.persons
    else
      outcomeTotals.set(cell.outcomeId, {
        key: String(cell.outcomeId),
        label: cell.outcomeName,
        total: cell.persons,
      })
  }
  // Roles read best by magnitude (persons DESC, qualityId ASC tiebreak, the
  // same deterministic rule as the API cell order); columns stay in the fixed
  // catalog order (outcomeId ASC).
  const rows = [...roleTotals.values()].sort((a, b) => b.total - a.total || a.id - b.id)
  const columns = [...outcomeTotals.values()].sort((a, b) => Number(a.key) - Number(b.key))
  const matrixCells = cells.map((cell) => ({
    rowId: cell.qualityId,
    columnKey: String(cell.outcomeId),
    persons: cell.persons,
  }))
  return { rows, columns, matrixCells }
}

function PersonsSkeleton() {
  return (
    <div role="status" aria-label="Cargando personas" className="flex min-w-0 flex-col gap-4">
      <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <div key={card} className="glass-card h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((panel) => (
          <div key={panel} className="glass-card h-64 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      {[0, 1].map((matrix) => (
        <div key={matrix} className="glass-card h-72 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  )
}

export default function AnalysisPersonsPage() {
  const { data, status } = useOutletContext<AnalysisOutletContext>()

  const persons: AnalysisPersonsSection | null = useMemo(() => data?.persons ?? null, [data])

  const roleOutcome = useMemo(
    () => (persons ? deriveRoleOutcomeMatrix(persons.byQualityOutcome) : null),
    [persons],
  )

  if (!data) {
    return status === "loading" ? <PersonsSkeleton /> : null
  }

  if (!persons) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        El servidor no envió la sección de personas del análisis. Actualiza el
        backend para habilitar esta pestaña.
      </p>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div
        role="note"
        className="rounded-lg border border-[rgba(255,178,36,0.25)] bg-[rgba(255,178,36,0.08)] px-4 py-3 text-sm text-accent-foreground"
      >
        Cada número de esta pestaña cuenta personas, no siniestros: un mismo
        siniestro puede involucrar a varias personas, así que estos totales no
        son comparables uno a uno con los conteos de siniestros de otras
        pestañas ni de los KPIs. Los ejes de personas y de siniestros nunca se
        mezclan.
      </div>

      <section aria-label="Resumen de personas del alcance" className="grid gap-3 sm:grid-cols-3">
        <div className="glass-card rounded-lg p-4">
          <p className="metric-label">Personas involucradas</p>
          <p className="metric-value mt-1 text-2xl font-semibold text-foreground">
            {COUNT_FORMAT.format(persons.rows)}
          </p>
        </div>

        <div className="glass-card rounded-lg p-4">
          <p className="metric-label">Personas sin edad registrada</p>
          <p className="metric-value mt-1 text-2xl font-semibold text-foreground">
            {COUNT_FORMAT.format(persons.unknownAge)}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
            {SHARE_FORMAT.format(shareOf(persons.unknownAge, persons.rows))} % de las personas
          </p>
        </div>

        <div className="glass-card rounded-lg p-4">
          <p className="metric-label">Personas con sexo “SE IGNORA”</p>
          <p className="metric-value mt-1 text-2xl font-semibold text-foreground">
            {COUNT_FORMAT.format(persons.unknownSex)}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
            {SHARE_FORMAT.format(shareOf(persons.unknownSex, persons.rows))} % de las personas
          </p>
        </div>
      </section>

      <PersonDemographics sexRows={persons.bySex} ageRows={persons.byAge} totalPersons={persons.rows} />

      <section aria-labelledby="analysis-persons-sex-age" className="min-w-0">
        <h2
          id="analysis-persons-sex-age"
          className="mb-3 border-b border-border/70 pb-3 font-heading text-base font-semibold text-foreground"
        >
          Sexo por edad
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Cada persona cae en exactamente una fila y una columna, así que los
          totales de fila coinciden con la distribución por sexo, los de columna
          con las bandas de edad y el total general con las personas del
          alcance. Las bandas con valor cero se muestran igual.
        </p>
        <PersonMatrix
          caption="Matriz de personas por sexo y banda de edad; los totales de fila y columna coinciden con las distribuciones por sexo y por edad, y el total general con las personas del alcance."
          rowHeaderLabel="Sexo"
          rows={persons.bySex.map((row) => ({ id: row.sexId, label: row.name, total: row.persons }))}
          columns={persons.byAge.map((band) => ({
            key: band.bucket,
            label: BAND_LABELS[band.bucket] ?? band.bucket,
            total: band.persons,
          }))}
          cells={persons.bySexAge.map((cell) => ({
            rowId: cell.sexId,
            columnKey: cell.bucket,
            persons: cell.persons,
          }))}
          grandTotal={persons.rows}
          emptyMessage="No hay personas en el alcance seleccionado."
        />
      </section>

      <section aria-labelledby="analysis-persons-role-outcome" className="min-w-0">
        <h2
          id="analysis-persons-role-outcome"
          className="mb-3 border-b border-border/70 pb-3 font-heading text-base font-semibold text-foreground"
        >
          Calidad por resultado
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Resultado a nivel de persona (leve, ileso, menos grave, fallecido,
          grave), distinto de la severidad a nivel de siniestro de la pestaña
          Vehículos. Cada persona tiene exactamente una calidad y un resultado,
          por lo que la matriz también cuadra con el total de personas.
        </p>
        {roleOutcome ? (
          <PersonMatrix
            caption="Matriz de personas por calidad y resultado; los totales de fila y columna coinciden con las personas del alcance."
            rowHeaderLabel="Calidad"
            rows={roleOutcome.rows}
            columns={roleOutcome.columns}
            cells={roleOutcome.matrixCells}
            grandTotal={persons.rows}
            emptyMessage="No hay personas en el alcance seleccionado."
          />
        ) : null}
      </section>

      <p className="text-xs text-muted-foreground">
        Nota de cobertura: {COUNT_FORMAT.format(persons.unknownAge)} personas no
        registran edad (banda “Sin dato”) y {COUNT_FORMAT.format(persons.unknownSex)}{" "}
        figuran con sexo “SE IGNORA”. Ambas se muestran como categoría propia y
        nunca se imputan ni se reasignan.
      </p>
    </div>
  )
}
