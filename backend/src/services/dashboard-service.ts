import { Prisma, PrismaClient } from "@prisma/client";

import { prisma as sharedPrisma } from "../db/conection.js";
import {
  DashboardValidationError,
  type DashboardFilters,
  type DashboardResponse,
  type DashboardService,
} from "../types/dashboard-api.js";

type TerritoryScope = "region" | "commune";

export interface ResolvedTerritory {
  scopeLabel: string;
  territoryScope: TerritoryScope;
  regionId: number | null;
  communeId: string | null;
}

interface CategoryCount {
  id: number;
  name: string;
  count: number;
}

export interface DashboardSnapshot {
  totals: {
    accidents: number;
    fatalities: number;
    seriousInjuries: number;
    lessSeriousInjuries: number;
    minorInjuries: number;
  };
  monthly: Array<{ month: string; accidents: number; fatalities: number; injuries: number; seriousInjuries: number }>;
  severity: Array<{ key: string; accidents: number }>;
  territories: Array<{ code: string; name: string; accidents: number; fatalities: number }>;
  zeroAccidentCount: number;
  causes: Array<{ id: number; name: string; accidents: number; fatalities: number }>;
  accidentTypes: CategoryCount[];
  sectors: CategoryCount[];
  hours: Array<{ hourStart: number; accidents: number }>;
  midnightArtifactCount: number;
  vehicles: CategoryCount[];
  persons: {
    rows: number;
    quality: CategoryCount[];
    sex: CategoryCount[];
    ages: Array<{ band: string; count: number }>;
  };
}

export interface DashboardRepository {
  resolveTerritory(filters: DashboardFilters): Promise<ResolvedTerritory>;
  loadSnapshot(filters: DashboardFilters, territory: ResolvedTerritory): Promise<DashboardSnapshot>;
  close?(): Promise<void>;
}

const MONTHLY_SEVERITIES = [
  { key: "fatal", label: "Fatal" },
  { key: "serious", label: "Serious injuries" },
  { key: "minor", label: "Minor injuries" },
  { key: "onlyIlesos", label: "Uninjured only" },
] as const;
const AGE_BANDS = ["0-17", "18-25", "26-40", "41-64", "65+", "unknown"] as const;
const HOUR_STARTS = [0, 3, 6, 9, 12, 15, 18, 21] as const;
const VEHICLE_NOTE = "shares no suman 100: un siniestro puede involucrar varios tipos";

function percent(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1_000) / 10;
}

