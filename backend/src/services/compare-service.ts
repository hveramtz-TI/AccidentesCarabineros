/**
 * Comparator aggregate service (EXP-07 T4).
 *
 * `/api/compare` returns up to four territories at the level implied by the
 * filters: national scope compares regions, a selected region compares its
 * communes, and a selected commune is rejected with `400 not_supported` (the
 * UI hides the comparator there). Every fact stays inside PostgreSQL: one
 * catalog-level aggregate provides the code membership, the names, the
 * totals, and the scope denominator for the shares, and one monthly aggregate
 * provides the per-code trends. Validation reuses the dashboard's own
 * `validateDashboardFilters`, and territory resolution mirrors the dashboard
 * repository because that factory is private.
 */

import { Prisma, PrismaClient } from "@prisma/client";

import { prisma as sharedPrisma } from "../db/conection.js";
import { DashboardValidationError, type DashboardFilters } from "../types/dashboard-api.js";
import type {
  CompareMonthPoint,
  CompareResponse,
  CompareService,
  CompareTerritoryEntry,
} from "../types/compare-api.js";
import type { ResolvedTerritory } from "./dashboard-service.js";
import { validateDashboardFilters } from "./dashboard-service.js";

/** One territory at the active level with its scope totals. */
export interface CompareTerritoryAggregate {
  code: string;
  name: string;
  accidents: number;
  fatalities: number;
}

/** One sparse monthly row for one requested code. */
export interface CompareTrendRow {
  month: string;
  accidents: number;
  fatalities: number;
}

export interface CompareRepository {
  resolveTerritory(filters: DashboardFilters): Promise<ResolvedTerritory>;
  /** Every catalog territory at the resolved level (national → 16 regions; region → all its communes), zeros included. */
  loadTerritoryTotals(filters: DashboardFilters, territory: ResolvedTerritory): Promise<CompareTerritoryAggregate[]>;
  /** Monthly rows for the SELECTED codes only; sparse (populated months). */
  loadTerritoryTrends(filters: DashboardFilters, codes: string[]): Promise<Array<CompareTrendRow & { code: string }>>;
  close?(): Promise<void>;
}

/** Field/reason validation failure mapped to the shared 400 body by the route. */
export class CompareValidationError extends Error {
  readonly field: string;
  readonly reason: string;

  constructor(field: string, reason: string, message: string) {
    super(message);
    this.name = "CompareValidationError";
    this.field = field;
    this.reason = reason;
  }
}

const MAX_CODES = 4;
/** Roman-numeral characters with the optional numeric commune suffix (`XIII` or `XIII-1`). */
const CODE_SHAPE = /^[IVX]+(-[0-9]+)?$/;

/**
 * Trim, drop empties, and de-duplicate (first occurrence wins, request order
 * preserved). The 1..4 bound applies AFTER de-duplication, so `XIII,XIII` is a
 * one-code request.
 */
function parseCodes(raw: string | undefined): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const part of (raw ?? "").split(",")) {
    const code = part.trim();
    if (!code) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

/**
 * A code that carries a commune suffix is only selectable at commune level,
 * and a bare roman only at region level; the roman prefix must additionally
 * belong to the active scope. Shape-valid codes absent from the level's catalog
 * rows are `not_found`; a valid commune code whose parent region is outside
 * the scope is `out_of_scope` (it exists in the catalog, just not here).
 */
function classifyCode(code: string, level: "region" | "commune", rows: CompareTerritoryAggregate[]): string | null {
  const inRows = rows.some((row) => row.code === code);
  if (level === "region") {
    if (code.includes("-")) return "not_found";
    return inRows ? null : "not_found";
  }
  if (!code.includes("-")) return "not_found";
  const parentRoman = code.slice(0, code.lastIndexOf("-"));
  const scopeRoman = rows[0]?.code.split("-")[0] ?? null;
  if (scopeRoman && parentRoman !== scopeRoman) return "out_of_scope";
  return inRows ? null : "not_found";
}

function countNumber(value: bigint | number | null | undefined): number {
  const result = Number(value ?? 0);
  if (!Number.isSafeInteger(result) || result < 0) throw new Error("aggregate count is outside the safe integer range");
  return result;
}

function percent(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1_000) / 10;
}

