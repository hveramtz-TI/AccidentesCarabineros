import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import { DashboardValidationError } from "../types/dashboard-api.js";
import {
  createCompareService,
  type CompareRepository,
  type CompareTerritoryAggregate,
  type CompareTrendRow,
} from "../services/compare-service.js";
import type { DashboardFilters, DashboardResponse } from "../types/dashboard-api.js";
import type { CompareResponse, CompareService } from "../types/compare-api.js";
import type { ResolvedTerritory } from "../services/dashboard-service.js";
import type { AnalysisResponse } from "../types/insights-api.js";
import type { MetaResponse } from "../types/meta-api.js";

const TOKEN = "compare-test-token";
const auth = { authorization: `Bearer ${TOKEN}` };
const NOW = () => new Date("2026-10-24T12:34:56.000Z");

const NATIONAL: ResolvedTerritory = {
  scopeLabel: "National (2025)",
  territoryScope: "region",
  regionId: null,
  communeId: null,
};
const IN_XIII: ResolvedTerritory = {
  scopeLabel: "Región Metropolitana de Santiago",
  territoryScope: "commune",
  regionId: 13,
  communeId: null,
};
const IN_CERRILLOS: ResolvedTerritory = {
  scopeLabel: "Cerrillos",
  territoryScope: "commune",
  regionId: 13,
  communeId: "XIII-1",
};

function emptyDashboard(): DashboardResponse {
  return { route: "dashboard" } as unknown as DashboardResponse;
}

function emptyAnalysis(): AnalysisResponse {
  return { route: "analysis" } as unknown as AnalysisResponse;
}

/** Standard national fixture: two populated regions + one zero row. */
const NATIONAL_ROWS: CompareTerritoryAggregate[] = [
  { code: "XIII", name: "Región Metropolitana de Santiago", accidents: 20293, fatalities: 350 },
  { code: "XV", name: "Región de Arica y Parinacota", accidents: 52788, fatalities: 900 },
  { code: "I", name: "Región de Tarapacá", accidents: 0, fatalities: 0 },
];

/**
 * Fake compare repository. `territories` is what ONE aggregate returns for the
 * resolved scope: every catalog territory at the active level with its totals
 * (codes, names, scope denominator and out-of-scope rejection all derive from
 * this single read). `trends` maps requested codes to sparse monthly rows.
 */
function repositoryWith(opts: {
  territories?: CompareTerritoryAggregate[];
  trends?: Record<string, CompareTrendRow[]>;
} = {}) {
  const state = {
    resolved: 0,
    totalsLoaded: 0,
    trendsLoaded: [] as string[],
    lastFilters: null as DashboardFilters | null,
  };
  const repository: CompareRepository = {
    async resolveTerritory(filters) {
      state.resolved += 1;
      state.lastFilters = filters;
      if (filters.communeId) return IN_CERRILLOS;
      if (filters.regionId === 13) return IN_XIII;
      return NATIONAL;
    },
    async loadTerritoryTotals(_filters, territory) {
      state.totalsLoaded += 1;
      if (opts.territories) return opts.territories;
      return territory.territoryScope === "region" ? NATIONAL_ROWS : [{ code: "XIII-1", name: "Cerrillos", accidents: 502, fatalities: 4 }];
    },
    async loadTerritoryTrends(_filters, codes) {
      state.trendsLoaded.push(codes.join("+"));
      const rows: Array<{ code: string } & CompareTrendRow> = [];
      for (const code of codes) {
        for (const row of opts.trends?.[code] ?? []) {
          rows.push({ code, ...row });
        }
      }
      return rows;
    },
  };
  return { repository, state };
}

function appWith(service: CompareService, overrides: Parameters<typeof buildApp>[0] = {}) {
  return buildApp({
    logger: false,
    authToken: TOKEN,
    compareService: service,
    dashboardService: {
      async getDashboard() { return emptyDashboard(); },
      async getTerritoryReport() {
        return { scope: "region", scopeLabel: "", regionCode: null, regionName: null, rows: [], totalAccidents: 0 };
      },
    },
    analysisService: { async getAnalysis() { return emptyAnalysis(); } },
    metaService: { async getMeta() { return { route: "meta" } as unknown as MetaResponse; } },
    ...overrides,
  });
}

