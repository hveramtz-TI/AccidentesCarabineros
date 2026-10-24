/**
 * Analysis aggregate service (EXP-03 T2, extended by EXP-04 T3 and EXP-05 T3).
 *
 * `/api/analysis` returns every catalog cause, including the zero-accident tail,
 * from one LEFT JOIN aggregate, plus the vehicle-type distribution and the
 * type × severity matrix from two more SQL aggregates, plus the person-grain
 * sex × age and role × outcome crosstabs from two further SQL aggregates, plus
 * the EXP-07 monthly trend and the dense weekday × 3-hour heatmap from two more
 * (the heatmap loader pairs its cells with the exact-midnight count). Fact
 * rows never leave PostgreSQL. Validation is the dashboard's own
 * `validateDashboardFilters`, so `/api/analysis` and `/api/dashboard` reject the
 * same inputs with the same 400 contract.
 */

import { Prisma, PrismaClient } from "@prisma/client";

import { prisma as sharedPrisma } from "../db/conection.js";
import { DashboardValidationError, type DashboardFilters } from "../types/dashboard-api.js";
import type {
  AnalysisAgeBand,
  AnalysisPersonsSection,
  AnalysisResponse,
  AnalysisService,
  AnalysisSeverityBucket,
  AnalysisTrendMonth,
  AnalysisTrendSection,
  AnalysisVehicleSeverityRow,
  AnalysisWeekdayHourCell,
  AnalysisWeekdayHoursSection,
} from "../types/insights-api.js";
import { validateDashboardFilters, type ResolvedTerritory } from "./dashboard-service.js";

/** Re-exported so repository fakes can name the wire row shapes directly. */
export type { AnalysisTrendMonth, AnalysisWeekdayHourCell } from "../types/insights-api.js";
export type AnalysisWeekdayHourCellCount = AnalysisWeekdayHourCell;

/** One sparse read of the weekday × 3-hour aggregate plus the midnight count. */
export interface AnalysisWeekdayHoursAggregate {
  cells: AnalysisWeekdayHourCellCount[];
  midnightArtifactCount: number;
}

export interface AnalysisCauseCount {
  causeId: number;
  name: string;
  accidents: number;
}

/**
 * One (vehicle type, severity bucket) cell from the SQL matrix. The buckets
 * partition siniestros (§3.6 of dashboard-metrics.md), so per type the cells
 * sum exactly to the type's distinct siniestros.
 */
export interface AnalysisVehicleSeverityCount {
  typeId: number;
  name: string;
  severity: AnalysisSeverityBucket;
  siniestros: number;
}

/**
 * One (sex, age band) cell from the SQL matrix. `persons` is `COUNT(*)` over
 * persona rows (person grain — never distinct siniestros). Every persona row
 * has exactly one `sexo_id` (NOT NULL FK) and lands in exactly one band (the
 * CASE maps NULL to `unknown` and covers the whole integer line), so the cells
 * are a MECE partition of the person set and the marginals derived from them
 * are exact.
 */
export interface AnalysisPersonSexAgeCount {
  sexId: number;
  name: string;
  bucket: AnalysisAgeBand;
  persons: number;
}

/**
 * One (role, outcome) cell from the SQL matrix. `calidad_persona_id` and
 * `resultado_persona_id` are NOT NULL FKs to complete catalogs, so this matrix
 * is a second MECE partition of the same person set: it must sum to the very
 * same `rows` as the sex × age matrix.
 */
export interface AnalysisPersonQualityOutcomeCount {
  qualityId: number;
  qualityName: string;
  outcomeId: number;
  outcomeName: string;
  persons: number;
}

export interface AnalysisRepository {
  resolveTerritory(filters: DashboardFilters): Promise<ResolvedTerritory>;
  loadCauseCounts(filters: DashboardFilters, territory: ResolvedTerritory): Promise<AnalysisCauseCount[]>;
  loadVehicleSeverityCounts(filters: DashboardFilters, territory: ResolvedTerritory): Promise<AnalysisVehicleSeverityCount[]>;
  loadSiniestrosWithoutVehicleCount(filters: DashboardFilters, territory: ResolvedTerritory): Promise<number>;
  loadSexAgeCounts(filters: DashboardFilters, territory: ResolvedTerritory): Promise<AnalysisPersonSexAgeCount[]>;
  loadQualityOutcomeCounts(filters: DashboardFilters, territory: ResolvedTerritory): Promise<AnalysisPersonQualityOutcomeCount[]>;
  loadMonthlyTrend(filters: DashboardFilters, territory: ResolvedTerritory): Promise<AnalysisTrendMonth[]>;
  loadWeekdayHourCells(filters: DashboardFilters, territory: ResolvedTerritory): Promise<AnalysisWeekdayHoursAggregate>;
  close?(): Promise<void>;
}

