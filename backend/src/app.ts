import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

import dashboardRoutes from "./routes/dashboard.js";
import metaRoutes from "./routes/meta.js";
import type { DashboardService } from "./types/dashboard-api.js";
import type { MetaService } from "./types/meta-api.js";

const DEFAULT_CORS_ORIGINS = Object.freeze(["http://localhost:3200", "http://localhost:5173"]);

export interface BuildAppOptions {
  /** Override Fastify logger configuration; defaults to enabled. */
  logger?: boolean;
  /** Deterministic data-service seam for API tests and alternate hosts. */
  dashboardService?: DashboardService;
  /** Deterministic metadata-service seam for API tests and alternate hosts. */
  metaService?: MetaService;
  /** Expected Bearer token for protected API routes; unset means auth is not configured. */
  authToken?: string | null;
  /** Exact browser origins allowed by the CORS allowlist. */
  corsOrigins?: readonly string[];
}

/**
 * Build a configured Fastify instance without starting it.
 * All route plugins register here (single composition point);
 * `server.ts` is the only place that calls `listen`.
 */
export function buildApp(opts: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? true });
  const corsOrigins = new Set(opts.corsOrigins ?? DEFAULT_CORS_ORIGINS);

  // Narrow local CORS: allow only documented origins, preflight short-circuits
  // before any auth or route handling so OPTIONS never needs a token.
  app.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin;
    if (typeof origin !== "string" || !corsOrigins.has(origin)) return;
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
    reply.header("Access-Control-Max-Age", "600");
    reply.header("Vary", "Origin");
    if (request.method === "OPTIONS") {
      return reply.code(204).send();
    }
  });

  // CORS headers must survive route-level errors, otherwise the browser
  // reports an opaque network failure instead of the real 400/401/500.
  app.setErrorHandler((error, request, reply) => {
    if (!reply.hasHeader("Cache-Control")) reply.header("Cache-Control", "no-store");
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (error instanceof SyntaxError || (typeof statusCode === "number" && statusCode < 500)) {
      return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "invalid request" } });
    }
    request.log.error({ err: error }, "request failed");
    return reply.code(500).send({ error: { code: "INTERNAL", message: "request failed" } });
  });

  // Cloud Run health check endpoint — always public.
  app.get("/health", () => {
    return { status: "ok" };
  });

  app.register(dashboardRoutes, {
    service: opts.dashboardService,
    authToken: opts.authToken !== undefined ? opts.authToken : process.env.UUID_CONNECTION ?? null,
  });

  app.register(metaRoutes, {
    service: opts.metaService,
    authToken: opts.authToken !== undefined ? opts.authToken : process.env.UUID_CONNECTION ?? null,
  });

  return app;
}
