import type { AnalysisCauseRow } from "@/lib/api/analysis"

interface Props {
  totalAccidents: number
  catalogCount: number
  causesWithAccidents: number
  leadingCause: AnalysisCauseRow | null
}

const COUNT_FORMAT = new Intl.NumberFormat("es-CL")
const SHARE_FORMAT = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export default function AnalysisScopeSummary({
  totalAccidents,
  catalogCount,
  causesWithAccidents,
  leadingCause,
}: Props) {
  return (
    <section aria-label="Resumen del alcance" className="grid gap-3 sm:grid-cols-3">
      <div className="glass-card rounded-lg p-4">
        <p className="metric-label">Siniestros en el alcance</p>
        <p className="metric-value mt-1 text-2xl font-semibold text-foreground">
          {COUNT_FORMAT.format(totalAccidents)}
        </p>
      </div>

      <div className="glass-card rounded-lg p-4">
        <p className="metric-label">Causas con siniestros</p>
        <p className="metric-value mt-1 text-2xl font-semibold text-foreground">
          {COUNT_FORMAT.format(causesWithAccidents)}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            de {COUNT_FORMAT.format(catalogCount)}
          </span>
        </p>
      </div>

      <div className="glass-card rounded-lg p-4">
        <p className="metric-label">Causa principal</p>
        {leadingCause && totalAccidents > 0 ? (
          <>
            <p className="mt-1 text-sm font-medium leading-5 text-foreground">{leadingCause.name}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
              {COUNT_FORMAT.format(leadingCause.accidents)} siniestros ·{" "}
              {SHARE_FORMAT.format(leadingCause.share)} %
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Sin siniestros en el alcance</p>
        )}
      </div>
    </section>
  )
}
