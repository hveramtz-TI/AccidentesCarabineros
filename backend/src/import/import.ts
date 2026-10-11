import type { PrismaClient } from "@prisma/client";

import { loadCatalogFile, type CatalogSeed } from "./catalog.js";
import {
  RowValidationError,
  cellToAge,
  cellToBigInt,
  cellToCount,
  cellToIntegerString,
  cellToOptionalText,
  cellToRequiredText,
} from "./cell.js";
import { resolveCommuneId } from "./commune.js";
import {
  cellToUtcDate,
  cellToUtcTime,
  formatUtcDate,
  monthNumberFromLabel,
} from "./datetime.js";
import { normalizeLabel } from "./normalize.js";
import type { EntityCounts, ImportErrorEntry, ImportReport } from "./report.js";
import { discoverWorkbooks, streamRows, type SourceRow } from "./workbook.js";

const SINIESTRO_COLUMNS = [
  "ID",
  "FECHA",
  "MES",
  "HORA",
  "ZONA",
  "COMUNA",
  "TIPO",
  "CAUSA",
  "SECTOR",
  "FALLECIDO",
  "GRAVE",
  "M_GRAVE",
  "LEVE",
  "ILESO",
  "CALLE_1",
  "CALLE_2",
  "KM",
  "PARTE",
  "TRIBUNAL",
] as const;

const PERSONA_COLUMNS = [
  "ID",
  "FECHA",
  "MES",
  "HORA",
  "COMUNA",
  "ZONA",
  "CALIDAD",
  "SEXO",
  "EDAD",
  "RESULTADO",
] as const;

const VEHICULO_COLUMNS = [
  "ID",
  "FECHA",
  "MES",
  "HORA",
  "COMUNA",
  "ZONA",
  "TIPO",
  "SERVICIO",
] as const;

const SINIESTRO_BATCH = 2_000;
const PERSONA_BATCH = 5_000;
const VEHICULO_BATCH = 5_000;
const ID_LOOKUP_CHUNK = 15_000;
const DELETE_CHUNK = 15_000;

export interface ImportOptions {
  dir: string;
  catalogPath: string;
  reset: boolean;
}

interface EntityAccumulator {
  byKey: Map<string, string>;
}

function createAccumulator(): EntityAccumulator {
  return { byKey: new Map() };
}

function registerLabel(accumulator: EntityAccumulator, label: string): string {
  const key = normalizeLabel(label);
  if (!accumulator.byKey.has(key)) {
    accumulator.byKey.set(key, label.trim());
  }
  return key;
}

function accumulatorRows(accumulator: EntityAccumulator): Array<{
  nombreNormal: string;
  nombreEstandarizado: string;
}> {
  return [...accumulator.byKey.entries()].map(([nombreEstandarizado, nombreNormal]) => ({
    nombreNormal,
    nombreEstandarizado,
  }));
}

interface LookupAccumulators {
  zona: EntityAccumulator;
  tipoSiniestro: EntityAccumulator;
  causa: EntityAccumulator;
  sector: EntityAccumulator;
  calidadPersona: EntityAccumulator;
  sexo: EntityAccumulator;
  resultadoPersona: EntityAccumulator;
  tipoVehiculo: EntityAccumulator;
  servicioVehiculo: EntityAccumulator;
}

function createLookupAccumulators(): LookupAccumulators {
  return {
    zona: createAccumulator(),
    tipoSiniestro: createAccumulator(),
    causa: createAccumulator(),
    sector: createAccumulator(),
    calidadPersona: createAccumulator(),
    sexo: createAccumulator(),
    resultadoPersona: createAccumulator(),
    tipoVehiculo: createAccumulator(),
    servicioVehiculo: createAccumulator(),
  };
}

interface ParsedSiniestro {
  idFuente: bigint;
  fecha: Date;
  hora: Date;
  comunaId: string;
  zonaKey: string;
  tipoSiniestroKey: string;
  causaKey: string;
  sectorKey: string;
  fallecidos: number;
  lesionadosGraves: number;
  lesionadosMenosGraves: number;
  lesionadosLeves: number;
  ilesos: number;
  calle1: string | null;
  calle2: string | null;
  kmReferencia: string | null;
  numeroParte: string;
  tribunal: string;
}

