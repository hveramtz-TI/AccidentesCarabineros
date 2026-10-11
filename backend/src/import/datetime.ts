/**
 * Excel date/time coercion.
 *
 * Excel serial dates use the 1900 date system with the well-known leap-year
 * bug; for the 2025 range the effective epoch is 1899-12-30. All arithmetic is
 * done in UTC so a local timezone can never shift the stored day or time.
 */

const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;

const MONTH_NUMBER_BY_NAME: Readonly<Record<string, number>> = {
  ENERO: 1,
  FEBRERO: 2,
  MARZO: 3,
  ABRIL: 4,
  MAYO: 5,
  JUNIO: 6,
  JULIO: 7,
  AGOSTO: 8,
  SEPTIEMBRE: 9,
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12,
};

export interface TimeParts {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

/** Convert an Excel date serial to a UTC-midnight Date holding the date part. */
export function excelSerialToUtcDate(serial: number): Date {
  const wholeDays = Math.floor(serial);
  return new Date(EXCEL_EPOCH_UTC_MS + wholeDays * MS_PER_DAY);
}

/** Convert an Excel day fraction (0..1) to time parts. */
export function dayFractionToTimeParts(fraction: number): TimeParts {
  const normalized = ((fraction % 1) + 1) % 1;
  const safeMs = Math.round(normalized * MS_PER_DAY) % MS_PER_DAY;
  const hours = Math.floor(safeMs / 3_600_000);
  const minutes = Math.floor((safeMs % 3_600_000) / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1000);
  const milliseconds = safeMs % 1000;
  return { hours, minutes, seconds, milliseconds };
}

/** Convert an Excel day fraction to a Date whose UTC time part is the time of day. */
export function dayFractionToUtcTime(fraction: number): Date {
  const { hours, minutes, seconds, milliseconds } = dayFractionToTimeParts(fraction);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds, milliseconds));
}

/**
 * Read a FECHA cell. A numeric cell is an Excel serial; a Date cell already
 * produced by the reader is read through its UTC parts.
 */
export function cellToUtcDate(value: number | Date): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  return excelSerialToUtcDate(value);
}

/** Read a HORA cell, tolerating either a day fraction or a JS Date. */
export function cellToUtcTime(value: number | Date): Date {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(
        1970,
        0,
        1,
        value.getUTCHours(),
        value.getUTCMinutes(),
        value.getUTCSeconds(),
        value.getUTCMilliseconds(),
      ),
    );
  }
  return dayFractionToUtcTime(value);
}

/** Map a Spanish month label (ENERO..DICIEMBRE) to its 1-based month number. */
export function monthNumberFromLabel(label: string): number | undefined {
  const key = label.trim().toUpperCase();
  return MONTH_NUMBER_BY_NAME[key];
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Format a Date as an ISO calendar date using its UTC parts. */
export function formatUtcDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Format a Date as a 24h time (second precision) using its UTC parts. */
export function formatUtcTime(date: Date): string {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}
