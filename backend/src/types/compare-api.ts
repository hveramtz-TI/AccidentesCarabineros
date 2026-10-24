/**
 * Wire contract for GET /api/compare (schemaVersion 1, EXP-07 T4).
 *
 * The comparator answers "compared to what": up to four territories AT THE
 * CURRENT LEVEL, each with its totals, its share of the WHOLE SCOPE (never a
 * renormalized selection), and a dense monthly trend. Level follows the
 * filters — national scope compares regions, a selected region compares its
 * communes, a selected commune disables the comparator (`400 not_supported`).
 * Filters reuse the dashboard schema, so validation, defaults, auth and error
 * bodies are identical to every other protected endpoint.
 */

import type { DashboardFilters } from "./dashboard-api.js";

export interface CompareMonthPoint {
  /** `YYYY-MM`; dense over the requested period, zero months included. */
  month: string;
  accidents: number;
  fatalities: number;
}

export interface CompareTerritoryTotals {
  accidents: number;
  fatalities: number;
  /**
   * accidents / scope total * 100, one decimal, same `percent()` rounding as
   * every other share. The denominator is ALL territories at the active level
   * (equals `causes.totalAccidents` / panel KPIs for the scope), so the shares
   * of a four-code selection must NOT sum to 100.
   */
  share: number;
}

export interface CompareTerritoryEntry {
  /** API/catalog identifier: region roman (`XIII`) or commune (`XIII-1`). */
  code: string;
  name: string;
  totals: CompareTerritoryTotals;
  /** Dense monthly series over the requested period, calendar order. */
  trend: CompareMonthPoint[];
}

export interface CompareResponse {
  schemaVersion: 1;
  meta: { generatedAt: string };
  level: "region" | "commune";
  period: { from: string; to: string };
  filters: DashboardFilters;
  /** One entry per requested code, in REQUEST ORDER after de-duplication. */
  territories: CompareTerritoryEntry[];
}

export interface CompareService {
  /** `codes` is the raw comma-separated query value; the service parses it. */
  getCompare(filters: DashboardFilters, codes: string | undefined): Promise<CompareResponse>;
  close?(): Promise<void>;
}
