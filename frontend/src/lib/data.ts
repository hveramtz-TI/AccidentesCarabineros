/**
 * Fixture loaders and filter derivation for the dashboard.
 *
 * Client-side only: everything is computed from bundled synthetic JSON.
 * The territorial catalog (oversio-identifiers.json) is the canonical,
 * non-duplicated source of regions/communes; fixture rows join to it by
 * identifier (e.g. "XIII-9").
 */

import catalogJson from "@/data/oversio-identifiers.json"
import summaryJson from "@/data/dashboard-summary.example.json"
import territorialJson from "@/data/territorial-ranking.example.json"

import type {
  DashboardData,
  DashboardFilters,
  DashboardSummary,
  Kpis,
  MonthlyPoint,
  PeriodId,
  RegionRef,
  SeverityBucket,
  TerritorialFixture,
  TerritorialRow,
  TerritoryCatalog,
} from "@/types/dashboard"
import { ALL_VALUE } from "@/types/dashboard"

const catalog = catalogJson as unknown as TerritoryCatalog
const summary = summaryJson as unknown as DashboardSummary
const territorial = territorialJson as unknown as TerritorialFixture

interface PlaceRef {
  commune: string
  region: string
  regionRoman: string
}

const placeByIdentifier = new Map<string, PlaceRef>()
for (const region of catalog.regions) {
  for (const commune of region.communes) {
    placeByIdentifier.set(commune.identifier, {
      commune: commune.name,
      region: region.name,
      regionRoman: region.romanNumber,
    })
  }
}

/** Joined fixture rows, sorted by accidents descending. */
export const territorialRows: TerritorialRow[] = territorial.rows
  .map((row) => {
    const place = placeByIdentifier.get(row.identifier) ?? {
      commune: "Unknown commune",
      region: "Unknown region",
      regionRoman: "--",
    }
    return { ...row, ...place }
  })
  .sort((a, b) => b.accidents - a.accidents)

export const regions: RegionRef[] = catalog.regions

export interface Option {
  value: string
  label: string
}

export const periodOptions: Option[] = [
  { value: "all", label: "Full period" },
  { value: "q1", label: "Q1 (Jan–Mar)" },
  { value: "q2", label: "Q2 (Apr–Jun)" },
  { value: "q3", label: "Q3 (Jul–Sep)" },
  { value: "q4", label: "Q4 (Oct–Dec)" },
]

export const regionOptions: Option[] = [
  { value: ALL_VALUE, label: "All regions" },
  ...regions.map((r) => ({ value: r.romanNumber, label: `${r.romanNumber} — ${r.name}` })),
]

export function communeOptions(region: string): Option[] {
  if (region === ALL_VALUE) {
    return [{ value: ALL_VALUE, label: "All communes" }]
  }
  const regionRef = regions.find((r) => r.romanNumber === region)
  return [
    { value: ALL_VALUE, label: "All communes" },
    ...(regionRef?.communes.map((c) => ({
      value: c.identifier,
      label: `${c.name} (${c.identifier})`,
    })) ?? []),
  ]
}

const PERIOD_WINDOWS: Record<PeriodId, readonly [number, number]> = {
  all: [0, 12],
  q1: [0, 3],
  q2: [3, 6],
  q3: [6, 9],
  q4: [9, 12],
}

/** Largest-remainder split of `total` across months using a relative shape. */
function spread(total: number, shape: number[]): number[] {
  const shapeSum = shape.reduce((a, b) => a + b, 0)
  if (shape.length === 0 || shapeSum <= 0 || total <= 0) {
    return shape.map(() => 0)
  }
  const raw = shape.map((w) => (total * w) / shapeSum)
  const base = raw.map((v) => Math.floor(v))
  let remainder = total - base.reduce((a, b) => a + b, 0)
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  let k = 0
  while (remainder > 0 && order.length > 0) {
    base[order[k % order.length]!.i] += 1
    remainder -= 1
    k += 1
  }
  return base
}

