import { readFileSync } from "node:fs";

import { buildCommuneAliases, type CommuneAliasSeed } from "./aliases.js";
import type { CommuneResolverCatalog } from "./commune.js";
import { normalizeLabel } from "./normalize.js";

export interface RegionSeed {
  regionId: number;
  nombreNormal: string;
  nombreEstandarizado: string;
  nombreAbreviado: string;
  numeroRomano: string;
}

export interface ComunaSeed {
  comunaId: string;
  regionId: number;
  nombreNormal: string;
  nombreEstandarizado: string;
}

export interface CatalogSeed extends CommuneResolverCatalog {
  regions: RegionSeed[];
  comunas: ComunaSeed[];
  aliases: CommuneAliasSeed[];
}

interface RawCommune {
  name: string;
  identifier: string;
}

interface RawRegion {
  name: string;
  romanNumber: string;
  number: string;
  abbreviation: string;
  communes: RawCommune[];
}

interface RawCatalog {
  regions: RawRegion[];
}

class CatalogError extends Error {
  constructor(message: string) {
    super(`catalog: ${message}`);
    this.name = "CatalogError";
  }
}

function assertUniqueKey(seen: Set<string>, key: string, label: string, source: string): void {
  if (seen.has(key)) {
    throw new CatalogError(`duplicate ${label} ${JSON.stringify(key)} (from ${source})`);
  }
  seen.add(key);
}

/**
 * Build the region/commune seeds plus the resolution maps from the canonical
 * JSON. Standardized keys, source IDs and each region's alternate keys must be
 * unique; any collision is fatal.
 */
export function buildCatalog(raw: unknown): CatalogSeed {
  const catalog = raw as RawCatalog;
  if (!catalog || !Array.isArray(catalog.regions)) {
    throw new CatalogError("JSON has no `regions` array");
  }

  const regionIds = new Set<string>();
  const regionKeys = new Set<string>();
  const regionAbbreviations = new Set<string>();
  const regionRomans = new Set<string>();
  const comunaIds = new Set<string>();
  const comunaKeys = new Set<string>();
  const canonicalByKey = new Map<string, string>();

  const regions: RegionSeed[] = [];
  const comunas: ComunaSeed[] = [];

  for (const region of catalog.regions) {
    const regionId = Number(region.number);
    if (!Number.isInteger(regionId) || regionId < 0) {
      throw new CatalogError(`invalid region number ${JSON.stringify(region.number)}`);
    }
    const nombreEstandarizado = normalizeLabel(region.name);
    assertUniqueKey(regionIds, String(regionId), "region_id", region.name);
    assertUniqueKey(regionKeys, nombreEstandarizado, "region normalized key", region.name);
    assertUniqueKey(regionAbbreviations, region.abbreviation, "region abbreviation", region.name);
    assertUniqueKey(regionRomans, region.romanNumber, "region roman number", region.name);

    regions.push({
      regionId,
      nombreNormal: region.name,
      nombreEstandarizado,
      nombreAbreviado: region.abbreviation,
      numeroRomano: region.romanNumber,
    });

    for (const commune of region.communes ?? []) {
      const nombreEstandarizadoComuna = normalizeLabel(commune.name);
      assertUniqueKey(comunaIds, commune.identifier, "comuna_id", commune.name);
      assertUniqueKey(
        comunaKeys,
        nombreEstandarizadoComuna,
        "comuna normalized key",
        commune.name,
      );
      canonicalByKey.set(nombreEstandarizadoComuna, commune.identifier);
      comunas.push({
        comunaId: commune.identifier,
        regionId,
        nombreNormal: commune.name,
        nombreEstandarizado: nombreEstandarizadoComuna,
      });
    }
  }

  const aliases = buildCommuneAliases();
  const aliasByKey = new Map<string, string>();
  for (const alias of aliases) {
    if (canonicalByKey.has(alias.aliasKey)) {
      throw new CatalogError(
        `alias ${JSON.stringify(alias.aliasKey)} collides with a canonical commune key`,
      );
    }
    if (aliasByKey.has(alias.aliasKey)) {
      throw new CatalogError(`duplicate alias ${JSON.stringify(alias.aliasKey)}`);
    }
    if (!comunaIds.has(alias.comunaId)) {
      throw new CatalogError(
        `alias ${JSON.stringify(alias.aliasKey)} targets unknown comuna ${alias.comunaId}`,
      );
    }
    aliasByKey.set(alias.aliasKey, alias.comunaId);
  }

  return { regions, comunas, aliases, canonicalByKey, aliasByKey };
}

export function loadCatalogFile(path: string): CatalogSeed {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    throw new CatalogError(
      `cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return buildCatalog(JSON.parse(text));
}
