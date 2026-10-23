/**
 * Causas tab (`/analisis/causas`, EXP-03 T5).
 *
 * Presentational: the layout owns the request and passes the response through
 * the router outlet context. Everything here is derived from `causes.rows` —
 * summary, Top-10 bars, search, and the full 70-cause table.
 */

import { useMemo } from "react"
import { useOutletContext } from "react-router"

import AnalysisCauseBars from "@/components/analysis/analysis-cause-bars"
import AnalysisCausesTable from "@/components/analysis/analysis-causes-table"
import AnalysisScopeSummary from "@/components/analysis/analysis-scope-summary"
import type { AnalysisCauseRow } from "@/lib/api/analysis"
import type { AnalysisOutletContext } from "@/routes/analysis-layout"

interface DerivedCauses {
  rows: AnalysisCauseRow[]
  totalAccidents: number
  causesWithAccidents: number
  leadingCause: AnalysisCauseRow | null
  topTen: AnalysisCauseRow[]
  rankOf: Map<number, number>
  cumulativeOf: Map<number, number>
}

function buildRank(rows: AnalysisCauseRow[]): Map<number, number> {
  return new Map(rows.map((row, index) => [row.causeId, index + 1]))
}

/**
 * Running share in API order. It accumulates accidents (not rounded shares) so
 * the last row reaches exactly 100.0 % whenever the scope has data.
 */
function buildCumulative(rows: AnalysisCauseRow[], totalAccidents: number): Map<number, number> {
  const cumulative = new Map<number, number>()
  let running = 0
  for (const row of rows) {
    running += row.accidents
    cumulative.set(
      row.causeId,
      totalAccidents === 0 ? 0 : Math.round((running / totalAccidents) * 1_000) / 10,
    )
  }
  return cumulative
}

function CausesSkeleton() {
  return (
    <div role="status" aria-label="Cargando causas" className="grid gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((card) => (
        <div key={card} className="glass-card h-24 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  )
}

export default function AnalysisCausesPage() {
  const { data, status } = useOutletContext<AnalysisOutletContext>()

  const derived = useMemo<DerivedCauses | null>(() => {
    if (!data) return null
    const rows = data.causes.rows
    const totalAccidents = data.causes.totalAccidents
    return {
      rows,
      totalAccidents,
      causesWithAccidents: rows.filter((row) => row.accidents > 0).length,
      leadingCause: totalAccidents > 0 ? (rows[0] ?? null) : null,
      topTen: rows.slice(0, 10),
      rankOf: buildRank(rows),
      cumulativeOf: buildCumulative(rows, totalAccidents),
    }
  }, [data])

  if (!derived) {
    return status === "loading" ? <CausesSkeleton /> : null
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <AnalysisScopeSummary
        totalAccidents={derived.totalAccidents}
        catalogCount={derived.rows.length}
        causesWithAccidents={derived.causesWithAccidents}
        leadingCause={derived.leadingCause}
      />

      <section
        aria-labelledby="analysis-top-causes"
        className="glass-card rounded-lg p-4 md:p-5"
      >
        <h2
          id="analysis-top-causes"
          className="font-heading text-base font-semibold text-foreground"
        >
          Causas principales
        </h2>
        <p className="mb-4 mt-1 text-xs text-muted-foreground">
          Top 10 por siniestros; cada barra se escala sobre la causa principal.
        </p>
        <AnalysisCauseBars rows={derived.topTen} totalAccidents={derived.totalAccidents} />
      </section>

      <section aria-labelledby="analysis-all-causes" className="min-w-0">
        <h2
          id="analysis-all-causes"
          className="mb-3 border-b border-border/70 pb-3 font-heading text-base font-semibold text-foreground"
        >
          Catálogo completo de causas
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Las {derived.rows.length} causas del catálogo, incluidas las que no
          registran siniestros en el alcance. La participación acumulada es la
          suma corrida en el orden de la tabla.
        </p>
        <AnalysisCausesTable
          rows={derived.rows}
          rankOf={derived.rankOf}
          cumulativeOf={derived.cumulativeOf}
          catalogCount={derived.rows.length}
        />
      </section>
    </div>
  )
}
