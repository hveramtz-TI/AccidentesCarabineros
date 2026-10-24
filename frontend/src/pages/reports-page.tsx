/**
 * Informes page (`/informes`) — the territory report (EXP-06 T4).
 *
 * Presentational: the URL is the filter store, and the one request to
 * `/api/dashboard` goes through the shared `useDashboardQuery` with exactly the
 * params the Panel uses (see `useReportsPage`). The page composes the report
 * header, KPI summary, territory preview, and the CSV/print actions; loading,
 * error, empty-scope, and retry follow the pattern of the other pages.
 */

import DashboardFiltersBar from "@/components/dashboard/dashboard-filters"
import DashboardStatus from "@/components/dashboard/dashboard-status"
import ReportActions from "@/components/reports/report-actions"
import ReportHeader from "@/components/reports/report-header"
import ReportKpiSummary from "@/components/reports/report-kpi-summary"
import ReportTerritoryPreviewTable from "@/components/reports/report-territory-preview-table"
import { usePageMeta } from "@/hooks/use-page-meta"
import { useReportsPage } from "@/hooks/use-reports-page"
import { hasActiveFilters } from "@/lib/filters-url"

function ReportsSkeleton() {
  return (
    <div role="status" aria-label="Cargando informe" className="flex min-w-0 flex-col gap-4">
      <div className="glass-card h-24 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="glass-card h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="glass-card h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

export default function ReportsPage() {
  const { filters, setFilters, query, data, meta, loading, download, leadingTerritory, downloadCsv, print } =
    useReportsPage()

  usePageMeta("reports", { filtered: hasActiveFilters(filters) })

  return (
    <div className="flex w-full flex-col gap-4 p-4 md:p-10">
      <DashboardStatus
        status={query.status}
        error={query.error}
        emptyScope={data?.emptyScope ?? false}
        onRetry={query.retry}
        subject="del informe"
      />

      <section aria-label="Filtros del informe" className="glass-card min-w-0 p-4 print:hidden">
        <DashboardFiltersBar filters={filters} onChange={setFilters} />
      </section>

      <div className="min-w-0">
        <p className="metric-label hidden print:mb-3 print:block">
          AccidentesCarabineros · Informe territorial — Siniestros de tránsito
          2025 · Fuente: datos oficiales de Carabineros de Chile
        </p>
        <h1
          id="informes-title"
          data-page-heading
          tabIndex={-1}
          className="border-b border-border/70 pb-3 font-heading text-lg font-semibold text-foreground outline-none"
        >
          Informe territorial — Siniestros de tránsito 2025
        </h1>
      </div>

      {data && meta ? (
        <>
          <ReportHeader meta={meta} scopeLabel={data.scopeLabel} />

          <ReportActions
            download={download}
            disabled={query.status === "loading" || query.status === "error"}
            onDownload={() => {
              void downloadCsv()
            }}
            onPrint={print}
          />

          <ReportKpiSummary
            kpis={data.kpis}
            territoryCount={data.territories.all.length}
            leading={leadingTerritory}
          />

          <ReportTerritoryPreviewTable
            rows={data.territories.rows}
            totalAccidents={data.kpis.accidents}
          />
        </>
      ) : loading ? (
        <ReportsSkeleton />
      ) : null}
    </div>
  )
}