function percent(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1_000) / 10;
}

function byAccidentsThenName(a: AnalysisCauseCount, b: AnalysisCauseCount): number {
  if (a.accidents !== b.accidents) return b.accidents - a.accidents;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/** Display order of the severity buckets inside the matrix, matching the keys. */
const SEVERITY_RANK: Record<AnalysisSeverityBucket, number> = {
  fatal: 0,
  serious: 1,
  minor: 2,
  onlyIlesos: 3,
  unknown: 4,
};

function bySiniestrosThenName(a: { siniestros: number; name: string }, b: { siniestros: number; name: string }): number {
  if (a.siniestros !== b.siniestros) return b.siniestros - a.siniestros;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

interface VehicleTypeTotal {
  typeId: number;
  name: string;
  siniestros: number;
}

/**
 * Derive `byType` by summing the severity cells per type. The buckets partition
 * siniestros at siniestro level, so each distinct siniestro lands in exactly
 * one cell per type and the sum equals `COUNT(DISTINCT siniestro_id)` — this
 * is what makes the per-type reconciliation structural instead of hopeful.
 * Only types with at least one siniestro in the scope are returned; `share` is
 * added by the caller, which knows the scope denominator.
 */
function deriveByType(cells: AnalysisVehicleSeverityCount[]): VehicleTypeTotal[] {
  const totals = new Map<number, VehicleTypeTotal>();
  for (const cell of cells) {
    if (cell.siniestros <= 0) continue;
    const current = totals.get(cell.typeId);
    if (current) current.siniestros += cell.siniestros;
    else totals.set(cell.typeId, { typeId: cell.typeId, name: cell.name, siniestros: cell.siniestros });
  }
  return [...totals.values()].sort(bySiniestrosThenName);
}

function orderMatrix(
  cells: AnalysisVehicleSeverityCount[],
  byType: VehicleTypeTotal[],
): AnalysisVehicleSeverityRow[] {
  const typeRank = new Map(byType.map((row, index) => [row.typeId, index]));
  return cells
    .filter((cell) => cell.siniestros > 0)
    .sort(
      (a, b) =>
        (typeRank.get(a.typeId) ?? 0) - (typeRank.get(b.typeId) ?? 0) ||
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
    )
    .map(({ typeId, name, severity, siniestros }) => ({ typeId, name, severity, siniestros }));
}

/**
 * Verbatim copy of the dashboard's approved `AGE_BANDS` (dashboard-service.ts
 * line 64; that const is module-private, and importing it would couple the two
 * services). Changing these strings is a metric-definition change requiring
 * approval (`dashboard-metrics.md` §3.12), which is why the order is pinned by
 * the analysis tests rather than shared by reference.
 */
const AGE_BANDS: readonly AnalysisAgeBand[] = ["0-17", "18-25", "26-40", "41-64", "65+", "unknown"];
const AGE_BAND_RANK = new Map<string, number>(AGE_BANDS.map((band, index) => [band, index]));

/**
 * Catalog row 3 is `SE IGNORA` (verified live: unknown sex is a real catalog
 * row, never a NULL `sexo_id`). `unknownSex` is that sexId's marginal.
 */
const UNKNOWN_SEX_ID = 3;

/**
 * Derive the whole persons section from the two MECE crosstab matrices, the
 * same structural approach EXP-04 used for `byType`:
 *
 * - Every persona row has exactly one `sexo_id` (NOT NULL FK to a 3-row
 *   catalog) and falls in exactly one age band (NULL `edad` → `unknown`, else
 *   the ordered integer CASE, exhaustive via `ELSE '65+'`). So the sex × age
 *   cells partition the person set: `rows` is their sum and `bySex`/`byAge`
 *   marginals are exact by construction.
 * - Every persona row also has exactly one role and one outcome (both NOT NULL
 *   FKs), so the role × outcome cells partition the SAME set and must sum to
 *   the same `rows` — asserted by tests for every fixture.
 * - Zero-valued sex × age cells never surface: a SQL `GROUP BY` only produces
 *   populated groups, and any defensive zero from a custom repository is
 *   filtered here (the EXP-04 matrix rule). `byAge` is the exception on
 *   purpose: all six approved bands are always returned, zero-valued included,
 *   so the bands stay visible in every scope.
 */
function buildPersonsSection(
  sexAgeCells: AnalysisPersonSexAgeCount[],
  qualityOutcomeCells: AnalysisPersonQualityOutcomeCount[],
): AnalysisPersonsSection {
  const populated = sexAgeCells.filter((cell) => cell.persons > 0);
  const rows = populated.reduce((sum, cell) => sum + cell.persons, 0);

  const sexTotals = new Map<number, { sexId: number; name: string; persons: number }>();
  const ageTotals = new Map<string, number>();
  for (const cell of populated) {
    const sex = sexTotals.get(cell.sexId);
    if (sex) sex.persons += cell.persons;
    else sexTotals.set(cell.sexId, { sexId: cell.sexId, name: cell.name, persons: cell.persons });
    ageTotals.set(cell.bucket, (ageTotals.get(cell.bucket) ?? 0) + cell.persons);
  }

  const bySex = [...sexTotals.values()]
    .sort((a, b) => a.sexId - b.sexId)
    .map(({ sexId, name, persons }) => ({ sexId, name, persons, share: percent(persons, rows) }));

  const byAge = AGE_BANDS.map((band) => {
    const persons = ageTotals.get(band) ?? 0;
    return { bucket: band, persons, share: percent(persons, rows) };
  });

  const bySexAge = [...populated]
    .sort(
      (a, b) =>
        a.sexId - b.sexId ||
        (AGE_BAND_RANK.get(a.bucket) ?? AGE_BANDS.length) - (AGE_BAND_RANK.get(b.bucket) ?? AGE_BANDS.length),
    )
    .map(({ sexId, name, bucket, persons }) => ({ sexId, name, bucket, persons }));

  const byQualityOutcome = [...qualityOutcomeCells]
    .filter((cell) => cell.persons > 0)
    .sort(
      (a, b) =>
        b.persons - a.persons ||
        a.qualityId - b.qualityId ||
        a.outcomeId - b.outcomeId,
    )
    .map(({ qualityId, qualityName, outcomeId, outcomeName, persons }) => ({
      qualityId,
      qualityName,
      outcomeId,
      outcomeName,
      persons,
    }));

  return {
    rows,
    unknownAge: ageTotals.get("unknown") ?? 0,
    unknownSex: sexTotals.get(UNKNOWN_SEX_ID)?.persons ?? 0,
    bySex,
    byAge,
    bySexAge,
    byQualityOutcome,
  };
}

/**
 * EXP-07 time dimensions. The weekday set is ISO (1 = Monday, user-approved
 * week start) and the buckets are the dashboard's own 3-hour grid (0, 3, …,
 * 21; `dashboard-service.ts` HOUR_STARTS). They are repeated here for the same
 * reason as AGE_BANDS above: sharing them would couple the two services.
 */
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const HOUR_BUCKETS = [0, 3, 6, 9, 12, 15, 18, 21] as const;

/**
 * Dense months over the requested period — the same UTC walk the dashboard's
 * approved `denseMonths` performs, so a filtered quarter returns exactly its
 * months and the full-year default returns 12.
 */
function denseTrendMonths(from: string, to: string, rows: AnalysisTrendMonth[]): AnalysisTrendMonth[] {
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  const months: AnalysisTrendMonth[] = [];
  const cursor = new Date(`${from.slice(0, 7)}-01T00:00:00.000Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00.000Z`);
  while (cursor <= end) {
    const month = cursor.toISOString().slice(0, 7);
    months.push(byMonth.get(month) ?? { month, accidents: 0, fatalities: 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

function buildTrendSection(from: string, to: string, rows: AnalysisTrendMonth[]): AnalysisTrendSection {
  const months = denseTrendMonths(from, to, rows);
  return {
    months,
    totalAccidents: months.reduce((sum, month) => sum + month.accidents, 0),
    totalFatalities: months.reduce((sum, month) => sum + month.fatalities, 0),
  };
}

/**
 * 56 dense cells (7 ISO weekdays × 8 buckets), zeros included: `hora` is NOT
 * NULL across the whole 2025 import (verified live), so every siniestro lands
 * in exactly one cell and there is deliberately no `unknown`-time cell. The
 * exact-midnight count rides along unchanged as the disclosure the UI renders
 * next to the heatmap; those records are never moved out of 00–03.
 */
function buildWeekdayHoursSection(aggregate: AnalysisWeekdayHoursAggregate): AnalysisWeekdayHoursSection {
  const byKey = new Map(aggregate.cells.map((cell) => [`${cell.weekday}:${cell.bucket}`, cell.accidents]));
  const cells: AnalysisWeekdayHourCell[] = [];
  for (const weekday of WEEKDAYS) {
    for (const bucket of HOUR_BUCKETS) {
      cells.push({ weekday, bucket, accidents: byKey.get(`${weekday}:${bucket}`) ?? 0 });
    }
  }
  return {
    cells,
    midnightArtifactCount: aggregate.midnightArtifactCount,
    totalAccidents: cells.reduce((sum, cell) => sum + cell.accidents, 0),
  };
}

export function createAnalysisService(
  repository: AnalysisRepository = createPrismaAnalysisRepository(),
  now: () => Date = () => new Date(),
): AnalysisService {
  return {
    close: () => repository.close?.() ?? Promise.resolve(),
    async getAnalysis(filters) {
      validateDashboardFilters(filters);
      const territory = await repository.resolveTerritory(filters);
      const [counts, severityCells, withoutVehicleRows, sexAgeCells, qualityOutcomeCells, monthlyRows, weekdayAggregate] = await Promise.all([
        repository.loadCauseCounts(filters, territory),
        repository.loadVehicleSeverityCounts(filters, territory),
        repository.loadSiniestrosWithoutVehicleCount(filters, territory),
        repository.loadSexAgeCounts(filters, territory),
        repository.loadQualityOutcomeCounts(filters, territory),
        repository.loadMonthlyTrend(filters, territory),
        repository.loadWeekdayHourCells(filters, territory),
      ]);
      const totalAccidents = counts.reduce((sum, row) => sum + row.accidents, 0);
      // SQL already orders; sorting again keeps the contract deterministic for
      // any repository implementation (including the test seam).
      const rows = [...counts].sort(byAccidentsThenName);
      // Every siniestro has exactly one causa, so the cause total IS the scope
      // siniestro count; the vehicles denominator reuses it rather than running
      // a third count (contract: totalSiniestros === causes.totalAccidents).
      const byType = deriveByType(severityCells);
      const vehicles = {
        totalSiniestros: totalAccidents,
        withoutVehicleRows,
        byType: byType.map(({ typeId, name, siniestros }) => ({
          typeId,
          name,
          siniestros,
          share: percent(siniestros, totalAccidents),
        })),
        byTypeSeverity: orderMatrix(severityCells, byType),
      };
      // A selected commune wins over regionId and the region is derived from it,
      // exactly like GET /api/dashboard's meta.filters.
      const effectiveRegionId = filters.communeId ? territory.regionId : filters.regionId;

      return {
        schemaVersion: 1,
        meta: { generatedAt: now().toISOString() },
        filters: {
          from: filters.from,
          to: filters.to,
          regionId: effectiveRegionId,
          communeId: filters.communeId,
        },
        causes: {
          totalAccidents,
          rows: rows.map(({ causeId, name, accidents }) => ({
            causeId,
            name,
            accidents,
            share: percent(accidents, totalAccidents),
          })),
        },
        vehicles,
        persons: buildPersonsSection(sexAgeCells, qualityOutcomeCells),
        trend: buildTrendSection(filters.from, filters.to, monthlyRows),
        weekdayHours: buildWeekdayHoursSection(weekdayAggregate),
      };
    },
  };
}

function countNumber(value: bigint | number | null | undefined): number {
  const result = Number(value ?? 0);
  if (!Number.isSafeInteger(result) || result < 0) throw new Error("aggregate count is outside the safe integer range");
  return result;
}

/**
 * Territory resolution mirrors the dashboard repository (commune wins over
 * region) because that repository factory is private. The validation itself is
 * shared, not copied.
 */
function createPrismaAnalysisRepository(prisma: PrismaClient = sharedPrisma): AnalysisRepository {
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

    async loadCauseCounts(filters, territory) {
      const restriction = siniestroTerritoryClause(territory);
      const rows = await prisma.$queryRaw<Array<{ causeId: number; name: string; accidents: bigint }>>(Prisma.sql`
        SELECT ca.causa_id AS "causeId", ca.nombre_normal AS "name", COUNT(s.siniestro_id) AS "accidents"
        FROM causa ca
        LEFT JOIN siniestro s ON s.causa_id = ca.causa_id
          AND s.fecha >= ${filters.from}::date AND s.fecha <= ${filters.to}::date${restriction}
        GROUP BY ca.causa_id, ca.nombre_normal
        ORDER BY "accidents" DESC, "name" ASC`);
      return rows.map((row) => ({
        causeId: row.causeId,
        name: row.name,
        accidents: countNumber(row.accidents),
      }));
    },

    async loadVehicleSeverityCounts(filters, territory) {
      const restriction = siniestroTerritoryClause(territory);
      // One aggregate builds the whole matrix: COUNT(DISTINCT v.siniestro_id)
      // per (type, bucket), never vehicle rows. The CASE is verbatim the
      // approved siniestro-level severity definition (dashboard-metrics §3.6,
      // same as dashboard-service querySeverity), with ELSE kept as `unknown`
      // so the matrix reconciles instead of silently dropping rows.
      const rows = await prisma.$queryRaw<Array<{
        typeId: number;
        name: string;
        severity: AnalysisSeverityBucket;
        siniestros: bigint;
      }>>(Prisma.sql`
        SELECT tv.tipo_vehiculo_id AS "typeId", tv.nombre_normal AS "name",
          CASE
            WHEN s.fallecidos > 0 THEN 'fatal'
            WHEN s.lesionados_graves > 0 THEN 'serious'
            WHEN s.lesionados_menos_graves > 0 OR s.lesionados_leves > 0 THEN 'minor'
            WHEN s.ilesos > 0 THEN 'onlyIlesos'
            ELSE 'unknown'
          END AS severity,
          COUNT(DISTINCT v.siniestro_id) AS "siniestros"
        FROM tipo_vehiculo tv
        JOIN vehiculo v ON v.tipo_vehiculo_id = tv.tipo_vehiculo_id
        JOIN siniestro s ON s.siniestro_id = v.siniestro_id
          AND s.fecha >= ${filters.from}::date AND s.fecha <= ${filters.to}::date${restriction}
        GROUP BY 1, 2, 3`);
      return rows.map((row) => ({
        typeId: row.typeId,
        name: row.name,
        severity: row.severity,
        siniestros: countNumber(row.siniestros),
      }));
    },

    async loadSiniestrosWithoutVehicleCount(filters, territory) {
      const restriction = siniestroTerritoryClause(territory);
      const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM siniestro s
        WHERE s.fecha >= ${filters.from}::date AND s.fecha <= ${filters.to}::date${restriction}
          AND NOT EXISTS (SELECT 1 FROM vehiculo v WHERE v.siniestro_id = s.siniestro_id)`);
      return countNumber(rows[0]?.count);
    },

    async loadSexAgeCounts(filters, territory) {
      const restriction = siniestroTerritoryClause(territory);
      // One aggregate builds the whole sex × age matrix: COUNT(*) over persona
      // rows (person grain — never distinct siniestros) grouped by sex and the
      // age CASE. The CASE is **verbatim** the dashboard's approved band
      // definition (dashboard-service queryAgeBands, `dashboard-metrics.md`
      // §3.12): NULL edad → `unknown`, then 17/25/40/64 boundaries, ELSE 65+.
      // `sexo` is a NOT NULL FK, so the catalog JOIN can never drop a person
      // (0 NULL sexo verified live), which keeps the partition MECE.
      const rows = await prisma.$queryRaw<Array<{
        sexId: number;
        name: string;
        bucket: AnalysisAgeBand;
        persons: bigint;
      }>>(Prisma.sql`
        SELECT sx.sexo_id AS "sexId", sx.nombre_normal AS "name",
          CASE
            WHEN p.edad IS NULL THEN 'unknown'
            WHEN p.edad <= 17 THEN '0-17'
            WHEN p.edad <= 25 THEN '18-25'
            WHEN p.edad <= 40 THEN '26-40'
            WHEN p.edad <= 64 THEN '41-64'
            ELSE '65+'
          END AS bucket,
          COUNT(*) AS persons
        FROM persona p
        JOIN siniestro s ON s.siniestro_id = p.siniestro_id
          AND s.fecha >= ${filters.from}::date AND s.fecha <= ${filters.to}::date${restriction}
        JOIN sexo sx ON sx.sexo_id = p.sexo_id
        GROUP BY 1, 2, 3`);
      return rows.map((row) => ({
        sexId: row.sexId,
        name: row.name,
        bucket: row.bucket,
        persons: countNumber(row.persons),
      }));
    },

    async loadQualityOutcomeCounts(filters, territory) {
      const restriction = siniestroTerritoryClause(territory);
      // One aggregate builds the role × outcome matrix with the same person-
      // grain COUNT(*) and the same date/territory clause. Both FKs are NOT
      // NULL over complete catalogs (0 nulls verified live), so every person
      // lands in exactly one cell and this matrix partitions the same set the
      // sex × age matrix does.
      const rows = await prisma.$queryRaw<Array<{
        qualityId: number;
        qualityName: string;
        outcomeId: number;
        outcomeName: string;
        persons: bigint;
      }>>(Prisma.sql`
        SELECT cp.calidad_persona_id AS "qualityId", cp.nombre_normal AS "qualityName",
          rp.resultado_persona_id AS "outcomeId", rp.nombre_normal AS "outcomeName",
          COUNT(*) AS persons
        FROM persona p
        JOIN siniestro s ON s.siniestro_id = p.siniestro_id
          AND s.fecha >= ${filters.from}::date AND s.fecha <= ${filters.to}::date${restriction}
        JOIN calidad_persona cp ON cp.calidad_persona_id = p.calidad_persona_id
        JOIN resultado_persona rp ON rp.resultado_persona_id = p.resultado_persona_id
        GROUP BY 1, 2, 3, 4`);
      return rows.map((row) => ({
        qualityId: row.qualityId,
        qualityName: row.qualityName,
        outcomeId: row.outcomeId,
        outcomeName: row.outcomeName,
        persons: countNumber(row.persons),
      }));
    },

    async loadMonthlyTrend(filters, territory) {
      const restriction = siniestroTerritoryClause(territory);
      // Same siniestro-grain monthly shape the dashboard's approved trend
      // uses (count + COALESCE'd fatality sum, `to_char(fecha, 'YYYY-MM')`);
      // only populated months come back and the service densifies.
      const rows = await prisma.$queryRaw<Array<{ month: string; accidents: bigint; fatalities: bigint }>>(Prisma.sql`
        SELECT to_char(s.fecha, 'YYYY-MM') AS month,
          COUNT(*) AS accidents,
          COALESCE(SUM(s.fallecidos), 0) AS fatalities
        FROM siniestro s
        WHERE s.fecha >= ${filters.from}::date AND s.fecha <= ${filters.to}::date${restriction}
        GROUP BY to_char(s.fecha, 'YYYY-MM')
        ORDER BY month`);
      return rows.map((row) => ({
        month: row.month,
        accidents: countNumber(row.accidents),
        fatalities: countNumber(row.fatalities),
      }));
    },

    async loadWeekdayHourCells(filters, territory) {
      const restriction = siniestroTerritoryClause(territory);
      // ISODOW keeps Monday = 1 in SQL, matching the approved week start; the
      // bucket is the dashboard's own integer 3-hour floor. hora is NOT NULL
      // (verified live), so every siniestro lands in exactly one cell.
      const [cells, midnight] = await Promise.all([
        prisma.$queryRaw<Array<{ weekday: number; bucket: number; accidents: bigint }>>(Prisma.sql`
          SELECT EXTRACT(ISODOW FROM s.fecha)::int AS weekday,
            (EXTRACT(HOUR FROM s.hora)::int / 3) * 3 AS bucket,
            COUNT(*) AS accidents
          FROM siniestro s
          WHERE s.fecha >= ${filters.from}::date AND s.fecha <= ${filters.to}::date${restriction}
          GROUP BY 1, 2`),
        prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
          SELECT COUNT(*) FILTER (WHERE s.hora = TIME '00:00:00') AS count
          FROM siniestro s
          WHERE s.fecha >= ${filters.from}::date AND s.fecha <= ${filters.to}::date${restriction}`),
      ]);
      return {
        cells: cells.map((row) => ({
          weekday: row.weekday,
          bucket: row.bucket,
          accidents: countNumber(row.accidents),
        })),
        midnightArtifactCount: countNumber(midnight[0]?.count),
      };
    },
  };
}

/** Restricts fact rows without touching the catalog side of the LEFT JOIN. */
function siniestroTerritoryClause(territory: ResolvedTerritory) {
  if (territory.communeId) return Prisma.sql` AND s.comuna_id = ${territory.communeId}`;
  if (territory.regionId !== null) {
    return Prisma.sql` AND s.comuna_id IN (SELECT comuna_id FROM comuna WHERE region_id = ${territory.regionId})`;
  }
  return Prisma.empty;
}
