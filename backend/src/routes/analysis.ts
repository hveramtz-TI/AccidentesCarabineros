/**
 * Protected analysis API (EXP-03 T1/T2).
 *
 * One additive endpoint: `/api/analysis` returns all approved sections for a
 * filter set, starting with `causes`. It reuses the shared guard, the base
 * filter schema, and the dashboard's validation so its 401/400/500 contract is
 * identical to `/api/dashboard`.
 */

import type { FastifyPluginAsync } from "fastify";

import { createAnalysisService } from "../services/analysis-service.js";
import type { DashboardFilters } from "../types/dashboard-api.js";
import type { AnalysisService } from "../types/insights-api.js";
import { applyApiGuard, baseFilterSchema } from "./api-guard.js";

interface AnalysisRouteOptions {
  service?: AnalysisService;
  /** Expected Bearer token; null/empty means the protected route rejects everything. */
  authToken?: string | null;
}

interface AnalysisQuerystring {
  from?: string;
  to?: string;
  regionId?: number;
  communeId?: string;
}

const analysisRoutes: FastifyPluginAsync<AnalysisRouteOptions> = async (fastify, options) => {
  const service = options.service ?? createAnalysisService();
  // Shared guard: no-store first, Bearer in preValidation (before validation,
  // the handler, and any query), one error mapping.
  applyApiGuard(fastify, {
    authToken: options.authToken ?? null,
    internalMessage: "analysis query failed",
  });
  fastify.addHook("onClose", async () => service.close?.());

  fastify.get<{ Querystring: AnalysisQuerystring }>(
    "/api/analysis",
    { schema: { querystring: baseFilterSchema } },
    async (request, reply) => {
      const filters: DashboardFilters = {
        from: request.query.from ?? "2025-01-01",
        to: request.query.to ?? "2025-12-31",
        regionId: request.query.regionId ?? null,
        communeId: request.query.communeId ?? null,
      };
      const result = await service.getAnalysis(filters);
      // Protected browser cache: overwrite the guard's no-store on success only.
      return reply.header("Cache-Control", "private, max-age=60").send(result);
    },
  );
};

export default analysisRoutes;
