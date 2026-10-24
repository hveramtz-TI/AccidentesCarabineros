/**
 * State for `/informes` (EXP-06 T4).
 *
 * The page stays presentational: this hook wires the URL filters to the shared
 * `useDashboardQuery` (same params, same abort rules as the Panel — no second
 * data layer) and owns only the local CSV-download state machine. The print
 * action is the browser's own `window.print()`.
 */

import { useCallback, useMemo, useState } from "react"

import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import type { DashboardQueryState } from "@/hooks/use-dashboard-query"
import { useUrlFilters } from "@/hooks/use-url-filters"
import type { TerritoryCsvFailureReason } from "@/lib/reports/csv-download"
import { downloadTerritoryCsv, TerritoryCsvError } from "@/lib/reports/csv-download"
import { adaptDashboardResponse } from "@/lib/dashboard-adapter"
import { filtersToQueryParams } from "@/lib/dashboard-query"
import type { DashboardApiResponse } from "@/types/dashboard-api"
import type { DashboardData, DashboardFilters, TerritoryRow } from "@/types/dashboard"

export interface ReportsDownloadState {
  status: "idle" | "downloading" | "error"
  /** Failure class for the Spanish copy rendered by `ReportActions`. */
  reason: TerritoryCsvFailureReason | null
}

export interface ReportsPageState {
  filters: DashboardFilters
  setFilters: (next: DashboardFilters) => void
  query: DashboardQueryState
  /** Adapted view data (territories, KPIs, Spanish scope label). */
  data: DashboardData | null
  /** Raw report metadata (period, source, generatedAt) straight from the API. */
  meta: DashboardApiResponse["meta"] | null
  loading: boolean
  download: ReportsDownloadState
  /** Territory behind the leading KPI; null renders the empty-scope state. */
  leadingTerritory: TerritoryRow | null
  downloadCsv: () => Promise<void>
  print: () => void
}

export function useReportsPage(): ReportsPageState {
  const [filters, setFilters] = useUrlFilters()
  const params = useMemo(() => filtersToQueryParams(filters), [filters])
  const query = useDashboardQuery(params)

  const data = useMemo(
    () => (query.data ? adaptDashboardResponse(query.data) : null),
    [query.data],
  )

  const [download, setDownload] = useState<ReportsDownloadState>({ status: "idle", reason: null })

  const downloadCsv = useCallback(async () => {
    setDownload({ status: "downloading", reason: null })
    try {
      await downloadTerritoryCsv(filters)
      setDownload({ status: "idle", reason: null })
    } catch (error) {
      const reason: TerritoryCsvFailureReason =
        error instanceof TerritoryCsvError ? error.reason : "network"
      setDownload({ status: "error", reason })
    }
  }, [filters])

  const print = useCallback(() => window.print(), [])

  const leadingTerritory =
    data && !data.emptyScope ? (data.territories.rows[0] ?? null) : null

  return {
    filters,
    setFilters,
    query,
    data,
    meta: query.data?.meta ?? null,
    loading: query.status === "loading" && !query.data,
    download,
    leadingTerritory,
    downloadCsv,
    print,
  }
}
