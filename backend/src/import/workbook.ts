import { readdirSync } from "node:fs";
import { join } from "node:path";

import ExcelJS from "exceljs";

import { unwrapCellValue } from "./cell.js";

export interface WorkbookPaths {
  siniestros: string;
  personas: string;
  vehiculos: string;
}

export interface SourceRow {
  rowNumber: number;
  values: Record<string, unknown>;
}

function findByPrefix(entries: string[], prefix: string): string | undefined {
  const wanted = prefix.toLowerCase();
  return entries.find(
    (name) =>
      !name.startsWith("~$") &&
      name.toLowerCase().endsWith(".xlsx") &&
      name.toLowerCase().startsWith(wanted),
  );
}

/**
 * Discover the three source workbooks in a directory by name prefix,
 * case-insensitively, tolerating suffixes such as `_2025(1).xlsx`.
 */
export function discoverWorkbooks(dir: string): WorkbookPaths {
  const entries = readdirSync(dir);
  const matches: Record<keyof WorkbookPaths, string | undefined> = {
    siniestros: findByPrefix(entries, "Siniestros"),
    personas: findByPrefix(entries, "Personas"),
    vehiculos: findByPrefix(entries, "Vehiculos"),
  };

  const missing = (Object.keys(matches) as Array<keyof WorkbookPaths>).filter(
    (key) => matches[key] === undefined,
  );
  if (missing.length > 0) {
    throw new Error(
      `in ${dir}: missing workbook(s) starting with ${missing.join(", ")}`,
    );
  }

  return {
    siniestros: join(dir, matches.siniestros as string),
    personas: join(dir, matches.personas as string),
    vehiculos: join(dir, matches.vehiculos as string),
  };
}

/**
 * Stream the first worksheet of an `.xlsx` file, reading columns by header
 * name. Uses the exceljs streaming reader so the 100k+ row sheets stay within
 * memory. Requires every `requiredColumns` name to be present in row 1.
 */
export async function* streamRows(
  filePath: string,
  requiredColumns: readonly string[],
): AsyncGenerator<SourceRow> {
  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    worksheets: "emit",
    sharedStrings: "cache",
  });

  for await (const worksheet of workbook) {
    let header: unknown[] | undefined;
    for await (const row of worksheet) {
      const raw = row.values as unknown as unknown[];
      if (!header) {
        const names = raw.slice(1).map((value) => String(value ?? ""));
        for (const column of requiredColumns) {
          if (!names.includes(column)) {
            throw new Error(`${filePath}: missing required column ${column}`);
          }
        }
        header = raw;
        continue;
      }
      const values: Record<string, unknown> = {};
      for (const column of requiredColumns) {
        values[column] = unwrapCellValue(raw[header.indexOf(column)]);
      }
      yield { rowNumber: row.number, values };
    }
    return; // The source sheets are single-worksheet workbooks.
  }
}
