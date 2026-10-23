import type { PrismaClient } from "@prisma/client";

import { prisma as sharedPrisma } from "../db/conection.js";
import type { MetaResponse, MetaService } from "../types/meta-api.js";

/**
 * Approved dataset caveats, in display order. Wording and numbers come from
 * `backend/docs/dashboard-metrics.md`; this endpoint only repeats them so the
 * Metodología page cannot drift from the approved source. Do not add a caveat
 * here without a matching approval in that document.
 */
export const META_CAVEATS = [
  "La cobertura corresponde solo al año 2025; no existen datos de otros años para comparar.",
  "234 siniestros (0,3 %) registran una hora exacta de 00:00:00, probablemente por hora faltante en la fuente; se mantienen en la franja 00–03 y se informan, nunca se reasignan.",
  "23.918 filas de personas (16,1 %) no tienen edad registrada; se muestran como una banda propia «sin dato», sin imputación.",
  "6 comunas del catálogo no registran accidentes; se distinguen de la ausencia de datos.",
  "Las participaciones por tipo de vehículo no suman 100 %, porque un siniestro puede involucrar varios tipos.",
  "2 siniestros válidos no tienen filas de vehículo asociadas.",
  "«ZONA» es una dimensión de la fuente y no una región; la región siempre se deriva de la comuna.",
] as const;

export interface MetaRepository {
  /** One parameterless query: subselect counts, never fact rows in Node. */
  countRows(): Promise<{ siniestros: number; personas: number; vehiculos: number }>;
  close?(): Promise<void>;
}

export function createMetaService(
  repository: MetaRepository = createPrismaMetaRepository(),
  now: () => Date = () => new Date(),
): MetaService {
  return {
    close: () => repository.close?.() ?? Promise.resolve(),
    async getMeta(): Promise<MetaResponse> {
      const rowCounts = await repository.countRows();
      return {
        schemaVersion: 1,
        source: "carabineros-2025-normalized",
        synthetic: false,
        coverage: { from: "2025-01-01", to: "2025-12-31" },
        rowCounts,
        caveats: [...META_CAVEATS],
        generatedAt: now().toISOString(),
      };
    },
  };
}

function createPrismaMetaRepository(prisma: PrismaClient = sharedPrisma): MetaRepository {
  return {
    close: () => prisma.$disconnect(),
    async countRows() {
      // Single round-trip, no parameters, no row materialization: Postgres
      // returns three scalar counts from the existing fact tables.
      const rows = await prisma.$queryRaw<
        Array<{ siniestros: bigint; personas: bigint; vehiculos: bigint }>
      >`
        SELECT
          (SELECT count(*) FROM siniestro) AS siniestros,
          (SELECT count(*) FROM persona) AS personas,
          (SELECT count(*) FROM vehiculo) AS vehiculos
      `;
      const row = rows[0];
      if (!row) throw new Error("meta count query returned no rows");
      return {
        siniestros: Number(row.siniestros),
        personas: Number(row.personas),
        vehiculos: Number(row.vehiculos),
      };
    },
  };
}
