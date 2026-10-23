import type { FastifyPluginAsync } from "fastify";

import { createMetaService } from "../services/meta-service.js";
import type { MetaService } from "../types/meta-api.js";
import { applyApiGuard } from "./api-guard.js";

interface MetaRouteOptions {
  service?: MetaService;
  /** Expected Bearer token; null/empty means the protected route rejects everything. */
  authToken?: string | null;
}

const metaRoutes: FastifyPluginAsync<MetaRouteOptions> = async (fastify, options) => {
  const service = options.service ?? createMetaService();
  // Same shared guard as the dashboard: the Bearer barrier runs in
  // preValidation, before the handler and therefore before any count query.
  applyApiGuard(fastify, {
    authToken: options.authToken ?? null,
    internalMessage: "meta query failed",
  });
  fastify.addHook("onClose", async () => service.close?.());

  fastify.get("/api/meta", async (_request, reply) => {
    const result = await service.getMeta();
    // Protected dataset summary: private browser cache, not the public variant.
    return reply.header("Cache-Control", "private, max-age=300").send(result);
  });
};

export default metaRoutes;
