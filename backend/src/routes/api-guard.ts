import type { FastifyInstance } from "fastify";

/**
 * Shared guard for protected read-only API routes.
 *
 * Every dashboard-family endpoint (dashboard, meta, analysis, compare) needs the
 * same barrier: `no-store` on every response, the Bearer request barrier before
 * schema validation, the base filter schema, and one error mapping. Registering
 * it once keeps a rejected request from ever reaching a service or Prisma, and
 * keeps the response contract identical across endpoints.
 */

/** Expected Bearer token for protected routes; null means the route fails closed. */
export interface ApiGuardOptions {
  authToken: string | null;
  /** 500 body message; each route keeps its documented wording. */
  internalMessage: string;
}

/** Filter parameters every dashboard endpoint understands (2025 only). */
export const baseFilterSchema = {
  type: "object",
  properties: {
    from: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    to: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    regionId: { type: "integer", minimum: 1, maximum: 16 },
    communeId: { type: "string", pattern: "^[IVX]+-[0-9]+$" },
  },
  additionalProperties: true,
} as const;

/** Validation failure tied to one filter field; the guard maps it to 400. */
export class ApiGuardValidationError extends Error {
  readonly field: string;
  readonly reason: string;

  constructor(field: string, reason: string, message: string) {
    super(message);
    this.name = "ApiGuardValidationError";
    this.field = field;
    this.reason = reason;
  }
}

export function createApiGuardError(field: string, reason: string, message: string): ApiGuardValidationError {
  return new ApiGuardValidationError(field, reason, message);
}

interface FieldFailure {
  field: string;
  reason: string;
  message: string;
}

/** Fastify schema rejection, shaped like the documented validation body. */
function fromSchemaRejection(error: unknown): FieldFailure | null {
  const validation =
    error instanceof Error && "validation" in error && Array.isArray(error.validation)
      ? (error.validation[0] as { instancePath?: string; params?: { missingProperty?: string }; keyword?: string })
      : undefined;
  if (!validation) return null;
  const field = validation.instancePath?.slice(1) || validation.params?.missingProperty || "query";
  const reason = validation.keyword === "pattern" ? "invalid_format" : "out_of_range";
  const message = field === "from" || field === "to" ? `${field} must be within 2025` : `${field} is invalid`;
  return { field, reason, message };
}

/** Field failures thrown by a service or controller (any Error with field+reason). */
function fromFieldError(error: unknown): FieldFailure | null {
  if (!(error instanceof Error)) return null;
  const candidate = error as { field?: unknown; reason?: unknown };
  if (typeof candidate.field !== "string" || typeof candidate.reason !== "string") return null;
  return { field: candidate.field, reason: candidate.reason, message: error.message };
}

/**
 * Apply the barrier to an encapsulated route plugin. Hook order is part of the
 * contract: `onRequest` sets `no-store` first, `preValidation` rejects before
 * Fastify validates the query, and the error handler is the only place that
 * turns failures into the documented bodies.
 */
export function applyApiGuard(fastify: FastifyInstance, options: ApiGuardOptions): void {
  fastify.addHook("onRequest", async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
  });

  fastify.addHook("preValidation", async (request, reply) => {
    if (!options.authToken) {
      return reply.code(500).send({
        error: { code: "AUTH_NOT_CONFIGURED", message: "UUID_CONNECTION is not set on the backend" },
      });
    }
    const header = request.headers.authorization;
    if (header !== `Bearer ${options.authToken}`) {
      return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "missing or invalid bearer token" } });
    }
  });

  fastify.setErrorHandler((error, request, reply) => {
    const failure = fromSchemaRejection(error) ?? fromFieldError(error);
    if (failure) {
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: failure.message,
          details: [{ field: failure.field, reason: failure.reason }],
        },
      });
    }
    request.log.error({ err: error }, options.internalMessage);
    return reply.code(500).send({ error: { code: "INTERNAL", message: options.internalMessage } });
  });
}
