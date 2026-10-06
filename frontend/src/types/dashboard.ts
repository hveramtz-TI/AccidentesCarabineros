/**
 * Data contract for the AccidentesCarabineros dashboard.
 *
 * All bundled fixtures are SYNTHETIC example data (`synthetic: true`,
 * `source: "example-synthetic"`). Month labels are generic calendar keys
 * ("Jan".."Dec") and make no claim about a real reporting period or year.
 * Do not present fixture values as official statistics.
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
  activeCases: number
}

export interface MonthlyPoint {
  month: MonthKey
  accidents: number
  fatalities: number
  injuries: number
}

export interface SeverityBucket {
  /** Display label, e.g. "Fatal", "Serious injuries" */
  severity: string
  count: number
}

export interface SeverityBreakdown {
  fatal: number
  serious: number
  minor: number
  property: number
}

export interface DashboardSummary {
  source: string
  synthetic: boolean
  /** Generic period descriptor — never a real year claim */
  periodLabel: string
  kpis: Kpis
  monthlyTrend: MonthlyPoint[]
  severityDistribution: SeverityBucket[]
}

/** Raw territorial fixture row keyed by an oversio identifier ("XIII-9"). */
export interface TerritorialRowRaw {
  identifier: string
  accidents: number
  fatalities: number
  injuries: number
  severity: SeverityBreakdown
}

/** Fixture row joined with the canonical territorial catalog. */
export interface TerritorialRow extends TerritorialRowRaw {
  region: string
  regionRoman: string
  commune: string
}

export interface TerritorialFixture {
  source: string
  synthetic: boolean
  rows: TerritorialRowRaw[]
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

/** Everything the visualizations render, derived from filters. */
export interface DashboardData {
  kpis: Kpis
  monthlyTrend: MonthlyPoint[]
  severityDistribution: SeverityBucket[]
  /** Rows in scope, sorted by accidents desc (ranking source). */
  territories: TerritorialRow[]
  /** Human label of the current scope, for chart subtitles. */
  scopeLabel: string
  synthetic: boolean
  /** True when the scope has no fixture rows (partial synthetic coverage). */
  emptyScope: boolean
}
