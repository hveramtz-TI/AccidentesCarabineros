import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import type { DashboardResponse } from "../types/dashboard-api.js";

const emptyResponse: DashboardResponse = {
  meta: {
    schemaVersion: 1,
    source: "carabineros-2025-normalized",
    synthetic: false,
    period: { from: "2025-01-01", to: "2025-12-31" },
    filters: { regionId: null, communeId: null },
    scopeLabel: "National (2025)",
    emptyScope: true,
    generatedAt: "2026-10-10T00:00:00.000Z",
  },
  kpis: { accidents: 0, fatalities: 0, injuries: 0, seriousInjuries: 0 },
  monthlyTrend: [
    "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
    "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
  ].map((month) => ({ month, accidents: 0, fatalities: 0, injuries: 0, seriousInjuries: 0 })),
  severity: [
    { key: "fatal", label: "Fatal", accidents: 0 },
    { key: "serious", label: "Serious injuries", accidents: 0 },
    { key: "minor", label: "Minor injuries", accidents: 0 },
    { key: "onlyIlesos", label: "Uninjured only", accidents: 0 },
  ],
  territories: { scope: "region", items: [], outsideTopCount: 0, outsideAccidents: 0, zeroAccidentCount: 0 },
  causes: { items: [], other: { distinctCount: 0, accidents: 0 } },
  accidentTypes: [],
  sectors: [],
  hourBuckets: {
    items: [0, 3, 6, 9, 12, 15, 18, 21].map((hourStart) => ({
      hourStart,
      label: `${String(hourStart).padStart(2, "0")}-${String(hourStart + 3).padStart(2, "0")}`,
      accidents: 0,
    })),
    midnightArtifactCount: 0,
  },
  vehicles: { items: [], other: { accidents: 0 }, note: "shares no suman 100: un siniestro puede involucrar varios tipos" },
  persons: {
    rows: 0,
    calidad: [],
    sexo: [],
    ageBands: (["0-17", "18-25", "26-40", "41-64", "65+", "unknown"] as const).map((band) => ({ band, count: 0 })),
  },
};

test("GET /api/dashboard returns the full payload and no-store for an injected service", async (t) => {
  const app = buildApp({ logger: false, dashboardService: { async getDashboard() { return emptyResponse; } } });
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/dashboard?unknown=ignored" });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.deepEqual(response.json(), emptyResponse);
  assert.deepEqual((await app.inject({ method: "GET", url: "/health" })).json(), { status: "ok" });
});

test("GET /api/dashboard returns documented validation errors", async (t) => {
  const app = buildApp({ logger: false, dashboardService: { async getDashboard() { throw new Error("must not be called"); } } });
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/dashboard?from=2025-04-01&to=2025-03-31" });

  assert.equal(response.statusCode, 400);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.json().error.code, "VALIDATION_ERROR");
  assert.equal(response.json().error.details[0].field, "from");
});

test("GET /api/dashboard rejects malformed dates and unsupported region IDs", async (t) => {
  const app = buildApp({ logger: false, dashboardService: { async getDashboard() { throw new Error("must not be called"); } } });
  t.after(() => app.close());

  for (const query of ["from=2025-2-01", "regionId=17", "communeId=not-a-commune"]) {
    const response = await app.inject({ method: "GET", url: `/api/dashboard?${query}` });
    assert.equal(response.statusCode, 400, query);
    assert.equal(response.headers["cache-control"], "no-store", query);
    assert.equal(response.json().error.code, "VALIDATION_ERROR", query);
  }
});

test("GET /api/dashboard sanitizes service failures", async (t) => {
  const app = buildApp({ logger: false, dashboardService: { async getDashboard() { throw new Error("secret SQL details"); } } });
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/dashboard" });

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.json(), { error: { code: "INTERNAL", message: "dashboard query failed" } });
});
