import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";

const TOKEN = "test-token";
const PROTECTED = "/api/dashboard?period=2025";

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
} as const;

test("security headers are present on public and rejected responses", async (t) => {
  const app = buildApp({ logger: false, authToken: TOKEN });
  t.after(() => app.close());

  const health = await app.inject({ method: "GET", url: "/health" });
  assert.equal(health.statusCode, 200);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    assert.equal(health.headers[name], value, name);
  }

  const rejected = await app.inject({ method: "GET", url: PROTECTED });
  assert.equal(rejected.statusCode, 401);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    assert.equal(rejected.headers[name], value, name);
  }
});

test("a different-length wrong bearer token is rejected without throwing", async (t) => {
  const app = buildApp({ logger: false, authToken: TOKEN });
  t.after(() => app.close());

  const response = await app.inject({
    method: "GET",
    url: PROTECTED,
    headers: { authorization: "Bearer x" },
  });
  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), {
    error: { code: "UNAUTHORIZED", message: "missing or invalid bearer token" },
  });
});

test("the misconfiguration body does not expose the secret environment name", async (t) => {
  const app = buildApp({ logger: false, authToken: null });
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: PROTECTED });
  assert.equal(response.statusCode, 500);
  assert.equal(response.body.includes("UUID_CONNECTION"), false);
  assert.deepEqual(response.json(), {
    error: { code: "AUTH_NOT_CONFIGURED", message: "authentication is not configured on the server" },
  });
});
