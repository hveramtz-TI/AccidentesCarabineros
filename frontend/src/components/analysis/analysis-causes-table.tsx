import { Fragment, useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import type { AnalysisCauseRow } from "@/lib/api/analysis"

interface Props {
  /** Full catalog in API order. */
  rows: AnalysisCauseRow[]
  /** Original rank per cause, preserved while searching. */
  rankOf: Map<number, number>
  /** Cumulative share per cause, preserved while searching. */
  cumulativeOf: Map<number, number>
  catalogCount: number
  /** First cause whose cumulative share reaches 80 % (Pareto boundary). */
  paretoCauseId?: number | null
}

const COUNT_FORMAT = new Intl.NumberFormat("es-CL")
const SHARE_FORMAT = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const DIACRITICS = /[\u0300-\u036f]/g

/** Case- and accent-insensitive name normalization for the search input. */
function normalizeName(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS, "").toLocaleLowerCase("es-CL")
}

export default function AnalysisCausesTable({
  rows,
  rankOf,
  cumulativeOf,
  catalogCount,
  paretoCauseId = null,
}: Props) {
  const [query, setQuery] = useState("")
  const normalizedQuery = normalizeName(query.trim())
  const filtered = useMemo(
    () =>
      normalizedQuery
        ? rows.filter((row) => normalizeName(row.name).includes(normalizedQuery))
        : rows,
    [rows, normalizedQuery],
  )

  if (rows.length === 0) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        El catálogo de causas está vacío.
      </p>
    )
  }

  return (
    <div className="glass-card min-w-0 rounded-lg p-4 md:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <label htmlFor="cause-search" className="metric-label mb-1 block">
            Buscar causa
          </label>
          <Input
            id="cause-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre de la causa"
            className="h-9"
          />
        </div>
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {COUNT_FORMAT.format(filtered.length)} de {COUNT_FORMAT.format(catalogCount)} causas
        </p>
      </div>

      <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-border/60">
        <table className="w-full min-w-max border-collapse text-sm">
          <caption className="sr-only">
            Catálogo completo de causas con rango, siniestros, participación y
            participación acumulada.
          </caption>
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border/70 text-left">
              <th scope="col" className="px-3 py-2 font-medium text-foreground">
                #
              </th>
              <th scope="col" className="px-3 py-2 font-medium text-foreground">
                Causa
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-foreground">
                Siniestros
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-foreground">
                Participación
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium text-foreground">
                Acumulada
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <Fragment key={row.causeId}>
                <tr className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground tabular-nums">
                    {rankOf.get(row.causeId) ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-foreground">{row.name}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {COUNT_FORMAT.format(row.accidents)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {SHARE_FORMAT.format(row.share)} %
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {SHARE_FORMAT.format(cumulativeOf.get(row.causeId) ?? 0)} %
                  </td>
                </tr>
                {paretoCauseId !== null && row.causeId === paretoCauseId ? (
                  <tr aria-label="Línea del 80 % acumulado" className="text-xs">
                    <td
                      colSpan={5}
                      className="border-b-2 border-chart-1/60 px-3 py-1 font-mono text-right text-chart-1 tabular-nums"
                    >
                      ↑ Estas causas concentran el 80 % de los siniestros del
                      alcance; el resto es la cola larga.
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Ninguna causa coincide con «{query.trim()}».
        </p>
      ) : null}
    </div>
  )
}
