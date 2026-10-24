import type { AnalysisVehicleTypeRow } from "@/lib/api/analysis"

interface Props {
  /** Types present in the scope, in API order (siniestros DESC, name ASC). */
  rows: AnalysisVehicleTypeRow[]
}

const COUNT_FORMAT = new Intl.NumberFormat("es-CL")
const SHARE_FORMAT = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/**
 * Full type list for the scope. There is deliberately no cumulative-share
 * column: summing shares over non-additive type rows would present a false
 * running total (VEI-1 caveat).
 */
export default function VehicleTypeTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        No hay tipos de vehículo en el alcance seleccionado.
      </p>
    )
  }

  return (
    <div className="glass-card min-w-0 rounded-lg p-4 md:p-5">
      <div className="max-h-96 overflow-auto rounded-lg border border-border/60">
        <table className="w-full min-w-max border-collapse text-sm">
          <caption className="sr-only">
            Tipos de vehículo presentes en el alcance, con siniestros
            distintos y participación no aditiva.
          </caption>
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border/70 text-left">
              <th scope="col" className="px-3 py-2 font-medium text-foreground">
                #
              </th>
              <th scope="col" className="px-3 py-2 font-medium text-foreground">
                Tipo de vehículo
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-foreground">
                Siniestros
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-foreground">
                Participación
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.typeId}
                className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/40"
              >
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground tabular-nums">
                  {index + 1}
                </td>
                <td className="px-3 py-2 text-foreground">{row.name}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {COUNT_FORMAT.format(row.siniestros)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {SHARE_FORMAT.format(row.share)} %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
