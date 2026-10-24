/**
 * Wire contract for GET /api/meta (schemaVersion 1).
 *
 * Dataset-level metadata only: coverage, live row counts, the approved caveat
 * list, and a generation timestamp. Never rows, never PII, never a new metric.
 * Mirrored in frontend/src/lib/api/meta.ts — keep both in sync.
 */

export interface MetaRowCounts {
  siniestros: number;
  personas: number;
  vehiculos: number;
}

export interface MetaResponse {
  schemaVersion: 1;
  source: "carabineros-2025-normalized";
  synthetic: false;
  coverage: { from: string; to: string };
  rowCounts: MetaRowCounts;
  caveats: string[];
  generatedAt: string;
}

export interface MetaService {
  getMeta(): Promise<MetaResponse>;
  close?(): Promise<void>;
}
