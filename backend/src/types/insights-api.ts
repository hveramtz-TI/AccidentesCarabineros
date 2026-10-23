/**
 * Wire contract for GET /api/analysis (schemaVersion 1).
 *
 * The endpoint is additive by section: `causes` is fixed for EXP-03 and later
 * analysis tabs append new keys without renaming or removing it. Filters reuse
 * `DashboardFilters` so validation and defaults stay identical to
 * GET /api/dashboard.
 */

import type { DashboardFilters } from "./dashboard-api.js";

export interface AnalysisCauseRow {
  causeId: number;
  name: string;
  accidents: number;
  /** accidents / totalAccidents * 100, rounded to one decimal; 0 when total is 0. */
  share: number;
}

export interface AnalysisResponse {
  schemaVersion: 1;
  meta: { generatedAt: string };
  filters: DashboardFilters;
  causes: {
    totalAccidents: number;
    /** Every catalog cause, ordered by accidents DESC then name ASC. */
    rows: AnalysisCauseRow[];
  };
}

export interface AnalysisService {
  getAnalysis(filters: DashboardFilters): Promise<AnalysisResponse>;
  close?(): Promise<void>;
}