test("compare rejects missing and invalid bearers before any repository work", async (t) => {
  const { repository, state } = repositoryWith();
  const app = appWith(createCompareService(repository, NOW));
  t.after(() => app.close());

  const missing = await app.inject({ method: "GET", url: "/api/compare?codes=XIII" });
  assert.equal(missing.statusCode, 401);
  assert.equal(missing.json().error.code, "UNAUTHORIZED");

  const invalid = await app.inject({ method: "GET", url: "/api/compare?codes=XIII", headers: { authorization: "Bearer wrong" } });
  assert.equal(invalid.statusCode, 401);
  assert.equal(state.resolved, 0);
  assert.equal(state.totalsLoaded, 0);
});

test("compare answers 400 required when codes is absent, blank, or empty", async (t) => {
  const { repository, state } = repositoryWith();
  const app = appWith(createCompareService(repository, NOW));
  t.after(() => app.close());

  for (const query of ["", "?", "?codes=", "?codes=%20%20", "?codes=%2C%20"]) {
    const response = await app.inject({ method: "GET", url: `/api/compare${query}`, headers: auth });
    assert.equal(response.statusCode, 400, query);
    assert.equal(response.json().error.code, "VALIDATION_ERROR", query);
    assert.deepEqual(response.json().error.details, [{ field: "codes", reason: "required" }], query);
  }
  assert.equal(state.resolved, 0, "a missing codes list never reaches the data layer");
});

test("compare validates date filters with the dashboard contract", async (t) => {
  const { repository, state } = repositoryWith();
  const app = appWith(createCompareService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/compare?codes=XIII&from=2024-01-01", headers: auth });
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json().error.details, [{ field: "from", reason: "out_of_range" }]);
  assert.equal(state.resolved, 0);
});

test("compare rejects the commune scope with not_supported before any query", async (t) => {
  const { repository, state } = repositoryWith();
  const app = appWith(createCompareService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/compare?communeId=XIII-1&codes=XIII-1", headers: auth });
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json().error.details, [{ field: "codes", reason: "not_supported" }]);
  assert.deepEqual(state.lastFilters, { from: "2025-01-01", to: "2025-12-31", regionId: null, communeId: "XIII-1" });
  assert.equal(state.totalsLoaded, 0);
  assert.equal(state.trendsLoaded.length, 0);
});

test("compare rejects more than four distinct codes before the catalog read", async (t) => {
  const { repository, state } = repositoryWith();
  const app = appWith(createCompareService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/compare?codes=I,II,XIII,XIV,XV", headers: auth });
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json().error.details, [{ field: "codes", reason: "too_many_codes" }]);
  assert.equal(state.totalsLoaded, 0);
});

test("compare rejects malformed codes before the catalog read", async (t) => {
  const { repository, state } = repositoryWith();
  const app = appWith(createCompareService(repository, NOW));
  t.after(() => app.close());

  for (const code of ["xiii", "XIII-1-2", "%21", "X III"]) {
    const response = await app.inject({ method: "GET", url: `/api/compare?codes=${code}`, headers: auth });
    assert.equal(response.statusCode, 400, code);
    assert.deepEqual(response.json().error.details, [{ field: "codes", reason: "invalid_format" }], code);
  }
  assert.equal(state.totalsLoaded, 0);
});

