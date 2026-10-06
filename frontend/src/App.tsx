import { useMemo, useState } from "react"
import DashboardFiltersBar from "@/components/dashboard/dashboard-filters"
import DashboardView from "@/components/dashboard/dashboard-view"
import { deriveDashboardData } from "@/lib/data"
import Layout from "@/layout/Layout"
import { ALL_VALUE } from "@/types/dashboard"
import type { DashboardFilters } from "@/types/dashboard"

function App() {
  const [filters, setFilters] = useState<DashboardFilters>({
    period: "all",
    region: ALL_VALUE,
    commune: ALL_VALUE,
  })

  const data = useMemo(() => deriveDashboardData(filters), [filters])

  return (
    <Layout toolbar={<DashboardFiltersBar filters={filters} onChange={setFilters} />}>
      <DashboardView data={data} />
    </Layout>
  )
}

export default App
