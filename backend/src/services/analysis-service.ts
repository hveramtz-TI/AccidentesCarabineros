/**
 * Analysis aggregate service (EXP-03 T2).
 *
 * `/api/analysis` returns every catalog cause, including the zero-accident tail,
 * from one LEFT JOIN aggregate. Fact rows never leave PostgreSQL. Validation is
 * the dashboard's own `validateDashboardFilters`, so `/api/analysis` and
 * `/api/dashboard` reject the same inputs with the same 400 contract.
 */

import { Prisma, PrismaClient } from "@prisma/client";

import { prisma as sharedPrisma } from "../db/conection.js";
import { DashboardValidationError, type DashboardFilters } from "../types/dashboard-api.js";
import type { AnalysisResponse, AnalysisService } from "../types/insights-api.js";
import { validateDashboardFilters, type ResolvedTerritory } from "./dashboard-service.js";

export interface AnalysisCauseCount {
  causeId: number;
  name: string;
  accidents: number;
}

export interface AnalysisRepository {
  resolveTerritory(filters: DashboardFilters): Promise<ResolvedTerritory>;
  loadCauseCounts(filters: DashboardFilters, territory: ResolvedTerritory): Promise<AnalysisCauseCount[]>;
  close?(): Promise<void>;
}

function percent(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1_000) / 10;
}

function byAccidentsThenName(a: AnalysisCauseCount, b: AnalysisCauseCount): number {
  if (a.accidents !== b.accidents) return b.accidents - a.accidents;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
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
      const counts = await repository.loadCauseCounts(filters, territory);
      const totalAccidents = counts.reduce((sum, row) => sum + row.accidents, 0);
      // SQL already orders; sorting again keeps the contract deterministic for
      // any repository implementation (including the test seam).
      const rows = [...counts].sort(byAccidentsThenName);
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
      const restriction = causeTerritoryClause(territory);
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
  };
}

/** Restricts fact rows without touching the catalog side of the LEFT JOIN. */
function causeTerritoryClause(territory: ResolvedTerritory) {
  if (territory.communeId) return Prisma.sql` AND s.comuna_id = ${territory.communeId}`;
  if (territory.regionId !== null) {
    return Prisma.sql` AND s.comuna_id IN (SELECT comuna_id FROM comuna WHERE region_id = ${territory.regionId})`;
  }
  return Prisma.empty;
}
