import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

export interface BuildAppOptions {
  /** Override Fastify logger configuration; defaults to enabled. */
  logger?: boolean;
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

  return app;
}
