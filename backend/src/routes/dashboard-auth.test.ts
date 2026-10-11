import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import type { DashboardService } from "../types/dashboard-api.js";

const TOKEN = "secret-connection-token";

function trackingService(): DashboardService & { calls: number } {
  const service = {
    calls: 0,
    async getDashboard() {
      service.calls += 1;
      throw new Error("service reached");
    },
  };
  return service;
}

function appWith(service: DashboardService, overrides: Parameters<typeof buildApp>[0] = {}) {
  return buildApp({ logger: false, authToken: TOKEN, dashboardService: service, ...overrides });
}

test("protected dashboard requests are rejected with 401 before the service runs", async (t) => {
  const service = trackingService();
  const app = appWith(service);
  t.after(() => app.close());

  const missing = await app.inject({ method: "GET", url: "/api/dashboard" });
  assert.equal(missing.statusCode, 401);
  assert.equal(missing.json().error.code, "UNAUTHORIZED");

  const invalid = await app.inject({
    method: "GET",
    url: "/api/dashboard",
    headers: { authorization: "Bearer wrong-token" },
  });
  assert.equal(invalid.statusCode, 401);

  const basicScheme = await app.inject({
    method: "GET",
    url: "/api/dashboard",
    headers: { authorization: `Basic ${TOKEN}` },
  });
  assert.equal(basicScheme.statusCode, 401);
  assert.equal(service.calls, 0);
});

test("a valid bearer token reaches the service", async (t) => {
  const service = trackingService();
  const app = appWith(service);
  t.after(() => app.close());

  const response = await app.inject({
    method: "GET",
    url: "/api/dashboard",
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  assert.equal(response.statusCode, 500, "service seam throws after auth passes");
  assert.equal(service.calls, 1);
});

test("auth rejections carry CORS headers so the browser can read the 401", async (t) => {
  const service = trackingService();
  const app = appWith(service);
  t.after(() => app.close());

  const response = await app.inject({
    method: "GET",
    url: "/api/dashboard",
    headers: { origin: "http://localhost:3200" },
  });
  assert.equal(response.statusCode, 401);
  assert.equal(response.headers["access-control-allow-origin"], "http://localhost:3200");
  assert.equal(response.headers["cache-control"], "no-store");
});

test("dashboard fails clearly when UUID_CONNECTION is unset", async (t) => {
  const service = trackingService();
  const app = appWith(service, { authToken: null });
  t.after(() => app.close());

  const response = await app.inject({
    method: "GET",
    url: "/api/dashboard",
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  assert.equal(response.statusCode, 500);
  assert.equal(response.json().error.code, "AUTH_NOT_CONFIGURED");
  assert.equal(service.calls, 0);
});

test("/health stays public even with the bearer guard enabled", async (t) => {
  const app = appWith(trackingService());
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: "ok" });
});

test("allowed origins receive CORS headers and preflight completes without a token", async (t) => {
  const app = appWith(trackingService());
  t.after(() => app.close());

  for (const origin of ["http://localhost:3200", "http://localhost:5173"]) {
    const preflight = await app.inject({
      method: "OPTIONS",
      url: "/api/dashboard",
      headers: { origin, "access-control-request-method": "GET" },
    });
    assert.equal(preflight.statusCode, 204, origin);
    assert.equal(preflight.headers["access-control-allow-origin"], origin, origin);
    assert.equal(preflight.headers["access-control-allow-headers"], "Authorization, Content-Type", origin);

    const simple = await app.inject({
      method: "GET",
      url: "/api/dashboard",
      headers: { origin, authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(simple.headers["access-control-allow-origin"], origin, origin);
    assert.equal(simple.headers.vary, "Origin", origin);
  }
});

test("unknown origins get no CORS headers", async (t) => {
  const app = appWith(trackingService());
  t.after(() => app.close());

  const response = await app.inject({
    method: "GET",
    url: "/api/dashboard",
    headers: { origin: "https://evil.example" },
  });
  assert.equal(response.statusCode, 401);
  assert.equal(response.headers["access-control-allow-origin"], undefined);
});