/** Dense months over the requested period — the same UTC walk as the dashboard trend. */
function denseMonths(from: string, to: string, rows: CompareTrendRow[]): CompareMonthPoint[] {
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  const months: CompareMonthPoint[] = [];
  const cursor = new Date(`${from.slice(0, 7)}-01T00:00:00.000Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00.000Z`);
  while (cursor <= end) {
    const month = cursor.toISOString().slice(0, 7);
    const row = byMonth.get(month);
    months.push({ month, accidents: row?.accidents ?? 0, fatalities: row?.fatalities ?? 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function createCompareService(
  repository: CompareRepository = createPrismaCompareRepository(),
  now: () => Date = () => new Date(),
): CompareService {
  return {
    close: () => repository.close?.() ?? Promise.resolve(),
    async getCompare(filters, codesRaw) {
      validateDashboardFilters(filters);
      const codes = parseCodes(codesRaw);
      if (codes.length === 0) {
        throw new CompareValidationError("codes", "required", "at least one territory code is required");
      }
      if (codes.length > MAX_CODES) {
        throw new CompareValidationError("codes", "too_many_codes", `the comparator accepts at most ${MAX_CODES} territories`);
      }
      for (const code of codes) {
        if (!CODE_SHAPE.test(code)) {
          throw new CompareValidationError("codes", "invalid_format", `${code} is not a territory identifier`);
        }
      }

      const territory = await repository.resolveTerritory(filters);
      if (territory.communeId) {
        throw new CompareValidationError("codes", "not_supported", "the comparator is not available for a commune scope");
      }
      const level: "region" | "commune" = territory.territoryScope;

      // One level-wide aggregate is the whole catalog authority: membership,
      // names, totals, and the scope denominator for the shares. The trends
      // aggregate runs ONLY after every code is accepted, so a rejected list
      // never pays for a second fact query.
      const rows = await repository.loadTerritoryTotals(filters, territory);
      for (const code of codes) {
        const problem = classifyCode(code, level, rows);
        if (problem) {
          const message =
            problem === "out_of_scope"
              ? `${code} is outside the selected region`
              : `${code} is not a ${level === "region" ? "region" : "commune"} identifier of the current scope`;
          throw new CompareValidationError("codes", problem, message);
        }
      }
      const trendRows = await repository.loadTerritoryTrends(filters, codes);

      const scopeTotal = rows.reduce((sum, row) => sum + row.accidents, 0);
      const trendsByCode = new Map<string, CompareTrendRow[]>();
      for (const row of trendRows) {
        const list = trendsByCode.get(row.code);
        if (list) list.push({ month: row.month, accidents: row.accidents, fatalities: row.fatalities });
        else trendsByCode.set(row.code, [{ month: row.month, accidents: row.accidents, fatalities: row.fatalities }]);
      }

      const territories: CompareTerritoryEntry[] = codes.map((code) => {
        const row = rows.find((candidate) => candidate.code === code)!;
        return {
          code,
          name: row.name,
          totals: {
            accidents: row.accidents,
            fatalities: row.fatalities,
            share: percent(row.accidents, scopeTotal),
          },
          trend: denseMonths(filters.from, filters.to, trendsByCode.get(code) ?? []),
        };
      });

      const effectiveRegionId = filters.communeId ? territory.regionId : filters.regionId;
      return {
        schemaVersion: 1,
        meta: { generatedAt: now().toISOString() },
        level,
        period: { from: filters.from, to: filters.to },
        filters: { from: filters.from, to: filters.to, regionId: effectiveRegionId, communeId: filters.communeId },
        territories,
      };
    },
  };
}

function createPrismaCompareRepository(prisma: PrismaClient = sharedPrisma): CompareRepository {
  return {
    close: () => prisma.$disconnect(),
    async resolveTerritory(filters) {
      if (filters.communeId) {
        const commune = await prisma.comuna.findUnique({
          where: { comunaId: filters.communeId },
          select: { nombreNormal: true, regionId: true },
        });
        if (!commune) throw new DashboardValidationError("communeId", "not_found", "communeId does not exist");
        return {
          scopeLabel: commune.nombreNormal,
          territoryScope: "commune",
          regionId: commune.regionId,
          communeId: filters.communeId,
        };
      }
      if (filters.regionId !== null) {
        const region = await prisma.region.findUnique({
          where: { regionId: filters.regionId },
          select: { nombreNormal: true, regionId: true },
        });
        if (!region) throw new DashboardValidationError("regionId", "not_found", "regionId does not exist");
        return {
          scopeLabel: region.nombreNormal,
          territoryScope: "commune",
          regionId: region.regionId,
          communeId: null,
        };
      }
      return { scopeLabel: "National (2025)", territoryScope: "region", regionId: null, communeId: null };
    },

    async loadTerritoryTotals(filters, territory) {
      const dates = Prisma.sql`s.fecha >= ${filters.from}::date AND s.fecha <= ${filters.to}::date`;
      if (territory.territoryScope === "region") {
        const rows = await prisma.$queryRaw<Array<{ code: string; name: string; accidents: bigint; fatalities: bigint }>>(Prisma.sql`
          SELECT r.numero_romano AS code, r.nombre_normal AS name,
            COUNT(s.siniestro_id) AS accidents,
            COALESCE(SUM(s.fallecidos), 0) AS fatalities
          FROM region r
          LEFT JOIN comuna c ON c.region_id = r.region_id
          LEFT JOIN siniestro s ON s.comuna_id = c.comuna_id AND ${dates}
          GROUP BY r.region_id, r.numero_romano, r.nombre_normal`);
        return rows.map((row) => ({ code: row.code, name: row.name, accidents: countNumber(row.accidents), fatalities: countNumber(row.fatalities) }));
      }
      const regionClause = territory.regionId === null
        ? Prisma.empty
        : Prisma.sql`WHERE c.region_id = ${territory.regionId}`;
      const rows = await prisma.$queryRaw<Array<{ code: string; name: string; accidents: bigint; fatalities: bigint }>>(Prisma.sql`
        SELECT c.comuna_id AS code, c.nombre_normal AS name,
          COUNT(s.siniestro_id) AS accidents,
          COALESCE(SUM(s.fallecidos), 0) AS fatalities
        FROM comuna c
        LEFT JOIN siniestro s ON s.comuna_id = c.comuna_id AND ${dates}
        ${regionClause}
        GROUP BY c.comuna_id, c.nombre_normal`);
      return rows.map((row) => ({ code: row.code, name: row.name, accidents: countNumber(row.accidents), fatalities: countNumber(row.fatalities) }));
    },

    async loadTerritoryTrends(filters, codes) {
      const dates = Prisma.sql`s.fecha >= ${filters.from}::date AND s.fecha <= ${filters.to}::date`;
      // Codes reached this point through level membership, so they are all at
      // one level; the level decides which column is the series key. The join
      // path is the approved `siniestro.comuna_id → comuna.region_id`, never
      // `zona`, and `codes` binds as an array parameter (no string SQL).
      const communeLevel = codes.some((code) => code.includes("-"));
      const key = communeLevel ? Prisma.sql`c.comuna_id` : Prisma.sql`r.numero_romano`;
      const codeMatch = communeLevel
        ? Prisma.sql`c.comuna_id = ANY(${codes}::text[])`
        : Prisma.sql`r.numero_romano = ANY(${codes}::text[])`;
      const rows = await prisma.$queryRaw<Array<{ code: string; month: string; accidents: bigint; fatalities: bigint }>>(Prisma.sql`
        SELECT ${key} AS code,
          to_char(s.fecha, 'YYYY-MM') AS month,
          COUNT(*) AS accidents,
          COALESCE(SUM(s.fallecidos), 0) AS fatalities
        FROM siniestro s
        JOIN comuna c ON c.comuna_id = s.comuna_id
        JOIN region r ON r.region_id = c.region_id
        WHERE ${dates} AND ${codeMatch}
        GROUP BY ${key}, to_char(s.fecha, 'YYYY-MM')
        ORDER BY code, month`);
      return rows.map((row) => ({ code: row.code, month: row.month, accidents: countNumber(row.accidents), fatalities: countNumber(row.fatalities) }));
    },
  };
}
