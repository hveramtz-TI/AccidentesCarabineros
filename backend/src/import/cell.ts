/** A row-level validation failure: the row is skipped and recorded, not fatal. */
export class RowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RowValidationError";
  }
}

/**
 * Unwrap an exceljs cell value into a plain JS value.
 *
 * Formula cells surface a `.result`; rich text surfaces `.richText` parts;
 * hyperlinks surface `.text`. Everything else (string, number, boolean, Date,
 * null) is returned untouched.
 */
export function unwrapCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("result" in record) return unwrapCellValue(record.result);
    if (Array.isArray(record.richText)) {
      return (record.richText as Array<{ text?: string }>)
        .map((part) => part.text ?? "")
        .join("");
    }
    if (typeof record.text === "string") return record.text;
    if ("error" in record) return `#${String(record.error)}`;
  }
  return value;
}

/** Required text: trims surrounding whitespace, rejects blanks. */
export function cellToRequiredText(value: unknown, field: string): string {
  if (value === null || value === undefined) {
    throw new RowValidationError(`${field} is blank`);
  }
  const text = String(value).trim();
  if (text.length === 0) {
    throw new RowValidationError(`${field} is blank`);
  }
  return text;
}

/**
 * Optional text: trims surrounding whitespace, blank/null becomes null.
 * Numeric cells (for example `KM`) keep their plain string form, decimals and
 * all, without the artificial trailing `.0`.
 */
export function cellToOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }
  const text = String(value).trim();
  return text.length === 0 ? null : text;
}

/** Integer coercion used by identifiers, counts and ages. */
export function cellToInteger(value: unknown, field: string): number {
  if (value === null || value === undefined) {
    throw new RowValidationError(`${field} is blank, expected an integer`);
  }
  // `Number("   ")` is 0, so whitespace-only cells must be rejected explicitly.
  if (typeof value === "string" && value.trim().length === 0) {
    throw new RowValidationError(`${field} is blank, expected an integer`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new RowValidationError(`${field} must be an integer, got ${JSON.stringify(value)}`);
  }
  return parsed;
}

/** Non-negative count coercion (FALLECIDO, GRAVE, M_GRAVE, LEVE, ILESO). */
export function cellToCount(value: unknown, field: string): number {
  const count = cellToInteger(value, field);
  if (count < 0) {
    throw new RowValidationError(`${field} must be >= 0, got ${count}`);
  }
  return count;
}

/** Age coercion: blank -> null, otherwise constrained to 1..120. */
export function cellToAge(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const age = cellToInteger(value, "EDAD");
  if (age < 1 || age > 120) {
    throw new RowValidationError(`EDAD must be between 1 and 120, got ${age}`);
  }
  return age;
}

/** Prisma keys child rows with BigInt source identifiers. */
export function cellToBigInt(value: unknown, field: string): bigint {
  return BigInt(cellToInteger(value, field));
}

/**
 * Format an identifier cell as an integer string, so Excel's numeric storage
 * never leaks a trailing `.0` (`812812` stays `812812`).
 */
export function cellToIntegerString(value: unknown, field: string): string {
  return String(cellToInteger(value, field));
}
