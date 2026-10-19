/**
 * Adapts a GET /api/dashboard response to the view models the chart
 * components render. Pure mapping — no derived or invented values.
 */

import { MONTH_KEYS } from "@/types/dashboard"
import type { DashboardData, MonthlyPoint } from "@/types/dashboard"
import type { DashboardApiResponse } from "@/types/dashboard-api"

/** "2025-07" -> "jul."; keeps the raw token if the month is out of range. */
export function isoMonthToLabel(month: string): string {
  const index = Number(month.slice(5, 7)) - 1
  return MONTH_KEYS[index] ?? month
}

const SEVERITY_LABELS: Record<DashboardApiResponse["severity"][number]["key"], string> = {
  fatal: "Con fallecidos",
  serious: "Con lesiones graves",
  minor: "Con lesiones leves o menos graves",
  onlyIlesos: "Solo personas ilesas",
}

export function adaptDashboardResponse(response: DashboardApiResponse): DashboardData {
  const monthlyTrend: MonthlyPoint[] = response.monthlyTrend.map((point) => ({
    month: isoMonthToLabel(point.month),
    accidents: point.accidents,
    fatalities: point.fatalities,
    injuries: point.injuries,
    seriousInjuries: point.seriousInjuries,
  }))

  return {
    kpis: {
      accidents: response.kpis.accidents,
      fatalities: response.kpis.fatalities,
      injuries: response.kpis.injuries,
      seriousInjuries: response.kpis.seriousInjuries,
    },
    monthlyTrend,
    severityDistribution: response.severity.map((bucket) => ({
      severity: SEVERITY_LABELS[bucket.key],
      count: bucket.accidents,
    })),
    territories: {
      scope: response.territories.scope,
      rows: response.territories.items,
      all: response.territories.all,
      outsideTopCount: response.territories.outsideTopCount,
      outsideAccidents: response.territories.outsideAccidents,
    },
    scopeLabel:
      response.meta.scopeLabel === "National (2025)"
        ? "Nacional (2025)"
        : response.meta.scopeLabel,
    emptyScope: response.meta.emptyScope,
  }
}
