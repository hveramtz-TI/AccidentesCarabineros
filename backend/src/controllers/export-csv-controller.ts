import type { FastifyReply, FastifyRequest } from "fastify";

import {
  assertCsvByteLimit,
  assertTerritoryRowLimit,
  ExportLimitError,
  serializeCsv,
  TERRITORY_CSV_FILENAME,
  TERRITORY_CSV_HEADER_ROW,
} from "../lib/csv.js";
import { percent, validateDashboardFilters } from "../services/dashboard-service.js";
import {
  DashboardValidationError,
  type DashboardFilters,
  type DashboardService,
  type TerritoryReport,
} from "../types/dashboard-api.js";

interface Querystring {
  from?: string;
  to?: string;
  regionId?: number;
  communeId?: string;
}

/** es-CL share: one decimal, comma separator; quoting comes from the serializer. */
function shareCell(accidents: number, total: number): string {
  return percent(accidents, total).toFixed(1).replace(".", ",");
}

/**
 * Maps one report to the eight CSV cells. Region-scope rows are regions
 * themselves (empty commune cells); commune-scope rows carry the resolved
 * region metadata, falling back to the catalog code prefix (XIII-1 → XIII).
 */
function territoryCsvCells(report: TerritoryReport): string[][] {
  const isRegionScope = report.scope === "region";
  return report.rows.map((row) => {
    let codigoRegion: string;
    let region: string;
    if (isRegionScope) {
      codigoRegion = row.code;
      region = row.name;
    } else {
      const dash = row.code.lastIndexOf("-");
      codigoRegion = report.regionCode ?? (dash > 0 ? row.code.slice(0, dash) : row.code);
      region = report.regionName ?? "";
    }
    return [
      isRegionScope ? "Región" : "Comuna",
      codigoRegion,
      region,
      isRegionScope ? "" : row.code,
      isRegionScope ? "" : row.name,
      String(row.accidents),
      String(row.fatalities),
      shareCell(row.accidents, report.totalAccidents),
    ];
  });
}

export function createExportCsvController(service: DashboardService) {
  return async function exportCsvController(
    request: FastifyRequest<{ Querystring: Querystring }>,
    reply: FastifyReply,
  ) {
    const filters: DashboardFilters = {
      from: request.query.from ?? "2025-01-01",
      to: request.query.to ?? "2025-12-31",
      regionId: request.query.regionId ?? null,
      communeId: request.query.communeId ?? null,
    };
    try {
      validateDashboardFilters(filters);
      const report = await service.getTerritoryReport(filters);
      assertTerritoryRowLimit(report.rows.length);
      const body = serializeCsv(TERRITORY_CSV_HEADER_ROW, territoryCsvCells(report));
      assertCsvByteLimit(body);
      // The guard already set Cache-Control: no-store; this handler only adds
      // the CSV content headers so the browser downloads the aggregate report.
      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="${TERRITORY_CSV_FILENAME}"`)
        .send(body);
    } catch (error) {
      if (error instanceof DashboardValidationError || error instanceof ExportLimitError) {
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: error.message,
            details: [{ field: error.field, reason: error.reason }],
          },
        });
      }
      request.log.error({ err: error }, "dashboard export failed");
      return reply.code(500).send({ error: { code: "INTERNAL", message: "dashboard export failed" } });
    }
  };
}
