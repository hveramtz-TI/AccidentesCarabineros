/**
 * Sortable territory table for `/mapas` (EXP-02 T3, EXP-06 T6).
 *
 * One row per territory returned by `GET /api/dashboard` (`territories.all`),
 * zeros included: a zero is a real value, not "no data". The rank column is
 * derived after sorting and is never sortable itself, and the share denominator
 * is the filtered accident total so the column always reads against the scope the
 * user actually selected. Each row also links to its ficha territorial in
 * `/informes`, carrying the current period and the row's territory as URL
 * filters; the link never touches the sort logic.
 */

import { useMemo, useState } from "react"
import { Link } from "react-router"
import type { To } from "react-router"

import { useUrlFilters } from "@/hooks/use-url-filters"
import { regions } from "@/lib/data"
import { filtersToSearchParams } from "@/lib/filters-url"
import { ALL_VALUE } from "@/types/dashboard"
import type { DashboardFilters, PeriodId, TerritoryRow } from "@/types/dashboard"

type SortKey = "name" | "accidents" | "fatalities" | "share"
type SortDirection = "asc" | "desc"

interface Props {
  rows: TerritoryRow[]
  scope: "region" | "commune"
  /** Filtered accident total; the share denominator for every row. */
  totalAccidents: number
}

const HEAD_BUTTON_CLASS =
  "inline-flex items-center gap-1 rounded-sm font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

const numberFormatter = new Intl.NumberFormat("es-CL")

function shareFormatter(share: number): string {
  return `${share.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

/** Region name behind a commune identifier such as `XIII-1`. */
function regionNameFor(communeId: string): string | null {
  const roman = communeId.split("-")[0]
  return regions.find((region) => region.romanNumber === roman)?.name ?? null
}

/**
 * `/informes` destination for one row (EXP-06 T6): region rows carry the
 * region code, commune rows carry the commune identifier (its parent region is
 * re-derived by `parseFilters`), always with the currently selected period.
 * Serialized through `filtersToSearchParams` so the URL shape stays exactly
 * what `filters-url.ts` encodes — no hand-built query strings.
 */
function fichaDestination(row: TerritoryRow, scope: "region" | "commune", period: PeriodId): To {
  const filters: DashboardFilters =
    scope === "region"
      ? { period, region: row.code, commune: ALL_VALUE }
      : { period, region: ALL_VALUE, commune: row.code }
  return { pathname: "/informes", search: filtersToSearchParams(filters).toString() }
}

/**
 * `share` is `accidents / totalAccidents` with a constant denominator, so its
 * order is identical to the accident order — sorting it separately would only
 * invent a second code path.
 */
function compare(left: TerritoryRow, right: TerritoryRow, key: SortKey): number {
  switch (key) {
    case "name":
      return left.name.localeCompare(right.name, "es")
    case "accidents":
    case "fatalities":
      return left[key] - right[key]
    case "share":
      return left.accidents - right.accidents
  }
}

export default function TerritoryTable({ rows, scope, totalAccidents }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("accidents")
  const [direction, setDirection] = useState<SortDirection>("desc")
  // The URL is the filter store: the ficha links carry the active period.
  const [currentFilters] = useUrlFilters()

  const sorted = useMemo(() => {
    const factor = direction === "asc" ? 1 : -1
    return [...rows].sort((a, b) => compare(a, b, sortKey) * factor || a.name.localeCompare(b.name, "es"))
  }, [rows, sortKey, direction])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    // Counts read best high-to-low; names read best A-to-Z.
    setDirection(key === "name" ? "asc" : "desc")
  }

  if (rows.length === 0) {
    return (
      <p role="status" className="glass-card p-4 text-sm text-muted-foreground">
        La respuesta no trajo territorios para este filtro.
      </p>
    )
  }

  const columns: Array<{ key: SortKey | "rank" | "ficha"; label: string; numeric: boolean }> = [
    { key: "rank", label: "#", numeric: false },
    { key: "name", label: scope === "region" ? "Región" : "Comuna", numeric: false },
    { key: "accidents", label: "Siniestros", numeric: true },
    { key: "fatalities", label: "Fallecidos", numeric: true },
    { key: "share", label: "Participación", numeric: true },
    { key: "ficha", label: "Ficha", numeric: false },
  ]

  return (
    <div className="glass-card h-full min-h-0 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Territorios ordenables por nombre, siniestros, fallecidos y participación
          sobre el total del filtro.
        </caption>
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="border-b border-border/70">
            {columns.map((column) => {
              const sortable = column.key !== "rank" && column.key !== "ficha"
              const active = sortable && column.key === sortKey
              const ariaSort = active ? (direction === "asc" ? "ascending" : "descending") : sortable ? "none" : undefined

              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className={`px-3 py-2 font-normal ${column.numeric ? "text-right" : "text-left"}`}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key as SortKey)}
                      className={`${HEAD_BUTTON_CLASS} ${column.numeric ? "justify-end" : ""} ${active ? "text-foreground" : ""}`}
                    >
                      {column.label}
                      <span aria-hidden="true" className="text-xs">
                        {active ? (direction === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  ) : (
                    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {column.label}
                    </span>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => {
            const share = totalAccidents === 0 ? 0 : (row.accidents / totalAccidents) * 100
            const regionName = scope === "commune" ? regionNameFor(row.code) : null

            return (
              <tr key={row.code} className="border-b border-border/40 last:border-0">
                <td className="px-3 py-2 align-top tabular-nums text-muted-foreground">{index + 1}</td>
                <td className="px-3 py-2 align-top">
                  <span className="block font-medium text-foreground">{row.name}</span>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {row.code}
                    {regionName ? ` · ${regionName}` : ""}
                  </span>
                </td>
                <td className="px-3 py-2 text-right align-top tabular-nums">
                  {numberFormatter.format(row.accidents)}
                </td>
                <td className="px-3 py-2 text-right align-top tabular-nums">
                  {numberFormatter.format(row.fatalities)}
                </td>
                <td className="px-3 py-2 text-right align-top tabular-nums">{shareFormatter(share)}</td>
                <td className="px-3 py-2 align-top">
                  <Link
                    to={fichaDestination(row, scope, currentFilters.period)}
                    // stopPropagation guards the click from any ancestor
                    // handler; preventDefault is deliberately not called so
                    // the Link (and the keyboard) navigates normally.
                    onClick={(event) => event.stopPropagation()}
                    className="rounded-sm font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Ver ficha
                    <span className="sr-only"> de {row.name}</span>
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
