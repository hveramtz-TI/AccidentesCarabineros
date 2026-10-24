interface MatrixRow {
  /** Stable row key (the catalog id). */
  id: number
  label: string
  /** Row total supplied by the caller (a marginal, not a client sum). */
  total: number
}

interface MatrixColumn {
  /** Stable column key (the band string or the outcome id). */
  key: string
  label: string
  /** Column total supplied by the caller (a marginal, not a client sum). */
  total: number
}

interface MatrixCell {
  rowId: number
  columnKey: string
  persons: number
}

interface Props {
  /** Screen-reader caption describing what reconciles with what. */
  caption: string
  /** Label of the corner header cell (e.g. "Sexo"). */
  rowHeaderLabel: string
  /** Rows in display order; `total` renders in the Total column. */
  rows: MatrixRow[]
  /** Columns in fixed display order; `total` renders in the totals row. */
  columns: MatrixColumn[]
  /** Populated cells only; missing (row, column) pairs render as 0. */
  cells: MatrixCell[]
  /** Grand total shown in the corner of the totals row (persons.rows). */
  grandTotal: number
  emptyMessage: string
}

const COUNT_FORMAT = new Intl.NumberFormat("es-CL")

/**
 * Generic person-grain matrix used for sex × age and role × outcome. The two
 * crosstabs are MECE partitions of the same person set, so the caller supplies
 * the API (or structurally-derived) marginals as row and column totals: the
 * row totals equal the `bySex`/role marginal, the column totals equal the
 * `byAge`/outcome marginal, and the corner total equals `persons.rows`. The
 * component renders whatever totals it is given — it never recomputes them
 * from the cells, so a broken reconciliation would surface instead of being
 * hidden. Missing cells render as 0 because SQL `GROUP BY` only returns
 * populated groups; zero cells are never emitted by the API.
 */
export default function PersonMatrix({
  caption,
  rowHeaderLabel,
  rows,
  columns,
  cells,
  grandTotal,
  emptyMessage,
}: Props) {
  if (rows.length === 0) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  const cellOf = new Map(cells.map((cell) => [`${cell.rowId}|${cell.columnKey}`, cell.persons]))

  return (
    <div className="glass-card min-w-0 rounded-lg p-4 md:p-5">
      <div className="max-h-96 overflow-auto rounded-lg border border-border/60">
        <table className="w-full min-w-max border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border/70 text-left">
              <th scope="col" className="px-3 py-2 font-medium text-foreground">
                {rowHeaderLabel}
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-3 py-2 text-right font-medium whitespace-nowrap text-foreground"
                >
                  {column.label}
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right font-medium text-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/40"
              >
                <th scope="row" className="px-3 py-2 text-left font-normal text-foreground">
                  {row.label}
                </th>
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-2 text-right font-mono tabular-nums">
                    {COUNT_FORMAT.format(cellOf.get(`${row.id}|${column.key}`) ?? 0)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-mono font-medium tabular-nums text-foreground">
                  {COUNT_FORMAT.format(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border/70">
              <th scope="row" className="px-3 py-2 text-left font-medium text-foreground">
                Total
              </th>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="px-3 py-2 text-right font-mono font-medium tabular-nums text-foreground"
                >
                  {COUNT_FORMAT.format(column.total)}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-foreground">
                {COUNT_FORMAT.format(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export type { MatrixCell, MatrixColumn, MatrixRow }