interface ParsedPersona {
  idFuente: bigint;
  calidadKey: string;
  sexoKey: string;
  resultadoKey: string;
  edad: number | null;
}

interface ParsedVehiculo {
  idFuente: bigint;
  tipoKey: string;
  servicioKey: string;
}

function parseFecha(value: unknown, field = "FECHA"): Date {
  if (value instanceof Date) return cellToUtcDate(value);
  if (typeof value === "number" && Number.isFinite(value)) return cellToUtcDate(value);
  throw new RowValidationError(`${field} must be an Excel serial or date`);
}

function parseHora(value: unknown, field = "HORA"): Date {
  if (value instanceof Date) return cellToUtcTime(value);
  if (typeof value === "number" && Number.isFinite(value)) return cellToUtcTime(value);
  throw new RowValidationError(`${field} must be an Excel time fraction`);
}

function validateMesAgainstDate(value: unknown, fecha: Date): void {
  const label = cellToRequiredText(value, "MES");
  const month = monthNumberFromLabel(label);
  if (month === undefined) {
    throw new RowValidationError(`MES ${JSON.stringify(label)} is not a Spanish month name`);
  }
  if (month !== fecha.getUTCMonth() + 1) {
    throw new RowValidationError(
      `MES ${JSON.stringify(label)} does not match FECHA ${formatUtcDate(fecha)}`,
    );
  }
}

function parseSiniestroRow(
  values: Record<string, unknown>,
  catalog: CatalogSeed,
  lookups: LookupAccumulators,
): ParsedSiniestro {
  const idFuente = cellToBigInt(values.ID, "ID");
  const fecha = parseFecha(values.FECHA);
  validateMesAgainstDate(values.MES, fecha);
  const hora = parseHora(values.HORA);

  const comunaLabel = cellToRequiredText(values.COMUNA, "COMUNA");
  const comunaId = resolveCommuneId(comunaLabel, catalog);
  if (!comunaId) {
    throw new RowValidationError(`unresolved COMUNA ${JSON.stringify(comunaLabel)}`);
  }

  const zonaLabel = cellToRequiredText(values.ZONA, "ZONA");
  const tipoLabel = cellToRequiredText(values.TIPO, "TIPO");
  const causaLabel = cellToRequiredText(values.CAUSA, "CAUSA");
  const sectorLabel = cellToRequiredText(values.SECTOR, "SECTOR");

  const parsed: ParsedSiniestro = {
    idFuente,
    fecha,
    hora,
    comunaId,
    zonaKey: "",
    tipoSiniestroKey: "",
    causaKey: "",
    sectorKey: "",
    fallecidos: cellToCount(values.FALLECIDO, "FALLECIDO"),
    lesionadosGraves: cellToCount(values.GRAVE, "GRAVE"),
    lesionadosMenosGraves: cellToCount(values.M_GRAVE, "M_GRAVE"),
    lesionadosLeves: cellToCount(values.LEVE, "LEVE"),
    ilesos: cellToCount(values.ILESO, "ILESO"),
    calle1: cellToOptionalText(values.CALLE_1),
    calle2: cellToOptionalText(values.CALLE_2),
    kmReferencia: cellToOptionalText(values.KM),
    numeroParte: cellToIntegerString(values.PARTE, "PARTE"),
    tribunal: cellToRequiredText(values.TRIBUNAL, "TRIBUNAL"),
  };

  parsed.zonaKey = registerLabel(lookups.zona, zonaLabel);
  parsed.tipoSiniestroKey = registerLabel(lookups.tipoSiniestro, tipoLabel);
  parsed.causaKey = registerLabel(lookups.causa, causaLabel);
  parsed.sectorKey = registerLabel(lookups.sector, sectorLabel);
  return parsed;
}

