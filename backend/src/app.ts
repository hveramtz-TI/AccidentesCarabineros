import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

import dashboardRoutes from "./routes/dashboard.js";
import type { DashboardService } from "./types/dashboard-api.js";

export interface BuildAppOptions {
  /** Override Fastify logger configuration; defaults to enabled. */
  logger?: boolean;
  /** Deterministic data-service seam for API tests and alternate hosts. */
  dashboardService?: DashboardService;
}

/**
 * Build a configured Fastify instance without starting it.
 * All route plugins register here (single composition point);
 * `server.ts` is the only place that calls `listen`.
 */
export function buildApp(opts: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? true });

  // Cloud Run health check endpoint.
  app.get("/health", () => {
    return { status: "ok" };
  });

  app.register(dashboardRoutes, { service: opts.dashboardService });

  return app;
}
