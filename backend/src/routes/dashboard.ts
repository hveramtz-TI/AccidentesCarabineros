import type { FastifyPluginAsync } from "fastify";

import { createDashboardController } from "../controllers/dashboard-controller.js";
import { createExportCsvController } from "../controllers/export-csv-controller.js";
import { createDashboardService } from "../services/dashboard-service.js";
import type { DashboardService } from "../types/dashboard-api.js";
import { applyApiGuard, baseFilterSchema } from "./api-guard.js";

interface DashboardRouteOptions {
  service?: DashboardService;
  /** Expected Bearer token; null/empty means the protected route rejects everything. */
  authToken?: string | null;
}

const dashboardRoutes: FastifyPluginAsync<DashboardRouteOptions> = async (fastify, options) => {
  const service = options.service ?? createDashboardService();
  // The shared guard owns the barrier, the cache header, the filter schema, and
  // the error mapping, so every protected endpoint answers 401/400/500 alike.
  applyApiGuard(fastify, {
    authToken: options.authToken ?? null,
    internalMessage: "dashboard query failed",
  });
  fastify.addHook("onClose", async () => service.close?.());

  fastify.get("/api/dashboard", { schema: { querystring: baseFilterSchema } }, createDashboardController(service));

  // Aggregate territory CSV export. Same encapsulated plugin, so the shared
  // guard, no-store header, filter schema, and error mapping apply unchanged.
  fastify.get("/api/dashboard/export.csv", { schema: { querystring: baseFilterSchema } }, createExportCsvController(service));
};

export default dashboardRoutes;