function validateChildAgainstParent(
  values: Record<string, unknown>,
  parent: ParsedSiniestro,
  catalog: CatalogSeed,
): void {
  const fecha = parseFecha(values.FECHA);
  if (fecha.getTime() !== parent.fecha.getTime()) {
    throw new RowValidationError(
      `FECHA ${formatUtcDate(fecha)} does not match parent ${formatUtcDate(parent.fecha)}`,
    );
  }
  const mes = cellToRequiredText(values.MES, "MES");
  const month = monthNumberFromLabel(mes);
  if (month === undefined) {
    throw new RowValidationError(`MES ${JSON.stringify(mes)} is not a Spanish month name`);
  }
  if (month !== parent.fecha.getUTCMonth() + 1) {
    throw new RowValidationError(
      `MES ${JSON.stringify(mes)} does not match parent FECHA ${formatUtcDate(parent.fecha)}`,
    );
  }
  const hora = parseHora(values.HORA);
  if (hora.getTime() !== parent.hora.getTime()) {
    throw new RowValidationError("HORA does not match parent siniestro");
  }
  const comunaLabel = cellToRequiredText(values.COMUNA, "COMUNA");
  const comunaId = resolveCommuneId(comunaLabel, catalog);
  if (!comunaId) {
    throw new RowValidationError(`unresolved COMUNA ${JSON.stringify(comunaLabel)}`);
  }
  if (comunaId !== parent.comunaId) {
    throw new RowValidationError("COMUNA does not match parent siniestro");
  }
  const zonaKey = normalizeLabel(cellToRequiredText(values.ZONA, "ZONA"));
  if (zonaKey !== parent.zonaKey) {
    throw new RowValidationError("ZONA does not match parent siniestro");
  }
}

function parsePersonaRow(
  values: Record<string, unknown>,
  parent: ParsedSiniestro,
  catalog: CatalogSeed,
  lookups: LookupAccumulators,
): ParsedPersona {
  validateChildAgainstParent(values, parent, catalog);
  const calidadLabel = cellToRequiredText(values.CALIDAD, "CALIDAD");
  const sexoLabel = cellToRequiredText(values.SEXO, "SEXO");
  const resultadoLabel = cellToRequiredText(values.RESULTADO, "RESULTADO");
  const edad = cellToAge(values.EDAD);

  return {
    idFuente: parent.idFuente,
    calidadKey: registerLabel(lookups.calidadPersona, calidadLabel),
    sexoKey: registerLabel(lookups.sexo, sexoLabel),
    resultadoKey: registerLabel(lookups.resultadoPersona, resultadoLabel),
    edad,
  };
}

function parseVehiculoRow(
  values: Record<string, unknown>,
  parent: ParsedSiniestro,
  catalog: CatalogSeed,
  lookups: LookupAccumulators,
): ParsedVehiculo {
  validateChildAgainstParent(values, parent, catalog);
  const tipoLabel = cellToRequiredText(values.TIPO, "TIPO");
  const servicioLabel = cellToRequiredText(values.SERVICIO, "SERVICIO");

  return {
    idFuente: parent.idFuente,
    tipoKey: registerLabel(lookups.tipoVehiculo, tipoLabel),
    servicioKey: registerLabel(lookups.servicioVehiculo, servicioLabel),
  };
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size) as T[]);
  }
  return batches;
}

async function seedCatalog(prisma: PrismaClient, catalog: CatalogSeed): Promise<void> {
  for (const region of catalog.regions) {
    await prisma.region.upsert({
      where: { regionId: region.regionId },
      create: region,
      update: {
        nombreNormal: region.nombreNormal,
        nombreEstandarizado: region.nombreEstandarizado,
        nombreAbreviado: region.nombreAbreviado,
        numeroRomano: region.numeroRomano,
      },
    });
  }
  for (const comuna of catalog.comunas) {
    await prisma.comuna.upsert({
      where: { comunaId: comuna.comunaId },
      create: comuna,
      update: {
        regionId: comuna.regionId,
        nombreNormal: comuna.nombreNormal,
        nombreEstandarizado: comuna.nombreEstandarizado,
      },
    });
  }
  for (const alias of catalog.aliases) {
    await prisma.comunaAlias.upsert({
      where: { nombreEstandarizadoAlias: alias.aliasKey },
      create: {
        nombreEstandarizadoAlias: alias.aliasKey,
        comunaId: alias.comunaId,
        nombreOrigen: alias.nombreOrigen,
      },
      update: { comunaId: alias.comunaId, nombreOrigen: alias.nombreOrigen },
    });
  }
}

