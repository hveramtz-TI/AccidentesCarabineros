import assert from "node:assert/strict";
import test from "node:test";

import Fastify from "fastify";

import { applyApiGuard, baseFilterSchema, createApiGuardError } from "./api-guard.js";

const TOKEN = "shared-guard-token";

interface GuardedCall {
  reached: boolean;
}

/**
 * A synthetic protected route with the same shape as the dashboard route: the
 * guard must run before validation and before the handler, so a rejected
 * request never reaches the handler body.
 */
function guardedApp(authToken: string | null, calls: GuardedCall) {
  const app = Fastify({ logger: false });
  app.register(async (fastify) => {
    applyApiGuard(fastify, { authToken, internalMessage: "guarded query failed" });
    fastify.get("/guarded", { schema: { querystring: baseFilterSchema } }, async () => {
      calls.reached = true;
      return { ok: true };
    });
  });
  return app;
}

test("the shared guard rejects a missing or invalid bearer before the handler runs", async (t) => {
  const calls: GuardedCall = { reached: false };
  const app = guardedApp(TOKEN, calls);
  t.after(() => app.close());

  const missing = await app.inject({ method: "GET", url: "/guarded" });
  assert.equal(missing.statusCode, 401);
  assert.deepEqual(missing.json(), { error: { code: "UNAUTHORIZED", message: "missing or invalid bearer token" } });

  const invalid = await app.inject({
    method: "GET",
    url: "/guarded",
    headers: { authorization: `Bearer ${TOKEN}-wrong` },
  });
  assert.equal(invalid.statusCode, 401);
  assert.equal(calls.reached, false);
});

test("the shared guard fails closed when no token is configured", async (t) => {
  const calls: GuardedCall = { reached: false };
  const app = guardedApp(null, calls);
  t.after(() => app.close());

  const response = await app.inject({
    method: "GET",
    url: "/guarded",
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.json(), {
    error: { code: "AUTH_NOT_CONFIGURED", message: "UUID_CONNECTION is not set on the backend" },
  });
  assert.equal(calls.reached, false);
});

test("the shared guard always sets no-store, including on rejections", async (t) => {
  const calls: GuardedCall = { reached: false };
  const app = guardedApp(TOKEN, calls);
  t.after(() => app.close());

  const rejected = await app.inject({ method: "GET", url: "/guarded" });
  assert.equal(rejected.headers["cache-control"], "no-store");

  const accepted = await app.inject({
    method: "GET",
    url: "/guarded",
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  assert.equal(accepted.statusCode, 200);
  assert.equal(accepted.headers["cache-control"], "no-store");
  assert.equal(calls.reached, true);
});

test("the shared guard validates the base filter schema", async (t) => {
  const calls: GuardedCall = { reached: false };
  const app = guardedApp(TOKEN, calls);
  t.after(() => app.close());

  for (const query of ["from=2025-2-01", "regionId=17", "communeId=not-a-commune"]) {
    const response = await app.inject({
      method: "GET",
      url: `/guarded?${query}`,
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(response.statusCode, 400, query);
    assert.equal(response.json().error.code, "VALIDATION_ERROR", query);
    assert.equal(response.headers["cache-control"], "no-store", query);
    assert.equal(calls.reached, false, query);
  }

  const unknown = await app.inject({
    method: "GET",
    url: "/guarded?unknown=ignored",
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  assert.equal(unknown.statusCode, 200, "unknown parameters stay ignored");
});

test("the shared guard maps its own validation errors and sanitizes failures", async (t) => {
  const app = Fastify({ logger: false });
  t.after(() => app.close());
  app.register(async (fastify) => {
    applyApiGuard(fastify, { authToken: TOKEN, internalMessage: "guarded query failed" });
    fastify.get(
      "/guarded-invalid",
      { schema: { querystring: baseFilterSchema } },
      async () => {
        throw createApiGuardError("from", "after_to", "from must be on or before to");
      },
    );
    fastify.get(
      "/guarded-boom",
      { schema: { querystring: baseFilterSchema } },
      async () => {
        throw new Error("secret SQL details");
      },
    );
  });

  const invalid = await app.inject({
    method: "GET",
    url: "/guarded-invalid?from=2025-04-01&to=2025-03-31",
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  assert.equal(invalid.statusCode, 400);
  assert.deepEqual(invalid.json().error, {
    code: "VALIDATION_ERROR",
    message: "from must be on or before to",
    details: [{ field: "from", reason: "after_to" }],
  });

  const boom = await app.inject({
    method: "GET",
    url: "/guarded-boom",
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  assert.equal(boom.statusCode, 500);
  assert.deepEqual(boom.json(), { error: { code: "INTERNAL", message: "guarded query failed" } });
});
