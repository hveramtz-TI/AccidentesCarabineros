/**
 * Protected comparator API (EXP-07 T4).
 *
 * `GET /api/compare?codes=XIII,XV&<filters>` answers the up-to-four-territory
 * comparison for the current level. It reuses the shared guard, the dashboard
 * filter schema, and the dashboard validation, so its 401/400/500 contract is
 * identical to every other protected endpoint; the `codes` parameter and the
 * 1..4/membership rules belong to the compare service.
 */

import type { FastifyPluginAsync } from "fastify";

import { createCompareService } from "../services/compare-service.js";
import { CompareValidationError } from "../services/compare-service.js";
import type { DashboardFilters } from "../types/dashboard-api.js";
import { DashboardValidationError } from "../types/dashboard-api.js";
import type { CompareService } from "../types/compare-api.js";
import { applyApiGuard, baseFilterSchema } from "./api-guard.js";

interface CompareRouteOptions {
  service?: CompareService;
  /** Expected Bearer token; null/empty means the protected route rejects everything. */
  authToken?: string | null;
}

interface CompareQuerystring {
  from?: string;
  to?: string;
  regionId?: number;
  communeId?: string;
  codes?: string;
}

const compareQuerySchema = {
  type: "object",
  properties: {
    ...baseFilterSchema.properties,
    codes: { type: "string" },
  },
  additionalProperties: true,
} as const;

const compareRoutes: FastifyPluginAsync<CompareRouteOptions> = async (fastify, options) => {
  const service = options.service ?? createCompareService();
  applyApiGuard(fastify, {
    authToken: options.authToken ?? null,
    internalMessage: "compare query failed",
  });
  fastify.addHook("onClose", async () => service.close?.());

  fastify.get<{ Querystring: CompareQuerystring }>(
    "/api/compare",
    { schema: { querystring: compareQuerySchema } },
    async (request, reply) => {
      const filters: DashboardFilters = {
        from: request.query.from ?? "2025-01-01",
        to: request.query.to ?? "2025-12-31",
        regionId: request.query.regionId ?? null,
        communeId: request.query.communeId ?? null,
      };
      try {
        const result = await service.getCompare(filters, request.query.codes);
        // Protected browser cache: overwrite the guard's no-store on success only.
        return reply.header("Cache-Control", "private, max-age=60").send(result);
      } catch (error) {
        if (error instanceof CompareValidationError || error instanceof DashboardValidationError) {
          return reply.code(400).send({
            error: {
              code: "VALIDATION_ERROR",
              message: error.message,
              details: [{ field: error.field, reason: error.reason }],
            },
          });
        }
        request.log.error({ err: error }, "compare query failed");
        return reply.code(500).send({ error: { code: "INTERNAL", message: "compare query failed" } });
      }
    },
  );
};

export default compareRoutes;