async function seedLookup(
  rows: Array<{ nombreNormal: string; nombreEstandarizado: string }>,
  upsert: (row: { nombreNormal: string; nombreEstandarizado: string }) => Promise<number>,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.nombreEstandarizado, await upsert(row));
  }
  return map;
}

async function replaceFacts(
  prisma: PrismaClient,
  siniestroIds: bigint[],
  reset: boolean,
): Promise<void> {
  if (reset) {
    await prisma.vehiculo.deleteMany();
    await prisma.persona.deleteMany();
    await prisma.siniestro.deleteMany();
    return;
  }
  for (const ids of chunk(siniestroIds, DELETE_CHUNK)) {
    await prisma.siniestro.deleteMany({ where: { idFuente: { in: ids } } });
  }
}

async function loadSiniestroIdMap(
  prisma: PrismaClient,
  idFuentes: bigint[],
): Promise<Map<bigint, bigint>> {
  const map = new Map<bigint, bigint>();
  for (const ids of chunk(idFuentes, ID_LOOKUP_CHUNK)) {
    const rows = await prisma.siniestro.findMany({
      where: { idFuente: { in: ids } },
      select: { idFuente: true, siniestroId: true },
    });
    for (const row of rows) {
      map.set(row.idFuente, row.siniestroId);
    }
  }
  return map;
}

function requireLookupId(map: Map<string, number>, key: string, entity: string): number {
  const id = map.get(key);
  if (id === undefined) {
    throw new Error(`internal error: unresolved ${entity} lookup key ${JSON.stringify(key)}`);
  }
  return id;
}

/**
 * Parse all three workbooks into memory, validating every row, then replace the
 * imported fact scope and insert in batches. Row-level failures are recorded
 * and skipped; fatal problems (missing file, catalog collision, DB error)
 * propagate as thrown errors.
 */