test("compare de-duplicates and trims codes, preserving request order", async (t) => {
  const { repository, state } = repositoryWith({ trends: {} });
  const app = appWith(createCompareService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/compare?codes=XIII,XV,XIII,%20XV%20,XV", headers: auth });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(state.trendsLoaded, ["XIII+XV"], "trimmed, de-duplicated, order-preserved, one trends call");
  const body = response.json() as CompareResponse;
  assert.deepEqual(body.territories.map((row) => row.code), ["XIII", "XV"]);
});

test("compare rejects unknown and out-of-scope codes with 400 not_found or out_of_scope", async (t) => {
  // Catalog contains XIII/XV/I. XX is not even a catalog identifier; I is in
  // the catalog but the wrong-level XIII-1 and the unknown XX must not query.
  const { repository, state } = repositoryWith();
  const app = appWith(createCompareService(repository, NOW));
  t.after(() => app.close());

  const unknown = await app.inject({ method: "GET", url: "/api/compare?codes=XX", headers: auth });
  assert.equal(unknown.statusCode, 400);
  assert.deepEqual(unknown.json().error.details, [{ field: "codes", reason: "not_found" }]);

  const wrongLevel = await app.inject({ method: "GET", url: "/api/compare?codes=XIII-1", headers: auth });
  assert.equal(wrongLevel.statusCode, 400, "commune codes are out of scope at national level");
  assert.deepEqual(wrongLevel.json().error.details, [{ field: "codes", reason: "not_found" }]);

  const outOfScope = await app.inject({ method: "GET", url: "/api/compare?regionId=13&codes=XV-2", headers: auth });
  assert.equal(outOfScope.statusCode, 400, "a commune of another region is syntactically valid but out of scope");
  assert.deepEqual(outOfScope.json().error.details, [{ field: "codes", reason: "out_of_scope" }]);

  assert.equal(state.trendsLoaded.length, 0, "rejected code lists never run the trends aggregate");
});

test("compare returns totals, shares over the scope total, and dense twelve-point trends", async (t) => {
  const xiiiTrend: CompareTrendRow[] = [
    { month: "2025-01", accidents: 1600, fatalities: 30 },
    { month: "2025-12", accidents: 1900, fatalities: 28 },
  ];
  const { repository } = repositoryWith({ trends: { XIII: xiiiTrend } });
  const app = appWith(createCompareService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/compare?codes=XIII", headers: auth });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "application/json; charset=utf-8");
  assert.equal(response.headers["cache-control"], "private, max-age=60");

  const body = response.json() as CompareResponse;
  assert.deepEqual(Object.keys(body).sort(), ["filters", "level", "meta", "period", "schemaVersion", "territories"]);
  assert.equal(body.schemaVersion, 1);
  assert.equal(body.level, "region");
  assert.deepEqual(body.period, { from: "2025-01-01", to: "2025-12-31" });
  assert.deepEqual(body.filters, { from: "2025-01-01", to: "2025-12-31", regionId: null, communeId: null });
  assert.equal(body.meta.generatedAt, "2026-10-24T12:34:56.000Z");

  // Scope total = sum over ALL rows of the level (20293+52788+0 = 73081), not
  // the selection: XIII share = 20293/73081 → percent 27.8.
  assert.deepEqual(body.territories[0].totals, { accidents: 20293, fatalities: 350, share: 27.8 });

  // Trend months DENSE over the period in calendar order: the two populated
  // months came back sparse; the response carries all twelve.
  assert.equal(body.territories[0].trend.length, 12);
  assert.deepEqual(body.territories[0].trend[0], { month: "2025-01", accidents: 1600, fatalities: 30 });
  assert.deepEqual(body.territories[0].trend[1], { month: "2025-02", accidents: 0, fatalities: 0 });
  assert.deepEqual(body.territories[0].trend[11], { month: "2025-12", accidents: 1900, fatalities: 28 });
  const trendSum = body.territories[0].trend.reduce((sum, month) => sum + month.accidents, 0);
  assert.equal(trendSum, 3500, "only the fixture's two populated months carry accidents");
});

test("compare orders rows by request order and shares never renormalize to the selection", async (t) => {
  const { repository } = repositoryWith();
  const app = appWith(createCompareService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/compare?codes=XV,XIII", headers: auth });
  const body = response.json() as CompareResponse;
  assert.deepEqual(body.territories.map((row) => row.code), ["XV", "XIII"]);
  // Both shares divide by the SCOPE total 73,081 (which includes the zero row
  // `I`): selecting every populated territory is only 100 because the
  // selection happens to cover the scope — not because of renormalization.
  assert.equal(body.territories[0].totals.share, 72.2);
  assert.equal(body.territories[1].totals.share, 27.8);
});

test("compare answers zero totals and zero shares for a territory without accidents", async (t) => {
  const { repository } = repositoryWith({
    territories: [{ code: "I", name: "Región de Tarapacá", accidents: 0, fatalities: 0 }],
    trends: {},
  });
  const app = appWith(createCompareService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/compare?from=2025-01-01&to=2025-01-31&codes=I", headers: auth });
  assert.equal(response.statusCode, 200);
  const body = response.json() as CompareResponse;
  assert.deepEqual(body.territories[0].totals, { accidents: 0, fatalities: 0, share: 0 });
  assert.equal(body.territories[0].trend.length, 1);
  assert.deepEqual(body.territories[0].trend[0], { month: "2025-01", accidents: 0, fatalities: 0 });
});

test("compare at region scope selects only that region's communes", async (t) => {
  const { repository, state } = repositoryWith({
    territories: [
      { code: "XIII-1", name: "Cerrillos", accidents: 502, fatalities: 4 },
      { code: "XIII-32", name: "Puente Alto", accidents: 1662, fatalities: 8 },
    ],
    trends: { "XIII-32": [{ month: "2025-08", accidents: 100, fatalities: 1 }] },
  });
  const app = appWith(createCompareService(repository, NOW));
  t.after(() => app.close());

  const ok = await app.inject({ method: "GET", url: "/api/compare?regionId=13&codes=XIII-32,XIII-1", headers: auth });
  assert.equal(ok.statusCode, 200);
  const body = ok.json() as CompareResponse;
  assert.equal(body.level, "commune");
  assert.deepEqual(body.territories.map((row) => row.code), ["XIII-32", "XIII-1"]);
  // Scope total 502+1662=2164 → Puente Alto 1662/2164 → percent 76.8.
  assert.deepEqual(body.territories[0].totals, { accidents: 1662, fatalities: 8, share: 76.8 });
  assert.equal(body.territories[0].trend.length, 12);
  assert.deepEqual(state.lastFilters, { from: "2025-01-01", to: "2025-12-31", regionId: 13, communeId: null });

  const outside = await app.inject({ method: "GET", url: "/api/compare?regionId=13&codes=XV-1", headers: auth });
  assert.equal(outside.statusCode, 400);
  assert.deepEqual(outside.json().error.details, [{ field: "codes", reason: "out_of_scope" }]);
  assert.equal(state.totalsLoaded, 2, "the catalog read is the level check for every validated request");
});

test("compare bounds its payload: four codes with dense trends stay under 10 KB", async (t) => {
  const rows: CompareTerritoryAggregate[] = ["I", "II", "XIII", "XV"].map((code) => ({
    code,
    name: `Región de Prueba ${code} — ${code === "II" ? '"citada", con coma' : "normal"}`,
    accidents: 5000,
    fatalities: 100,
  }));
  const trends: Record<string, CompareTrendRow[]> = {};
  for (const code of ["I", "II", "XIII", "XV"]) {
    trends[code] = Array.from({ length: 12 }, (_unused, index) => ({
      month: `2025-${String(index + 1).padStart(2, "0")}`,
      accidents: 417,
      fatalities: 8,
    }));
  }
  const { repository } = repositoryWith({ territories: rows, trends });
  const app = appWith(createCompareService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/compare?codes=I,II,XIII,XV", headers: auth });
  assert.equal(response.statusCode, 200);
  assert.ok(Buffer.byteLength(response.body, "utf8") < 10 * 1024, `payload ${Buffer.byteLength(response.body)} bytes`);
});

test("compare hides aggregate failures behind the shared 500 body", async (t) => {
  const failing: CompareService = {
    async getCompare() {
      throw new Error("secret SQL details from db-neon.internal");
    },
  };
  const app = appWith(failing);
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/compare?codes=XIII", headers: auth });
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.json(), { error: { code: "INTERNAL", message: "compare query failed" } });
  assert.ok(!response.body.includes("SELECT"));
});

test("registering /api/compare keeps the sibling protected routes reachable", async (t) => {
  const app = appWith(createCompareService(repositoryWith().repository, NOW));
  t.after(() => app.close());

  const dashboard = await app.inject({ method: "GET", url: "/api/dashboard", headers: auth });
  assert.equal(dashboard.statusCode, 200);
  assert.deepEqual(dashboard.json(), { route: "dashboard" });

  const csv = await app.inject({ method: "GET", url: "/api/dashboard/export.csv", headers: auth });
  assert.equal(csv.statusCode, 200);

  const analysis = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  assert.equal(analysis.statusCode, 200);

  const meta = await app.inject({ method: "GET", url: "/api/meta", headers: auth });
  assert.equal(meta.statusCode, 200);

  const compare = await app.inject({ method: "GET", url: "/api/compare?codes=XIII", headers: auth });
  assert.equal(compare.statusCode, 200);
});

test("unknown region and commune IDs map to 400 not_found through the shared shape", async (t) => {
  const repository: CompareRepository = {
    async resolveTerritory(filters) {
      if (filters.communeId) throw new DashboardValidationError("communeId", "not_found", "communeId does not exist");
      throw new DashboardValidationError("regionId", "not_found", "regionId does not exist");
    },
    async loadTerritoryTotals() {
      throw new Error("aggregate must not run after territory resolution fails");
    },
    async loadTerritoryTrends() {
      throw new Error("trends must not run after territory resolution fails");
    },
  };
  const app = appWith(createCompareService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/compare?codes=XIII&regionId=14", headers: auth });
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json().error.details, [{ field: "regionId", reason: "not_found" }]);
});
