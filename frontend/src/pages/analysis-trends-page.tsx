/**
 * Tendencias tab (`/analisis/tendencias`, EXP-07 T6).
 *
 * Presentational, like every analysis tab: the layout owns the single
 * `/api/analysis` request and passes `trend` + `weekdayHours` through the
 * outlet context, so switching here issues no new data call. The comparator is
 * the one opt-in exception — `/api/compare` fires only when the user selects
 * codes (ODD scope item 6). URL filters are read again here just to feed the
 * comparator level/params; that never triggers the analysis fetch (the layout
 * already does). Sections are read defensively: a stale server without them
 * shows an explanatory notice instead of a blank or crash.
 */

import { useMemo } from "react"
import { useOutletContext } from "react-router"

import TrendMonthlyBars from "@/components/analysis/trend-monthly-bars"
import TerritoryComparator from "@/components/analysis/territory-comparator"
import WeekdayHourHeatmap from "@/components/analysis/weekday-hour-heatmap"
import type { ComparatorParams } from "@/hooks/use-compare"
import { useUrlFilters } from "@/hooks/use-url-filters"
import { filtersToQueryParams } from "@/lib/dashboard-query"
import type { AnalysisOutletContext } from "@/routes/analysis-layout"
import { ALL_VALUE } from "@/types/dashboard"

function TrendsSkeleton() {
  return (
    <div role="status" aria-label="Cargando tendencias" className="flex min-w-0 flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card rounded-lg p-4 md:p-5">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-48 w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="glass-card rounded-lg p-4 md:p-5">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-48 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="glass-card rounded-lg p-4 md:p-5">
        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-16 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

function StaleServerNotice() {
  return (
    <div role="status" className="glass-card rounded-lg p-4 text-sm text-muted-foreground">
      El servidor aún no expone las series de tendencia ni el mapa de calor.
      Recarga cuando el backend con EXP-07 esté disponible.
    </div>
  )
}

export default function AnalysisTrendsPage() {
  const { data, status } = useOutletContext<AnalysisOutletContext>()
  const [filters] = useUrlFilters()

  const compareParams = useMemo<ComparatorParams>(() => {
    const query = filtersToQueryParams(filters)
    return {
      from: query.from,
      to: query.to,
      regionId: query.regionId,
      communeId: query.communeId,
      region: filters.region === ALL_VALUE ? undefined : filters.region,
      commune: filters.commune === ALL_VALUE ? undefined : filters.commune,
    }
  }, [filters])

  if (!data) {
    return status === "loading" ? <TrendsSkeleton /> : null
  }

  if (!data.trend || !data.weekdayHours) {
    return <StaleServerNotice />
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <TrendMonthlyBars trend={data.trend} />
        <WeekdayHourHeatmap weekdayHours={data.weekdayHours} />
      </div>
      <TerritoryComparator params={compareParams} />
    </div>
  )
}