export async function runImport(
  prisma: PrismaClient,
  options: ImportOptions,
): Promise<ImportReport> {
  const startedAt = Date.now();
  const catalog = loadCatalogFile(options.catalogPath);
  const paths = discoverWorkbooks(options.dir);

  const rowsRead: EntityCounts = { siniestros: 0, personas: 0, vehiculos: 0 };
  const skipped: EntityCounts = { siniestros: 0, personas: 0, vehiculos: 0 };
  const errors: ImportErrorEntry[] = [];

  const recordError = (
    file: string,
    row: SourceRow,
    entity: ImportErrorEntry["entity"],
    error: unknown,
  ): void => {
    errors.push({
      file,
      rowNumber: row.rowNumber,
      entity,
      reason: error instanceof Error ? error.message : String(error),
    });
  };

  const lookups = createLookupAccumulators();
  const siniestroBySource = new Map<string, ParsedSiniestro>();

  for await (const row of streamRows(paths.siniestros, SINIESTRO_COLUMNS)) {
    rowsRead.siniestros += 1;
    try {
      const parsed = parseSiniestroRow(row.values, catalog, lookups);
      const key = parsed.idFuente.toString();
      if (siniestroBySource.has(key)) {
        throw new RowValidationError(`duplicate ID ${key} in Siniestros`);
      }
      siniestroBySource.set(key, parsed);
    } catch (error) {
      skipped.siniestros += 1;
      recordError(paths.siniestros, row, "siniestro", error);
    }
  }

  const siniestros = [...siniestroBySource.values()];
  const personas: ParsedPersona[] = [];
  const vehiculos: ParsedVehiculo[] = [];

  for await (const row of streamRows(paths.personas, PERSONA_COLUMNS)) {
    rowsRead.personas += 1;
    try {
      const parent = siniestroBySource.get(cellToBigInt(row.values.ID, "ID").toString());
      if (!parent) {
        throw new RowValidationError(`orphan persona row: ID not present in Siniestros`);
      }
      personas.push(parsePersonaRow(row.values, parent, catalog, lookups));
    } catch (error) {
      skipped.personas += 1;
      recordError(paths.personas, row, "persona", error);
    }
  }

  for await (const row of streamRows(paths.vehiculos, VEHICULO_COLUMNS)) {
    rowsRead.vehiculos += 1;
    try {
      const parent = siniestroBySource.get(cellToBigInt(row.values.ID, "ID").toString());
      if (!parent) {
        throw new RowValidationError(`orphan vehiculo row: ID not present in Siniestros`);
      }
      vehiculos.push(parseVehiculoRow(row.values, parent, catalog, lookups));
    } catch (error) {
      skipped.vehiculos += 1;
      recordError(paths.vehiculos, row, "vehiculo", error);
    }
  }

  await seedCatalog(prisma, catalog);

  const zonaIds = await seedLookup(accumulatorRows(lookups.zona), async (row) =>
    (await prisma.zona.upsert({
      where: { nombreEstandarizado: row.nombreEstandarizado },
      create: row,
      update: { nombreNormal: row.nombreNormal },
    })).zonaId,
  );
  const tipoSiniestroIds = await seedLookup(accumulatorRows(lookups.tipoSiniestro), async (row) =>
    (await prisma.tipoSiniestro.upsert({
      where: { nombreEstandarizado: row.nombreEstandarizado },
      create: row,
      update: { nombreNormal: row.nombreNormal },
    })).tipoSiniestroId,
  );
  const causaIds = await seedLookup(accumulatorRows(lookups.causa), async (row) =>
    (await prisma.causa.upsert({
      where: { nombreEstandarizado: row.nombreEstandarizado },
      create: row,
      update: { nombreNormal: row.nombreNormal },
    })).causaId,
  );
  const sectorIds = await seedLookup(accumulatorRows(lookups.sector), async (row) =>
    (await prisma.sector.upsert({
      where: { nombreEstandarizado: row.nombreEstandarizado },
      create: row,
      update: { nombreNormal: row.nombreNormal },
    })).sectorId,
  );
  const calidadIds = await seedLookup(accumulatorRows(lookups.calidadPersona), async (row) =>
    (await prisma.calidadPersona.upsert({
      where: { nombreEstandarizado: row.nombreEstandarizado },
      create: row,
      update: { nombreNormal: row.nombreNormal },
    })).calidadPersonaId,
  );
  const sexoIds = await seedLookup(accumulatorRows(lookups.sexo), async (row) =>
    (await prisma.sexo.upsert({
      where: { nombreEstandarizado: row.nombreEstandarizado },
      create: row,
      update: { nombreNormal: row.nombreNormal },
    })).sexoId,
  );
  const resultadoIds = await seedLookup(accumulatorRows(lookups.resultadoPersona), async (row) =>
    (await prisma.resultadoPersona.upsert({
      where: { nombreEstandarizado: row.nombreEstandarizado },
      create: row,
      update: { nombreNormal: row.nombreNormal },
    })).resultadoPersonaId,
  );
  const tipoVehiculoIds = await seedLookup(accumulatorRows(lookups.tipoVehiculo), async (row) =>
    (await prisma.tipoVehiculo.upsert({
      where: { nombreEstandarizado: row.nombreEstandarizado },
      create: row,
      update: { nombreNormal: row.nombreNormal },
    })).tipoVehiculoId,
  );
  const servicioVehiculoIds = await seedLookup(
    accumulatorRows(lookups.servicioVehiculo),
    async (row) =>
      (await prisma.servicioVehiculo.upsert({
        where: { nombreEstandarizado: row.nombreEstandarizado },
        create: row,
        update: { nombreNormal: row.nombreNormal },
      })).servicioVehiculoId,
  );

  await replaceFacts(
    prisma,
    siniestros.map((siniestro) => siniestro.idFuente),
    options.reset,
  );

  for (const batch of chunk(siniestros, SINIESTRO_BATCH)) {
    await prisma.siniestro.createMany({
      data: batch.map((siniestro) => ({
        idFuente: siniestro.idFuente,
        fecha: siniestro.fecha,
        hora: siniestro.hora,
        comunaId: siniestro.comunaId,
        zonaId: requireLookupId(zonaIds, siniestro.zonaKey, "zona"),
        tipoSiniestroId: requireLookupId(tipoSiniestroIds, siniestro.tipoSiniestroKey, "tipo_siniestro"),
        causaId: requireLookupId(causaIds, siniestro.causaKey, "causa"),
        sectorId: requireLookupId(sectorIds, siniestro.sectorKey, "sector"),
        fallecidos: siniestro.fallecidos,
        lesionadosGraves: siniestro.lesionadosGraves,
        lesionadosMenosGraves: siniestro.lesionadosMenosGraves,
        lesionadosLeves: siniestro.lesionadosLeves,
        ilesos: siniestro.ilesos,
        calle1: siniestro.calle1,
        calle2: siniestro.calle2,
        kmReferencia: siniestro.kmReferencia,
        numeroParte: siniestro.numeroParte,
        tribunal: siniestro.tribunal,
      })),
    });
  }

  const siniestroIdByFuente = await loadSiniestroIdMap(
    prisma,
    siniestros.map((siniestro) => siniestro.idFuente),
  );

  const requireSiniestroId = (idFuente: bigint): bigint => {
    const id = siniestroIdByFuente.get(idFuente);
    if (id === undefined) {
      throw new Error(`internal error: no siniestro_id for id_fuente ${idFuente}`);
    }
    return id;
  };

  for (const batch of chunk(personas, PERSONA_BATCH)) {
    await prisma.persona.createMany({
      data: batch.map((persona) => ({
        siniestroId: requireSiniestroId(persona.idFuente),
        calidadPersonaId: requireLookupId(calidadIds, persona.calidadKey, "calidad_persona"),
        sexoId: requireLookupId(sexoIds, persona.sexoKey, "sexo"),
        resultadoPersonaId: requireLookupId(resultadoIds, persona.resultadoKey, "resultado_persona"),
        edad: persona.edad,
      })),
    });
  }

  for (const batch of chunk(vehiculos, VEHICULO_BATCH)) {
    await prisma.vehiculo.createMany({
      data: batch.map((vehiculo) => ({
        siniestroId: requireSiniestroId(vehiculo.idFuente),
        tipoVehiculoId: requireLookupId(tipoVehiculoIds, vehiculo.tipoKey, "tipo_vehiculo"),
        servicioVehiculoId: requireLookupId(
          servicioVehiculoIds,
          vehiculo.servicioKey,
          "servicio_vehiculo",
        ),
      })),
    });
  }

  const idsWithVehicles = new Set(vehiculos.map((vehiculo) => vehiculo.idFuente.toString()));
  const vehicleLessSiniestros = siniestros
    .map((siniestro) => siniestro.idFuente.toString())
    .filter((idFuente) => !idsWithVehicles.has(idFuente));

  return {
    status: errors.length === 0 ? "ok" : "failed",
    rowsRead,
    inserted: {
      siniestros: siniestros.length,
      personas: personas.length,
      vehiculos: vehiculos.length,
    },
    skipped,
    errors,
    vehicleLessSiniestros,
    lookups: {
      zona: zonaIds.size,
      tipo_siniestro: tipoSiniestroIds.size,
      causa: causaIds.size,
      sector: sectorIds.size,
      calidad_persona: calidadIds.size,
      sexo: sexoIds.size,
      resultado_persona: resultadoIds.size,
      tipo_vehiculo: tipoVehiculoIds.size,
      servicio_vehiculo: servicioVehiculoIds.size,
    },
    catalog: {
      regions: catalog.regions.length,
      comunas: catalog.comunas.length,
      aliases: catalog.aliases.length,
    },
    durationMs: Date.now() - startedAt,
  };
}
