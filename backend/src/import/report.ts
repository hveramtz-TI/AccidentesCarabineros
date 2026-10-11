export interface EntityCounts {
  siniestros: number;
  personas: number;
  vehiculos: number;
}

export interface ImportErrorEntry {
  file: string;
  rowNumber: number;
  entity: "siniestro" | "persona" | "vehiculo";
  reason: string;
}

export interface ImportReport {
  status: "ok" | "failed";
  rowsRead: EntityCounts;
  inserted: EntityCounts;
  skipped: EntityCounts;
  errors: ImportErrorEntry[];
  /** Source `id_fuente` values imported without any vehicle rows. */
  vehicleLessSiniestros: string[];
  lookups: Record<string, number>;
  catalog: { regions: number; comunas: number; aliases: number };
  durationMs: number;
}

/**
 * Serialize the report defensively: BigInt is not JSON-serializable and throws
 * by default, so any BigInt is rendered as a string.
 */
export function serializeReport(report: ImportReport): string {
  return JSON.stringify(
    report,
    (_key, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  );
}
