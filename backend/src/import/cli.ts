#!/usr/bin/env node
import { writeFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

import { runImport } from "./import.js";
import { serializeReport, type EntityCounts, type ImportReport } from "./report.js";

interface CliOptions {
  dir: string;
  catalog: string;
  report?: string;
  reset: boolean;
  expect: Partial<EntityCounts>;
}

const DEFAULT_DIR = ".";
const DEFAULT_CATALOG = "frontend/src/data/oversio-identifiers.json";

function parsePositiveInt(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} expects a non-negative integer, got ${JSON.stringify(value)}`);
  }
  return parsed;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dir: DEFAULT_DIR,
    catalog: DEFAULT_CATALOG,
    reset: false,
    expect: {},
  };

  const readValue = (index: number, flag: string, inline?: string): [string, number] => {
    if (inline !== undefined) return [inline, index];
    const next = argv[index + 1];
    if (next === undefined) throw new Error(`${flag} requires a value`);
    return [next, index + 1];
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const equals = arg.indexOf("=");
    const flag = equals === -1 ? arg : arg.slice(0, equals);
    const inline = equals === -1 ? undefined : arg.slice(equals + 1);

    switch (flag) {
      case "--dir": {
        const [value, next] = readValue(index, flag, inline);
        options.dir = value;
        index = next;
        break;
      }
      case "--catalog": {
        const [value, next] = readValue(index, flag, inline);
        options.catalog = value;
        index = next;
        break;
      }
      case "--report": {
        const [value, next] = readValue(index, flag, inline);
        options.report = value;
        index = next;
        break;
      }
      case "--reset":
        options.reset = true;
        break;
      case "--expect-siniestros": {
        const [value, next] = readValue(index, flag, inline);
        options.expect.siniestros = parsePositiveInt(value, flag);
        index = next;
        break;
      }
      case "--expect-personas": {
        const [value, next] = readValue(index, flag, inline);
        options.expect.personas = parsePositiveInt(value, flag);
        index = next;
        break;
      }
      case "--expect-vehiculos": {
        const [value, next] = readValue(index, flag, inline);
        options.expect.vehiculos = parsePositiveInt(value, flag);
        index = next;
        break;
      }
      default:
        throw new Error(`unknown argument ${JSON.stringify(arg)}`);
    }
  }

  return options;
}

function writeReport(path: string | undefined, report: ImportReport): void {
  if (!path) return;
  writeFileSync(path, `${serializeReport(report)}\n`);
}

function printSummary(report: ImportReport, options: CliOptions): void {
  console.log(`status: ${report.status} (${report.durationMs} ms)`);
  console.log(`rows read:    siniestros=${report.rowsRead.siniestros} personas=${report.rowsRead.personas} vehiculos=${report.rowsRead.vehiculos}`);
  console.log(`inserted:     siniestros=${report.inserted.siniestros} personas=${report.inserted.personas} vehiculos=${report.inserted.vehiculos}`);
  console.log(`skipped:      siniestros=${report.skipped.siniestros} personas=${report.skipped.personas} vehiculos=${report.skipped.vehiculos}`);
  console.log(`errors: ${report.errors.length}`);
  console.log(`catalog: regions=${report.catalog.regions} comunas=${report.catalog.comunas} aliases=${report.catalog.aliases}`);
  console.log(`lookups: ${Object.entries(report.lookups).map(([key, value]) => `${key}=${value}`).join(" ")}`);
  console.log(`siniestros without vehicles (${report.vehicleLessSiniestros.length}): ${report.vehicleLessSiniestros.join(", ")}`);
  for (const [entity, expected] of Object.entries(options.expect) as Array<[keyof EntityCounts, number]>) {
    console.log(`expected ${entity}: ${expected}`);
  }
  for (const error of report.errors.slice(0, 20)) {
    console.error(`error [${error.entity}] ${error.file}:${error.rowNumber} ${error.reason}`);
  }
  if (report.errors.length > 20) {
    console.error(`...and ${report.errors.length - 20} more errors`);
  }
}

function exitCode(report: ImportReport, options: CliOptions): number {
  let code = report.status === "ok" ? 0 : 1;
  for (const [entity, expected] of Object.entries(options.expect) as Array<[keyof EntityCounts, number]>) {
    const actual = report.inserted[entity];
    if (actual !== expected) {
      console.error(`expected ${entity}=${expected} but imported ${actual}`);
      code = 1;
    }
  }
  return code;
}

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_NEON_URL) {
    throw new Error("DATABASE_NEON_URL is required in the environment");
  }

  const prisma = new PrismaClient();
  try {
    const report = await runImport(prisma, {
      dir: options.dir,
      catalogPath: options.catalog,
      reset: options.reset,
    });
    writeReport(options.report, report);
    printSummary(report, options);
    return exitCode(report, options);
  } finally {
    await prisma.$disconnect();
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(`import failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
