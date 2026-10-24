/**
 * Analysis aggregate service (EXP-03 T2, extended by EXP-04 T3).
 *
 * `/api/analysis` returns every catalog cause, including the zero-accident tail,
 * from one LEFT JOIN aggregate, plus the vehicle-type distribution and the
 * type × severity matrix from two more SQL aggregates. Fact rows never leave
 * PostgreSQL. Validation is the dashboard's own `validateDashboardFilters`, so
 * `/api/analysis` and `/api/dashboard` reject the same inputs with the same 400
 * contract.
 */

import { Prisma, PrismaClient } from "@prisma/client";

import { prisma as sharedPrisma } from "../db/conection.js";
import { DashboardValidationError, type DashboardFilters } from "../types/dashboard-api.js";
import type {
  AnalysisResponse,
  AnalysisService,
  AnalysisSeverityBucket,
  AnalysisVehicleSeverityRow,
} from "../types/insights-api.js";
import { validateDashboardFilters, type ResolvedTerritory } from "./dashboard-service.js";

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

export interface AnalysisRepository {
  resolveTerritory(filters: DashboardFilters): Promise<ResolvedTerritory>;
  loadCauseCounts(filters: DashboardFilters, territory: ResolvedTerritory): Promise<AnalysisCauseCount[]>;
  loadVehicleSeverityCounts(filters: DashboardFilters, territory: ResolvedTerritory): Promise<AnalysisVehicleSeverityCount[]>;
  loadSiniestrosWithoutVehicleCount(filters: DashboardFilters, territory: ResolvedTerritory): Promise<number>;
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

export function createAnalysisService(
  repository: AnalysisRepository = createPrismaAnalysisRepository(),
  now: () => Date = () => new Date(),
): AnalysisService {
  return {
    close: () => repository.close?.() ?? Promise.resolve(),
    async getAnalysis(filters) {
      validateDashboardFilters(filters);
      const territory = await repository.resolveTerritory(filters);
      const [counts, severityCells, withoutVehicleRows] = await Promise.all([
        repository.loadCauseCounts(filters, territory),
        repository.loadVehicleSeverityCounts(filters, territory),
        repository.loadSiniestrosWithoutVehicleCount(filters, territory),
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
