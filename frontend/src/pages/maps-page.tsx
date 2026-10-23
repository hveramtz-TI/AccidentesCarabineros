/**
 * Mapas page (`/mapas`) — the analytical map workspace (EXP-02 T4).
 *
 * Same map, same URL filters, same requests as the Panel, but the KPI cards give
 * way to the sortable territory table: exact counts, ranking, and keyboard access
 * that a choropleth cannot carry. No extra endpoint and no new query — the rows
 * are the `territories.all` the Panel already receives.
 */

import { useMemo } from "react"

import DashboardStatus from "@/components/dashboard/dashboard-status"
import MapExplorer from "@/components/map/map-explorer"
import TerritoryTable from "@/components/map/territory-table"
import { useDashboardWorkspace } from "@/hooks/use-dashboard-workspace"
import { usePageEffects, pageTitle } from "@/hooks/use-page-effects"
import { useUrlFilters } from "@/hooks/use-url-filters"
import { adaptDashboardResponse } from "@/lib/dashboard-adapter"

export default function MapsPage() {
  usePageEffects(pageTitle("Mapas"))

  const [filters, setFilters] = useUrlFilters()
  const { query, regionSeries, regionSeriesState, loading } = useDashboardWorkspace(filters)

  const data = useMemo(
    () => (query.data ? adaptDashboardResponse(query.data) : null),
    [query.data],
  )

  return (
    <div className="flex w-full flex-col gap-4 p-4 md:p-10">
      <DashboardStatus
        status={query.status}
        error={query.error}
        emptyScope={data?.emptyScope ?? false}
        onRetry={query.retry}
      />

      <section aria-labelledby="map-table-title" className="min-w-0">
        <h2
          id="map-table-title"
          data-page-heading
          tabIndex={-1}
          className="mb-4 border-b border-border/70 pb-3 font-heading text-lg font-semibold text-foreground outline-none"
        >
          Mapa y tabla territorial
        </h2>
        <MapExplorer
          filters={filters}
          onFiltersChange={setFilters}
          regionSeries={regionSeries}
          regionSeriesState={regionSeriesState}
          aside={
            loading ? (
              <div
                role="status"
                aria-label="Cargando territorios"
                className="glass-card h-full min-h-64 animate-pulse rounded bg-muted"
              />
            ) : data ? (
              <div className="flex h-full flex-col gap-2">
                <p className="metric-label">
                  {data.scopeLabel} ·{" "}
                  {data.territories.scope === "region" ? "regiones" : "comunas"}
                </p>
                <TerritoryTable
                  rows={data.territories.all}
                  scope={data.territories.scope}
                  totalAccidents={data.kpis.accidents}
                />
              </div>
            ) : null
          }
        />
      </section>
    </div>
  )
}