const SEVERITY_LABELS = {
  fatal: "Fatal",
  serious: "Serious injuries",
  minor: "Minor injuries",
  property: "Property damage",
} as const

export function deriveDashboardData(filters: DashboardFilters): DashboardData {
  const [start, end] = PERIOD_WINDOWS[filters.period]
  const window = summary.monthlyTrend.slice(start, end)
  const shape = {
    accidents: window.map((p) => p.accidents),
    fatalities: window.map((p) => p.fatalities),
    injuries: window.map((p) => p.injuries),
  }

  const inScope = territorialRows.filter((row) => {
    if (filters.commune !== ALL_VALUE) return row.identifier === filters.commune
    if (filters.region !== ALL_VALUE) return row.regionRoman === filters.region
    return true
  })

  const isNational = filters.commune === ALL_VALUE && filters.region === ALL_VALUE

  let kpis: Kpis
  let monthlyTrend: MonthlyPoint[]
  let severityDistribution: SeverityBucket[]

  if (isNational) {
    kpis = {
      accidents: shapeSumOf(window, "accidents"),
      fatalities: shapeSumOf(window, "fatalities"),
      injuries: shapeSumOf(window, "injuries"),
      activeCases:
        filters.period === "all"
          ? summary.kpis.activeCases
          : Math.round(shapeSumOf(window, "accidents") * 0.066),
    }
    monthlyTrend = window
    severityDistribution = rescaleSeverity(
      summary.severityDistribution,
      kpis.accidents,
    )
  } else {
    const accidents = inScope.reduce((a, r) => a + r.accidents, 0)
    const fatalities = inScope.reduce((a, r) => a + r.fatalities, 0)
    const injuries = inScope.reduce((a, r) => a + r.injuries, 0)
    kpis = {
      accidents,
      fatalities,
      injuries,
      activeCases: Math.round(accidents * 0.066),
    }
    monthlyTrend = window.map((p, i) => ({
      month: p.month,
      accidents: spread(accidents, shape.accidents)[i] ?? 0,
      fatalities: spread(fatalities, shape.fatalities)[i] ?? 0,
      injuries: spread(injuries, shape.injuries)[i] ?? 0,
    }))
    const buckets = {
      fatal: inScope.reduce((a, r) => a + r.severity.fatal, 0),
      serious: inScope.reduce((a, r) => a + r.severity.serious, 0),
      minor: inScope.reduce((a, r) => a + r.severity.minor, 0),
      property: inScope.reduce((a, r) => a + r.severity.property, 0),
    }
    severityDistribution = [
      { severity: SEVERITY_LABELS.fatal, count: buckets.fatal },
      { severity: SEVERITY_LABELS.serious, count: buckets.serious },
      { severity: SEVERITY_LABELS.minor, count: buckets.minor },
      { severity: SEVERITY_LABELS.property, count: buckets.property },
    ]
  }

  const scopeLabel =
    filters.commune !== ALL_VALUE
      ? placeByIdentifier.get(filters.commune)?.commune ?? filters.commune
      : filters.region !== ALL_VALUE
        ? filters.region
        : "National (synthetic fixture)"

  return {
    kpis,
    monthlyTrend,
    severityDistribution,
    territories: inScope,
    scopeLabel,
    synthetic: summary.synthetic === true && territorial.synthetic === true,
    emptyScope: !isNational && inScope.length === 0,
  }
}

function shapeSumOf(window: MonthlyPoint[], key: "accidents" | "fatalities" | "injuries"): number {
  return window.reduce((a, p) => a + p[key], 0)
}

/** Keep severity buckets summing to the filtered accident total. */
function rescaleSeverity(buckets: SeverityBucket[], total: number): SeverityBucket[] {
  const bucketSum = buckets.reduce((a, b) => a + b.count, 0)
  if (bucketSum === 0) return buckets
  const shares = spread(total, buckets.map((b) => b.count))
  return buckets.map((b, i) => ({ severity: b.severity, count: shares[i] ?? 0 }))
}

export const syntheticBanner = {
  periodLabel: summary.periodLabel,
  source: summary.source,
}
