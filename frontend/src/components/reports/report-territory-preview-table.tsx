/**
 * Territory preview table of the report (EXP-06 T4): the top nonzero rows the
 * API already ordered (`territories.items`), never re-sorted here. The visible
 * note states the contract the CSV fulfills: all scope rows, zeros included.
 */

import type { TerritoryRow } from "@/types/dashboard"

interface Props {
  rows: TerritoryRow[]
  /** Filtered accident total: the participation denominator, as in Mapas. */
  totalAccidents: number
}

const numberFormatter = new Intl.NumberFormat("es-CL")

function shareFormatter(share: number): string {
  return `${share.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

export default function ReportTerritoryPreviewTable({ rows, totalAccidents }: Props) {
  if (rows.length === 0) {
    return (
      <p role="status" className="glass-card p-4 text-sm text-muted-foreground">
        Sin siniestros en el alcance: no hay territorios con registros para este
        filtro.
      </p>
    )
  }

  return (
    <section aria-labelledby="report-territory-title" className="min-w-0">
      <h2
        id="report-territory-title"
        className="mb-3 border-b border-border/70 pb-3 font-heading text-base font-semibold text-foreground"
      >
        Territorios del alcance
      </h2>
      <div className="glass-card overflow-auto rounded-lg print:overflow-visible print:rounded-none print:border-0">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Vista previa de los territorios con más siniestros dentro del alcance
            seleccionado.
          </caption>
          <thead className="bg-background">
            <tr className="border-b border-border/70">
              <th scope="col" className="px-3 py-2 text-left font-normal">
                Territorio
              </th>
              <th scope="col" className="px-3 py-2 text-left font-normal">
                Código
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Siniestros
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Fallecidos
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Participación
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const share = totalAccidents === 0 ? 0 : (row.accidents / totalAccidents) * 100

              return (
                <tr key={row.code} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2 align-top font-medium text-foreground">{row.name}</td>
                  <td className="px-3 py-2 align-top font-mono text-xs text-muted-foreground">
                    {row.code}
                  </td>
                  <td className="px-3 py-2 text-right align-top tabular-nums">
                    {numberFormatter.format(row.accidents)}
                  </td>
                  <td className="px-3 py-2 text-right align-top tabular-nums">
                    {numberFormatter.format(row.fatalities)}
                  </td>
                  <td className="px-3 py-2 text-right align-top tabular-nums">
                    {shareFormatter(share)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-prose text-xs leading-5 text-muted-foreground">
        Vista previa con los territorios principales del alcance. La descarga en
        CSV incluye todas las filas territoriales del mismo filtro, incluidos los
        territorios con cero siniestros.
      </p>
    </section>
  )
}
