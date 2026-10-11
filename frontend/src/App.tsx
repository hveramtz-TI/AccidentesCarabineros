import { useMemo, useState } from "react"
import DashboardView from "@/components/dashboard/dashboard-view"
import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import { filtersToQueryParams } from "@/lib/dashboard-query"
import Layout from "@/layout/Layout"
import { ALL_VALUE } from "@/types/dashboard"
import type { DashboardFilters } from "@/types/dashboard"

function App() {
  const [filters, setFilters] = useState<DashboardFilters>({
    period: "all",
    region: ALL_VALUE,
    commune: ALL_VALUE,
  })

  const params = useMemo(() => filtersToQueryParams(filters), [filters])
  const query = useDashboardQuery(params)

  return (
    <Layout>
      <DashboardView
        query={query}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </Layout>
  )
}

export default App
