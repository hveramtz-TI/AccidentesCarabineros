/**
 * View models for the AccidentesCarabineros dashboard.
 *
 * All values come from GET /api/dashboard (verified 2025 data). The
 * territorial catalog (oversio-identifiers.json) remains the canonical
 * source for filter option lists.
 */

export const MONTH_KEYS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

export type MonthKey = (typeof MONTH_KEYS)[number]

export interface Kpis {
  accidents: number
  fatalities: number
  injuries: number
  seriousInjuries: number
}

export interface MonthlyPoint {
  month: string
  accidents: number
  fatalities: number
  injuries: number
  seriousInjuries: number
}

export interface SeverityBucket {
  /** Display label, e.g. "Fatal", "Serious injuries" */
  severity: string
  count: number
}

export interface TerritoryRow {
  /** Region roman code or commune identifier, as provided by the API. */
  code: string
  name: string
  accidents: number
  fatalities: number
}

export interface TerritoryRankingData {
  scope: "region" | "commune"
  rows: TerritoryRow[]
  /** Full series including zero-accident territories (map layer source). */
  all: TerritoryRow[]
  outsideTopCount: number
  outsideAccidents: number
}

export interface CommuneRef {
  name: string
  identifier: string
}

export interface RegionRef {
  name: string
  romanNumber: string
  number: string
  abbreviation: string
  communes: CommuneRef[]
}

export interface TerritoryCatalog {
  regions: RegionRef[]
}

export const ALL_VALUE = "all"

export type PeriodId =
  | typeof ALL_VALUE
  | "q1"
  | "q2"
  | "q3"
  | "q4"

export interface DashboardFilters {
  period: PeriodId
  /** Region romanNumber key, or ALL_VALUE */
  region: string
  /** Commune identifier, or ALL_VALUE */
  commune: string
}

/** Everything the visualizations render, adapted from the API response. */
export interface DashboardData {
  kpis: Kpis
  monthlyTrend: MonthlyPoint[]
  severityDistribution: SeverityBucket[]
  territories: TerritoryRankingData
  /** Human label of the current scope, from the API. */
  scopeLabel: string
  emptyScope: boolean
}

/**
 * Data state of the choropleth series fed to RegionMap. Distinct states keep
 * "still loading", "request failed", and "API without territories.all" from
 * collapsing into a false "no data for this period" (ODD T1).
 */
export type RegionSeriesState = "loading" | "ready" | "error" | "missing-series"
