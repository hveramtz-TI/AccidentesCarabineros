import type { AnalysisCauseRow } from "@/lib/api/analysis"

interface Props {
  /** Top 10 in API order (accidents DESC, name ASC). */
  rows: AnalysisCauseRow[]
  totalAccidents: number
}

const COUNT_FORMAT = new Intl.NumberFormat("es-CL")
const SHARE_FORMAT = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/**
 * Top-10 proportional bars with plain CSS widths — no chart library and no SVG
 * framework. The bar is decorative: every row already announces its name, count,
 * and share in text.
 */
export default function AnalysisCauseBars({ rows, totalAccidents }: Props) {
  if (totalAccidents === 0) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        No hay siniestros en el alcance seleccionado; las {rows.length} causas
        visibles se muestran con 0.
      </p>
    )
  }

  const max = rows[0]?.accidents ?? 0

  return (
    <ol className="space-y-3" aria-label="Diez causas con más siniestros">
      {rows.map((row, index) => {
        const width = max > 0 ? Math.min(100, (row.accidents / max) * 100) : 0

        return (
          <li key={row.causeId} className="space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
              <span className="min-w-0 text-foreground">
                <span className="mr-2 font-mono text-xs text-muted-foreground tabular-nums">
                  {index + 1}.
                </span>
                {row.name}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {COUNT_FORMAT.format(row.accidents)} · {SHARE_FORMAT.format(row.share)} %
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted" aria-hidden="true">
              <div className="h-2 rounded-full bg-chart-1" style={{ width: `${width}%` }} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
