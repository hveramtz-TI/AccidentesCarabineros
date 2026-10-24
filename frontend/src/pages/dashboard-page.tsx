/**
 * Panel page (`/`) — the original dashboard composition (EXP-00 T1/T3).
 *
 * Filters come from the URL, and the request rules live in
 * `useDashboardWorkspace`, so `/` and `/mapas` can never disagree about what the
 * map is showing. Layout, KPI cards, charts, and the loading/error/empty states
 * are unchanged from before routing.
 */

import DashboardView from "@/components/dashboard/dashboard-view"
import { useDashboardWorkspace } from "@/hooks/use-dashboard-workspace"
import { usePageEffects, pageTitle } from "@/hooks/use-page-effects"
import { useUrlFilters } from "@/hooks/use-url-filters"

export default function DashboardPage() {
  usePageEffects(pageTitle())

  const [filters, setFilters] = useUrlFilters()
  const { query, regionSeries, regionSeriesState } = useDashboardWorkspace(filters)

  return (
    <DashboardView
      query={query}
      filters={filters}
      onFiltersChange={setFilters}
      regionSeries={regionSeries}
      regionSeriesState={regionSeriesState}
    />
  )
}
