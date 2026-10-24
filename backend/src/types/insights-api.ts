/**
 * Wire contract for GET /api/analysis (schemaVersion 1).
 *
 * The endpoint is additive by section: `causes` is fixed for EXP-03, `vehicles`
 * is appended by EXP-04, and later analysis tabs append new keys without
 * renaming or removing them. Filters reuse `DashboardFilters` so validation and
 * defaults stay identical to GET /api/dashboard.
 */

import type { DashboardFilters } from "./dashboard-api.js";

export interface AnalysisCauseRow {
  causeId: number;
  name: string;
  accidents: number;
  /** accidents / totalAccidents * 100, rounded to one decimal; 0 when total is 0. */
  share: number;
}

/**
 * Siniestro-level severity buckets from `backend/docs/dashboard-metrics.md`
 * §3.6 (`fatal`, `serious`, `minor`, `onlyIlesos`). `unknown` is the defensive
 * bucket for siniestros whose severity columns are all zero/missing; it is
 * only present when the data produces it.
 */
export type AnalysisSeverityBucket = "fatal" | "serious" | "minor" | "onlyIlesos" | "unknown";

export interface AnalysisVehicleTypeRow {
  typeId: number;
  name: string;
  /** COUNT(DISTINCT siniestro_id) for this type in the scope — never vehicle rows. */
  siniestros: number;
  /**
   * siniestros / totalSiniestros * 100, rounded to one decimal; 0 when the
   * total is 0. Non-additive across types: one siniestro can appear under
   * several types, so shares may sum above 100.
   */
  share: number;
}

export interface AnalysisVehicleSeverityRow {
  typeId: number;
  name: string;
  severity: AnalysisSeverityBucket;
  /** COUNT(DISTINCT siniestro_id) for this (type, severity) pair. */
  siniestros: number;
}

export interface AnalysisVehiclesSection {
  /** Siniestros in the filtered scope; always equals `causes.totalAccidents`. */
  totalSiniestros: number;
  /** Siniestros in the scope with no vehicle row. Never counted as a type. */
  withoutVehicleRows: number;
  /** Types present in the scope (siniestros > 0), ordered siniestros DESC then name ASC. */
  byType: AnalysisVehicleTypeRow[];
  /**
   * Type × severity rows ordered by the `byType` order, then the bucket order
   * `fatal, serious, minor, onlyIlesos, unknown`. Per type the rows reconcile
   * exactly with that type's `byType.siniestros`.
   */
  byTypeSeverity: AnalysisVehicleSeverityRow[];
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
  /** EXP-04: vehicle-type distribution and the type × severity matrix. */
  vehicles: AnalysisVehiclesSection;
}

export interface AnalysisService {
  getAnalysis(filters: DashboardFilters): Promise<AnalysisResponse>;
  close?(): Promise<void>;
}
