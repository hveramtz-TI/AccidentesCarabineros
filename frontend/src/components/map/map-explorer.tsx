/**
 * Reusable map workspace (EXP-02 T2).
 *
 * One layout, two compositions: the map keeps its approved 50/50 desktop slot and
 * mobile stack, and the right column is always the filter bar plus whatever the
 * page needs — KPI cards on the Panel, the territory table on Mapas. The map is a
 * cross-filter: clicking a region sets the Region filter and clears the commune,
 * exactly like the dropdown cascade.
 */

import type { ReactNode } from "react"

import DashboardFiltersBar from "@/components/dashboard/dashboard-filters"
import RegionMap from "@/components/dashboard/region-map"
import { ALL_VALUE } from "@/types/dashboard"
import type { DashboardFilters, RegionSeriesState, TerritoryRow } from "@/types/dashboard"

type Props = {
  filters: DashboardFilters
  onFiltersChange: (next: DashboardFilters) => void
  /** Full national region series (period view) driving the choropleth. */
  regionSeries: TerritoryRow[] | null
  regionSeriesState: RegionSeriesState
  /** Page-specific content under the filters (KPI cards, territory table, …). */
  aside: ReactNode
}

const MapExplorer = (props: Props) => {
  return (
    // Mobile-first stack (map block then filters/aside); the approved
    // desktop 50/50 absolute layout is restored from lg up. The previous
    // all-widths absolute container was the known mobile-stacking
    // regression carried from the map-placeholder slice.
    <section className="flex w-full flex-col gap-4 lg:relative lg:h-dvh lg:gap-0">
      <div className="h-[60dvh] w-full lg:absolute lg:inset-y-0 lg:left-10 lg:h-full lg:w-1/2">
        <RegionMap
          series={props.regionSeries}
          state={props.regionSeriesState}
          activeRegion={props.filters.region}
          onSelectRegion={(romanNumber) =>
            // Same cascade contract as the Region dropdown: a region click
            // clears the commune; clicking the active region toggles it off.
            props.onFiltersChange({
              ...props.filters,
              region: romanNumber ?? ALL_VALUE,
              commune: ALL_VALUE,
            })
          }
        />
      </div>
      <div className="flex w-full flex-col gap-4 lg:absolute lg:inset-y-0 lg:right-10 lg:w-1/2 lg:py-2">
        <div className="glass-card shrink-0 p-4">
          <DashboardFiltersBar
            filters={props.filters}
            onChange={props.onFiltersChange}
          />
        </div>
        <div className="min-h-0 flex-1">{props.aside}</div>
      </div>
    </section>
  )
}

export default MapExplorer
