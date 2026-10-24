import type {
  AnalysisSeverityBucket,
  AnalysisVehicleSeverityRow,
  AnalysisVehicleTypeRow,
} from "@/lib/api/analysis"

interface Props {
  /** Present types in API order; supplies the reconciliation total per row. */
  types: AnalysisVehicleTypeRow[]
  /** Matrix cells in API order (type order, then bucket order). */
  cells: AnalysisVehicleSeverityRow[]
}

/** es-CL labels matching the dashboard's approved severity buckets (SEV-1). */
const BUCKET_LABELS: Record<Exclude<AnalysisSeverityBucket, "unknown">, string> = {
  fatal: "Con fallecidos",
  serious: "Con lesiones graves",
  minor: "Con lesiones leves o menos graves",
  onlyIlesos: "Solo personas ilesas",
}
const UNKNOWN_LABEL = "Sin dato de severidad"
const BUCKET_ORDER = ["fatal", "serious", "minor", "onlyIlesos"] as const

const COUNT_FORMAT = new Intl.NumberFormat("es-CL")

/**
 * Type × severity matrix. Severity is siniestro-level, so the buckets partition
 * each type's siniestros: the sum of the bucket columns always equals the Total
 * column. The `unknown` column is rendered only when the data contains it.
 */
export default function VehicleSeverityMatrix({ types, cells }: Props) {
  if (types.length === 0) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        No hay tipos de vehículo en el alcance seleccionado.
      </p>
    )
  }

  const cellOf = new Map(cells.map((cell) => [`${cell.typeId}|${cell.severity}`, cell.siniestros]))
  const hasUnknown = cells.some((cell) => cell.severity === "unknown")

  return (
    <div className="glass-card min-w-0 rounded-lg p-4 md:p-5">
      <div className="max-h-96 overflow-auto rounded-lg border border-border/60">
        <table className="w-full min-w-max border-collapse text-sm">
          <caption className="sr-only">
            Matriz de tipos de vehículo por gravedad de siniestro; la suma de
            las columnas de gravedad coincide con el total por tipo.
          </caption>
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border/70 text-left">
              <th scope="col" className="px-3 py-2 font-medium text-foreground">
                Tipo de vehículo
              </th>
              {BUCKET_ORDER.map((bucket) => (
                <th
                  key={bucket}
                  scope="col"
                  className="px-3 py-2 text-right font-medium whitespace-nowrap text-foreground"
                >
                  {BUCKET_LABELS[bucket]}
                </th>
              ))}
              {hasUnknown ? (
                <th
                  scope="col"
                  className="px-3 py-2 text-right font-medium whitespace-nowrap text-foreground"
                >
                  {UNKNOWN_LABEL}
                </th>
              ) : null}
              <th scope="col" className="px-3 py-2 text-right font-medium text-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {types.map((type) => (
              <tr
                key={type.typeId}
                className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/40"
              >
                <td className="px-3 py-2 text-foreground">{type.name}</td>
                {BUCKET_ORDER.map((bucket) => (
                  <td
                    key={bucket}
                    className="px-3 py-2 text-right font-mono tabular-nums"
                  >
                    {COUNT_FORMAT.format(cellOf.get(`${type.typeId}|${bucket}`) ?? 0)}
                  </td>
                ))}
                {hasUnknown ? (
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {COUNT_FORMAT.format(cellOf.get(`${type.typeId}|unknown`) ?? 0)}
                  </td>
                ) : null}
                <td className="px-3 py-2 text-right font-mono font-medium tabular-nums text-foreground">
                  {COUNT_FORMAT.format(type.siniestros)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
