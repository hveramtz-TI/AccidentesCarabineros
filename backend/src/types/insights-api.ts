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

/**
 * Person age bands — the exact `AGE_BANDS` order of the dashboard service.
 * `unknown` is the band for NULL `edad`; it is a real, visible band, never an
 * imputed one. Changing these strings changes the approved metric definition
 * (`dashboard-metrics.md` §3.12) and requires approval.
 */
export type AnalysisAgeBand = "0-17" | "18-25" | "26-40" | "41-64" | "65+" | "unknown";

export interface AnalysisPersonSexRow {
  sexId: number;
  /** Catalog `nombre_normal` (e.g. `MASCULINO`, `SE IGNORA`). */
  name: string;
  /** Persona rows with this sex in the scope. */
  persons: number;
  /** persons / `persons.rows` * 100, one decimal; 0 when rows is 0. */
  share: number;
}

export interface AnalysisPersonAgeRow {
  bucket: AnalysisAgeBand;
  persons: number;
  share: number;
}

export interface AnalysisPersonSexAgeRow {
  sexId: number;
  name: string;
  bucket: AnalysisAgeBand;
  /** COUNT(*) of persona rows for this (sex, band) cell — person grain. */
  persons: number;
}

export interface AnalysisPersonQualityOutcomeRow {
  qualityId: number;
  qualityName: string;
  outcomeId: number;
  outcomeName: string;
  persons: number;
}

/**
 * EXP-05: person-grain demographics. Every persona row has exactly one `sexo`
 * (NOT NULL FK) and falls in exactly one age band (the SQL CASE is total), and
 * exactly one role and one outcome (both NOT NULL FKs), so `bySexAge` and
 * `byQualityOutcome` are each a MECE partition of the person set: `rows` is the
 * sum of either matrix and every marginal is exact, the same structural
 * reconciliation EXP-04 built for the vehicle matrix. Counts are PERSONS, never
 * siniestros, and the denominator is `rows`, never `causes.totalAccidents`.
 */
export interface AnalysisPersonsSection {
  rows: number;
  /** Marginal of the `unknown` age band; equals its `byAge` entry. */
  unknownAge: number;
  /** Marginal of the catalog `SE IGNORA` sex (sexId 3); equals its `bySex` entry. */
  unknownSex: number;
  /** Sex marginals ordered sexId ASC; `SE IGNORA` included when the data has it. */
  bySex: AnalysisPersonSexRow[];
  /** Always the full six `AGE_BANDS`, in order, including zero-valued bands. */
  byAge: AnalysisPersonAgeRow[];
  /** Populated cells only, ordered sexId ASC then the `byAge` band order. */
  bySexAge: AnalysisPersonSexAgeRow[];
  /**
   * Populated cells only, ordered persons DESC, then qualityId ASC, then
   * outcomeId ASC. Person-level outcome (`resultado_persona`), distinct from
   * the siniestro-level severity buckets used by `vehicles` (SEV-1).
   */
  byQualityOutcome: AnalysisPersonQualityOutcomeRow[];
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
  /** EXP-05: person-grain demographics and the two person crosstabs. */
  persons: AnalysisPersonsSection;
}

export interface AnalysisService {
  getAnalysis(filters: DashboardFilters): Promise<AnalysisResponse>;
  close?(): Promise<void>;
}
