/**
 * Minimal RFC 4180 CSV serializer for the aggregate territory export.
 *
 * The whole artifact is built in memory and capped before it leaves the
 * service (≤346 rows, ≤50 KB), so no streaming and no new dependency are
 * needed here. Formula-injection sanitization prefixes any text cell that
 * starts with a spreadsheet operator so Excel/LibreOffice never execute it.
 */

export const CSV_BOM = "\uFEFF";
const CSV_DELIMITER = ",";
const CSV_LINE_END = "\r\n";

const FORMULA_INJECTION_PREFIXES = ["=", "+", "-", "@", "\t", "\r"] as const;

export const TERRITORY_CSV_FILENAME = "accidentes-2025-territorios.csv";
export const TERRITORY_CSV_HEADER_ROW = [
  "nivel",
  "codigo_region",
  "region",
  "codigo_comuna",
  "comuna",
  "siniestros",
  "fallecidos",
  "participacion",
] as const;
export const TERRITORY_CSV_MAX_ROWS = 346;
export const TERRITORY_CSV_MAX_BYTES = 50_000;

/** Reject oversized exports before anything is streamed; maps to the 400 body. */
export class ExportLimitError extends Error {
  readonly field = "export";
  readonly reason = "too_large";

  constructor(message: string) {
    super(message);
    this.name = "ExportLimitError";
  }
}

export function assertTerritoryRowLimit(dataRowCount: number): void {
  if (dataRowCount > TERRITORY_CSV_MAX_ROWS) {
    throw new ExportLimitError(`the territory export exceeds ${TERRITORY_CSV_MAX_ROWS} rows`);
  }
}

export function assertCsvByteLimit(serialized: string): void {
  if (Buffer.byteLength(serialized, "utf8") > TERRITORY_CSV_MAX_BYTES) {
    throw new ExportLimitError("the territory export exceeds 50 KB");
  }
}

function sanitizeTextCell(value: string): string {
  return FORMULA_INJECTION_PREFIXES.some((prefix) => value.startsWith(prefix)) ? `'${value}` : value;
}

/** RFC 4180 quoting: double embedded quotes; quote when the cell holds , " CR or LF. */
export function formatCsvCell(value: string): string {
  const sanitized = sanitizeTextCell(value);
  return /[",\r\n]/.test(sanitized) ? `"${sanitized.replaceAll('"', '""')}"` : sanitized;
}

/** BOM + CRLF-terminated rows; every line, including the header, ends with CRLF. */
export function serializeCsv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  const lines = [header, ...rows].map((cells) => cells.map(formatCsvCell).join(CSV_DELIMITER));
  return CSV_BOM + lines.join(CSV_LINE_END) + CSV_LINE_END;
}
