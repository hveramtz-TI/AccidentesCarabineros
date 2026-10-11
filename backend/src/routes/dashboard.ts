import type { FastifyPluginAsync } from "fastify";

import { createDashboardController } from "../controllers/dashboard-controller.js";
import { createDashboardService } from "../services/dashboard-service.js";
import { DashboardValidationError, type DashboardService } from "../types/dashboard-api.js";

interface DashboardRouteOptions {
  service?: DashboardService;
}

const querystringSchema = {
  type: "object",
  properties: {
    from: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    to: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    regionId: { type: "integer", minimum: 1, maximum: 16 },
    communeId: { type: "string", pattern: "^[IVX]+-[0-9]+$" },
  },
  additionalProperties: true,
} as const;

const dashboardRoutes: FastifyPluginAsync<DashboardRouteOptions> = async (fastify, options) => {
  const service = options.service ?? createDashboardService();
  fastify.addHook("onRequest", async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
  });
  fastify.addHook("onClose", async () => service.close?.());

  fastify.setErrorHandler((error, request, reply) => {
    const validation = error instanceof Error && "validation" in error && Array.isArray(error.validation)
      ? error.validation[0] as { instancePath?: string; params?: { missingProperty?: string }; keyword?: string }
      : undefined;
    if (validation) {
      const field = validation.instancePath?.slice(1) || validation.params?.missingProperty || "query";
      const reason = validation.keyword === "pattern" ? "invalid_format" : "out_of_range";
      const message = field === "from" || field === "to"
        ? `${field} must be within 2025`
        : `${field} is invalid`;
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message,
          details: [{ field, reason }],
        },
      });
    }
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
  });

  fastify.get("/api/dashboard", { schema: { querystring: querystringSchema } }, createDashboardController(service));
};

export default dashboardRoutes;
