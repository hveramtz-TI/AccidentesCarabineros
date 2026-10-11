import type { FastifyReply, FastifyRequest } from "fastify";

import {
  DashboardValidationError,
  type DashboardFilters,
  type DashboardService,
} from "../types/dashboard-api.js";
import { validateDashboardFilters } from "../services/dashboard-service.js";

interface Querystring {
  from?: string;
  to?: string;
  regionId?: number;
  communeId?: string;
}

export function createDashboardController(service: DashboardService) {
  return async function dashboardController(
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
      const result = await service.getDashboard(filters);
      return reply.header("Cache-Control", "no-store").send(result);
    } catch (error) {
      if (error instanceof DashboardValidationError) {
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: error.message,
            details: [{ field: error.field, reason: error.reason }],
          },
        });
      }
      request.log.error({ err: error }, "dashboard query failed");
      return reply.code(500).send({ error: { code: "INTERNAL", message: "dashboard query failed" } });
    }
  };
}
