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
import { usePageMeta } from "@/hooks/use-page-meta"
import { useUrlFilters } from "@/hooks/use-url-filters"
import { hasActiveFilters } from "@/lib/filters-url"

export default function DashboardPage() {
  const [filters, setFilters] = useUrlFilters()
  usePageMeta("home", { filtered: hasActiveFilters(filters) })

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