function denseMonths(from: string, to: string, rows: DashboardSnapshot["monthly"]): DashboardResponse["monthlyTrend"] {
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  const cursor = new Date(`${from.slice(0, 7)}-01T00:00:00.000Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00.000Z`);
  const months: DashboardResponse["monthlyTrend"] = [];
  while (cursor <= end) {
    const month = cursor.toISOString().slice(0, 7);
    const row = byMonth.get(month);
    months.push({
      month,
      accidents: row?.accidents ?? 0,
      fatalities: row?.fatalities ?? 0,
      injuries: row?.injuries ?? 0,
      seriousInjuries: row?.seriousInjuries ?? 0,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

function sortedCategories(rows: CategoryCount[]): CategoryCount[] {
  return [...rows].sort((a, b) => b.count - a.count || a.id - b.id);
}

function shareRows(rows: CategoryCount[], denominator: number) {
  return sortedCategories(rows).map(({ id, name, count }) => ({ id, name, count, sharePct: percent(count, denominator) }));
}

export function createDashboardService(
  repository: DashboardRepository = createPrismaDashboardRepository(),
  now: () => Date = () => new Date(),
): DashboardService {
  return {
    close: () => repository.close?.() ?? Promise.resolve(),
    async getDashboard(filters) {
      validateDashboardFilters(filters);
      const territory = await repository.resolveTerritory(filters);
      const snapshot = await repository.loadSnapshot(filters, territory);
      const accidents = snapshot.totals.accidents;
      const causes = [...snapshot.causes].sort((a, b) => b.accidents - a.accidents || a.id - b.id);
      const topCauses = causes.slice(0, 10);
      const otherCauses = causes.slice(10);
      const vehicles = sortedCategories(snapshot.vehicles);
      const topVehicles = vehicles.slice(0, 10);
      const otherVehicles = vehicles.slice(10);
      const territoryRows = [...snapshot.territories].sort(
        (a, b) => b.accidents - a.accidents || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0),
      );
      const topTerritories = territoryRows.filter((row) => row.accidents > 0).slice(0, 10);
      const outsideTerritories = territoryRows.filter((row) => row.accidents > 0).slice(10);
      const effectiveRegionId = filters.communeId ? territory.regionId : filters.regionId;

      return {
        meta: {
          schemaVersion: 1,
          source: "carabineros-2025-normalized",
          synthetic: false,
          period: { from: filters.from, to: filters.to },
          filters: { regionId: effectiveRegionId, communeId: filters.communeId },
          scopeLabel: territory.scopeLabel,
          emptyScope: accidents === 0,
          generatedAt: now().toISOString(),
        },
        kpis: {
          accidents,
          fatalities: snapshot.totals.fatalities,
          injuries: snapshot.totals.seriousInjuries + snapshot.totals.lessSeriousInjuries + snapshot.totals.minorInjuries,
          seriousInjuries: snapshot.totals.seriousInjuries,
        },
        monthlyTrend: denseMonths(filters.from, filters.to, snapshot.monthly),
        severity: MONTHLY_SEVERITIES.map(({ key, label }) => ({
          key,
          label,
          accidents: snapshot.severity.find((row) => row.key === key)?.accidents ?? 0,
        })),
        territories: {
          scope: territory.territoryScope,
          items: topTerritories,
          outsideTopCount: outsideTerritories.length,
          outsideAccidents: outsideTerritories.reduce((sum, row) => sum + row.accidents, 0),
          zeroAccidentCount: snapshot.zeroAccidentCount,
        },
        causes: {
          items: topCauses,
          other: {
            distinctCount: otherCauses.length,
            accidents: otherCauses.reduce((sum, row) => sum + row.accidents, 0),
          },
        },
        accidentTypes: shareRows(snapshot.accidentTypes, accidents).map(({ id, name, count, sharePct }) => ({
          id,
          name,
          accidents: count,
          sharePct,
        })),
        sectors: shareRows(snapshot.sectors, accidents).map(({ id, name, count, sharePct }) => ({
          id,
          name,
          accidents: count,
          sharePct,
        })),
        hourBuckets: {
          items: HOUR_STARTS.map((hourStart) => ({
            hourStart,
            label: `${String(hourStart).padStart(2, "0")}-${String(hourStart + 3).padStart(2, "0")}`,
            accidents: snapshot.hours.find((row) => row.hourStart === hourStart)?.accidents ?? 0,
          })),
          midnightArtifactCount: snapshot.midnightArtifactCount,
        },
        vehicles: {
          items: topVehicles.map(({ id, name, count }) => ({
            id,
            name,
            siniestros: count,
            sharePct: percent(count, accidents),
          })),
          other: { accidents: otherVehicles.reduce((sum, row) => sum + row.count, 0) },
          note: VEHICLE_NOTE,
        },
        persons: {
          rows: snapshot.persons.rows,
          calidad: shareRows(snapshot.persons.quality, snapshot.persons.rows),
          sexo: shareRows(snapshot.persons.sex, snapshot.persons.rows),
          ageBands: AGE_BANDS.map((band) => ({
            band,
            count: snapshot.persons.ages.find((row) => row.band === band)?.count ?? 0,
          })),
        },
      };
    },
  };
}

export function validateDashboardFilters(filters: DashboardFilters): void {
  for (const field of ["from", "to"] as const) {
    const value = filters[field];
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new DashboardValidationError(field, "invalid_format", `${field} must be an ISO date`);
    }
    if (value < "2025-01-01" || value > "2025-12-31") {
      throw new DashboardValidationError(field, "out_of_range", `${field} must be within 2025`);
    }
  }
  if (filters.from > filters.to) {
    throw new DashboardValidationError("from", "after_to", "from must be on or before to");
  }
}

function countNumber(value: bigint | number | null | undefined): number {
  const result = Number(value ?? 0);
  if (!Number.isSafeInteger(result) || result < 0) throw new Error("aggregate count is outside the safe integer range");
  return result;
}

function createPrismaDashboardRepository(prisma: PrismaClient = sharedPrisma): DashboardRepository {
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

    async loadSnapshot(filters, territory) {
      const where = siniestroWhere(filters, territory);
      const personWhere = { siniestro: where };
      const [totals, causes, accidentTypes, sectors, peopleCount, qualityRows, sexRows, monthly, severity, territories, hours, vehicles, ages] = await Promise.all([
        prisma.siniestro.aggregate({
          where,
          _count: { _all: true },
          _sum: { fallecidos: true, lesionadosGraves: true, lesionadosMenosGraves: true, lesionadosLeves: true },
        }),
        prisma.siniestro.groupBy({ by: ["causaId"], where, _count: { _all: true }, _sum: { fallecidos: true } }),
        prisma.siniestro.groupBy({ by: ["tipoSiniestroId"], where, _count: { _all: true } }),
        prisma.siniestro.groupBy({ by: ["sectorId"], where, _count: { _all: true } }),
        prisma.persona.count({ where: personWhere }),
        prisma.persona.groupBy({ by: ["calidadPersonaId"], where: personWhere, _count: { _all: true } }),
        prisma.persona.groupBy({ by: ["sexoId"], where: personWhere, _count: { _all: true } }),
        queryMonthly(prisma, filters, territory),
        querySeverity(prisma, filters, territory),
        queryTerritories(prisma, filters, territory),
        queryHours(prisma, filters, territory),
        queryVehicles(prisma, filters, territory),
        queryAgeBands(prisma, filters, territory),
      ]);

      const [causeLabels, typeLabels, sectorLabels, qualityLabels, sexLabels, vehicleLabels] = await Promise.all([
        prisma.causa.findMany({ where: { causaId: { in: causes.map((row) => row.causaId) } }, select: { causaId: true, nombreNormal: true } }),
        prisma.tipoSiniestro.findMany({ where: { tipoSiniestroId: { in: accidentTypes.map((row) => row.tipoSiniestroId) } }, select: { tipoSiniestroId: true, nombreNormal: true } }),
        prisma.sector.findMany({ where: { sectorId: { in: sectors.map((row) => row.sectorId) } }, select: { sectorId: true, nombreNormal: true } }),
        prisma.calidadPersona.findMany({ where: { calidadPersonaId: { in: qualityRows.map((row) => row.calidadPersonaId) } }, select: { calidadPersonaId: true, nombreNormal: true } }),
        prisma.sexo.findMany({ where: { sexoId: { in: sexRows.map((row) => row.sexoId) } }, select: { sexoId: true, nombreNormal: true } }),
        prisma.tipoVehiculo.findMany({ where: { tipoVehiculoId: { in: vehicles.map((row) => row.id) } }, select: { tipoVehiculoId: true, nombreNormal: true } }),
      ]);
      const labelMap = <T extends { id: number; name: string }>(rows: T[]) => new Map(rows.map((row) => [row.id, row.name]));
      const causeName = labelMap(causeLabels.map(({ causaId, nombreNormal }) => ({ id: causaId, name: nombreNormal })));
      const typeName = labelMap(typeLabels.map(({ tipoSiniestroId, nombreNormal }) => ({ id: tipoSiniestroId, name: nombreNormal })));
      const sectorName = labelMap(sectorLabels.map(({ sectorId, nombreNormal }) => ({ id: sectorId, name: nombreNormal })));
      const qualityName = labelMap(qualityLabels.map(({ calidadPersonaId, nombreNormal }) => ({ id: calidadPersonaId, name: nombreNormal })));
      const sexName = labelMap(sexLabels.map(({ sexoId, nombreNormal }) => ({ id: sexoId, name: nombreNormal })));
      const vehicleName = labelMap(vehicleLabels.map(({ tipoVehiculoId, nombreNormal }) => ({ id: tipoVehiculoId, name: nombreNormal })));

      return {
        totals: {
          accidents: totals._count._all,
          fatalities: totals._sum.fallecidos ?? 0,
          seriousInjuries: totals._sum.lesionadosGraves ?? 0,
          lessSeriousInjuries: totals._sum.lesionadosMenosGraves ?? 0,
          minorInjuries: totals._sum.lesionadosLeves ?? 0,
        },
        monthly,
        severity,
        territories: territories.rows,
        zeroAccidentCount: territories.zeroAccidentCount,
        causes: causes.map((row) => ({ id: row.causaId, name: causeName.get(row.causaId) ?? "", accidents: row._count._all, fatalities: row._sum.fallecidos ?? 0 })),
        accidentTypes: accidentTypes.map((row) => ({ id: row.tipoSiniestroId, name: typeName.get(row.tipoSiniestroId) ?? "", count: row._count._all })),
        sectors: sectors.map((row) => ({ id: row.sectorId, name: sectorName.get(row.sectorId) ?? "", count: row._count._all })),
        hours: hours.rows,
        midnightArtifactCount: hours.midnightArtifactCount,
        vehicles: vehicles.map((row) => ({ id: row.id, name: vehicleName.get(row.id) ?? "", count: row.count })),
        persons: {
          rows: peopleCount,
          quality: qualityRows.map((row) => ({ id: row.calidadPersonaId, name: qualityName.get(row.calidadPersonaId) ?? "", count: row._count._all })),
          sex: sexRows.map((row) => ({ id: row.sexoId, name: sexName.get(row.sexoId) ?? "", count: row._count._all })),
          ages,
        },
      };
    },
  };
}

function siniestroWhere(filters: DashboardFilters, territory: ResolvedTerritory): Prisma.SiniestroWhereInput {
  const toExclusive = new Date(`${filters.to}T00:00:00.000Z`);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  return {
    fecha: { gte: new Date(`${filters.from}T00:00:00.000Z`), lt: toExclusive },
    ...(territory.communeId ? { comunaId: territory.communeId } : territory.regionId !== null ? { comuna: { regionId: territory.regionId } } : {}),
  };
}

function dateSql(filters: DashboardFilters, alias = "s") {
  const tableAlias = Prisma.raw(alias);
  return Prisma.sql`${tableAlias}.fecha >= ${filters.from}::date AND ${tableAlias}.fecha <= ${filters.to}::date`;
}

function territoryClause(territory: ResolvedTerritory, alias = "c") {
  const tableAlias = Prisma.raw(alias);
  if (territory.communeId) return Prisma.sql` AND ${tableAlias}.comuna_id = ${territory.communeId}`;
  if (territory.regionId !== null) return Prisma.sql` AND ${tableAlias}.region_id = ${territory.regionId}`;
  return Prisma.empty;
}

async function queryMonthly(prisma: PrismaClient, filters: DashboardFilters, territory: ResolvedTerritory) {
  const restriction = territoryClause(territory, "c");
  const rows = await prisma.$queryRaw<Array<{ month: string; accidents: bigint; fatalities: bigint; injuries: bigint; seriousInjuries: bigint }>>(Prisma.sql`
    SELECT to_char(s.fecha, 'YYYY-MM') AS month,
      COUNT(*) AS accidents,
      COALESCE(SUM(s.fallecidos), 0) AS fatalities,
      COALESCE(SUM(s.lesionados_graves + s.lesionados_menos_graves + s.lesionados_leves), 0) AS injuries,
      COALESCE(SUM(s.lesionados_graves), 0) AS "seriousInjuries"
    FROM siniestro s JOIN comuna c ON c.comuna_id = s.comuna_id
    WHERE ${dateSql(filters)}${restriction}
    GROUP BY to_char(s.fecha, 'YYYY-MM') ORDER BY month`);
  return rows.map((row) => ({ month: row.month, accidents: countNumber(row.accidents), fatalities: countNumber(row.fatalities), injuries: countNumber(row.injuries), seriousInjuries: countNumber(row.seriousInjuries) }));
}

async function querySeverity(prisma: PrismaClient, filters: DashboardFilters, territory: ResolvedTerritory) {
  const restriction = territoryClause(territory, "c");
  const rows = await prisma.$queryRaw<Array<{ key: string; accidents: bigint }>>(Prisma.sql`
    SELECT CASE
      WHEN s.fallecidos > 0 THEN 'fatal'
      WHEN s.lesionados_graves > 0 THEN 'serious'
      WHEN s.lesionados_menos_graves > 0 OR s.lesionados_leves > 0 THEN 'minor'
      WHEN s.ilesos > 0 THEN 'onlyIlesos'
      ELSE 'allZero'
    END AS key, COUNT(*) AS accidents
    FROM siniestro s JOIN comuna c ON c.comuna_id = s.comuna_id
    WHERE ${dateSql(filters)}${restriction}
    GROUP BY key`);
  return rows.filter((row) => row.key !== "allZero").map((row) => ({ key: row.key, accidents: countNumber(row.accidents) }));
}

async function queryTerritories(prisma: PrismaClient, filters: DashboardFilters, territory: ResolvedTerritory) {
  const dates = dateSql(filters);
  const zeroCount = await queryZeroAccidentCommunes(prisma, filters, territory);
  if (territory.territoryScope === "region") {
    const rows = await prisma.$queryRaw<Array<{ code: string; name: string; accidents: bigint; fatalities: bigint }>>(Prisma.sql`
      SELECT r.numero_romano AS code, r.nombre_normal AS name, COUNT(s.siniestro_id) AS accidents,
        COALESCE(SUM(s.fallecidos), 0) AS fatalities
      FROM region r LEFT JOIN comuna c ON c.region_id = r.region_id
      LEFT JOIN siniestro s ON s.comuna_id = c.comuna_id AND ${dates}
      GROUP BY r.region_id, r.numero_romano, r.nombre_normal`);
    return { rows: rows.map((row) => ({ code: row.code, name: row.name, accidents: countNumber(row.accidents), fatalities: countNumber(row.fatalities) })), zeroAccidentCount: zeroCount };
  }
  const rows = await prisma.$queryRaw<Array<{ code: string; name: string; accidents: bigint; fatalities: bigint }>>(Prisma.sql`
    SELECT c.comuna_id AS code, c.nombre_normal AS name, COUNT(s.siniestro_id) AS accidents,
      COALESCE(SUM(s.fallecidos), 0) AS fatalities
    FROM comuna c LEFT JOIN siniestro s ON s.comuna_id = c.comuna_id AND ${dates}
    WHERE TRUE${territoryClause(territory, "c")}
    GROUP BY c.comuna_id, c.nombre_normal`);
  return { rows: rows.map((row) => ({ code: row.code, name: row.name, accidents: countNumber(row.accidents), fatalities: countNumber(row.fatalities) })), zeroAccidentCount: zeroCount };
}

async function queryZeroAccidentCommunes(prisma: PrismaClient, filters: DashboardFilters, territory: ResolvedTerritory) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*) FILTER (WHERE COALESCE(t.accidents, 0) = 0) AS count
    FROM comuna c
    LEFT JOIN (
      SELECT s.comuna_id, COUNT(*) AS accidents
      FROM siniestro s
      WHERE ${dateSql(filters)}
      GROUP BY s.comuna_id
    ) t ON t.comuna_id = c.comuna_id
    WHERE TRUE${territoryClause(territory, "c")}`);
  return countNumber(rows[0]?.count);
}

async function queryHours(prisma: PrismaClient, filters: DashboardFilters, territory: ResolvedTerritory) {
  const restriction = territoryClause(territory, "c");
  const rows = await prisma.$queryRaw<Array<{ hourStart: number; accidents: bigint; midnightArtifactCount: bigint }>>(Prisma.sql`
    SELECT (EXTRACT(HOUR FROM s.hora)::int / 3) * 3 AS "hourStart", COUNT(*) AS accidents,
      COUNT(*) FILTER (WHERE s.hora = TIME '00:00:00') AS "midnightArtifactCount"
    FROM siniestro s JOIN comuna c ON c.comuna_id = s.comuna_id
    WHERE ${dateSql(filters)}${restriction}
    GROUP BY "hourStart" ORDER BY "hourStart"`);
  return {
    rows: rows.map((row) => ({ hourStart: row.hourStart, accidents: countNumber(row.accidents) })),
    midnightArtifactCount: countNumber(rows[0]?.midnightArtifactCount),
  };
}

async function queryVehicles(prisma: PrismaClient, filters: DashboardFilters, territory: ResolvedTerritory) {
  const restriction = territoryClause(territory, "c");
  const rows = await prisma.$queryRaw<Array<{ id: number; count: bigint }>>(Prisma.sql`
    SELECT v.tipo_vehiculo_id AS id, COUNT(DISTINCT v.siniestro_id) AS count
    FROM vehiculo v JOIN siniestro s ON s.siniestro_id = v.siniestro_id
    JOIN comuna c ON c.comuna_id = s.comuna_id
    WHERE ${dateSql(filters)}${restriction}
    GROUP BY v.tipo_vehiculo_id`);
  return rows.map((row) => ({ id: row.id, count: countNumber(row.count) }));
}

async function queryAgeBands(prisma: PrismaClient, filters: DashboardFilters, territory: ResolvedTerritory) {
  const restriction = territoryClause(territory, "c");
  const rows = await prisma.$queryRaw<Array<{ band: string; count: bigint }>>(Prisma.sql`
    SELECT CASE
      WHEN p.edad IS NULL THEN 'unknown'
      WHEN p.edad <= 17 THEN '0-17'
      WHEN p.edad <= 25 THEN '18-25'
      WHEN p.edad <= 40 THEN '26-40'
      WHEN p.edad <= 64 THEN '41-64'
      ELSE '65+'
    END AS band, COUNT(*) AS count
    FROM persona p JOIN siniestro s ON s.siniestro_id = p.siniestro_id
    JOIN comuna c ON c.comuna_id = s.comuna_id
    WHERE ${dateSql(filters)}${restriction}
    GROUP BY band`);
  return rows.map((row) => ({ band: row.band, count: countNumber(row.count) }));
}
