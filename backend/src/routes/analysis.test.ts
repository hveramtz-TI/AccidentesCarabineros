import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import { createAnalysisService } from "../services/analysis-service.js";
import type {
  AnalysisCauseCount,
  AnalysisPersonQualityOutcomeCount,
  AnalysisPersonSexAgeCount,
  AnalysisRepository,
  AnalysisVehicleSeverityCount,
} from "../services/analysis-service.js";
import type { ResolvedTerritory } from "../services/dashboard-service.js";
import { DashboardValidationError } from "../types/dashboard-api.js";
import type { DashboardFilters, DashboardResponse } from "../types/dashboard-api.js";
import type { AnalysisResponse, AnalysisService } from "../types/insights-api.js";
import type { MetaResponse } from "../types/meta-api.js";

const TOKEN = "analysis-test-token";
const auth = { authorization: `Bearer ${TOKEN}` };
const NOW = () => new Date("2026-10-23T12:34:56.000Z");

const NATIONAL: ResolvedTerritory = {
  scopeLabel: "National (2025)",
  territoryScope: "region",
  regionId: null,
  communeId: null,
};

/** Catalog-shaped fixture: every cause exists, including the zero-accident tail. */
function catalogRows(overrides: AnalysisCauseCount[] = []): AnalysisCauseCount[] {
  const byId = new Map(overrides.map((row) => [row.causeId, row]));
  return Array.from({ length: 70 }, (_, index) => {
    const causeId = index + 1;
    return byId.get(causeId) ?? { causeId, name: `CAUSA ${String(causeId).padStart(2, "0")}`, accidents: 0 };
  });
}

/** Vehicle-side fixture rows, mirroring what the SQL aggregates return per (type, severity). */
interface VehicleFixture {
  severityRows?: AnalysisVehicleSeverityCount[];
  withoutVehicleRows?: number;
}

/**
 * Person-side fixture rows: the two MECE crosstab cells the SQL aggregates
 * return (sex × age and role × outcome), both at person grain.
 */
interface PersonsFixture {
  sexAgeRows?: AnalysisPersonSexAgeCount[];
  qualityOutcomeRows?: AnalysisPersonQualityOutcomeCount[];
}

function repositoryWith(
  rows: AnalysisCauseCount[],
  territory: ResolvedTerritory = NATIONAL,
  vehicles: VehicleFixture = {},
  persons: PersonsFixture = {},
) {
  const state = {
    resolved: 0,
    loaded: 0,
    vehicleLoaded: 0,
    withoutLoaded: 0,
    sexAgeLoaded: 0,
    qualityLoaded: 0,
    lastFilters: null as DashboardFilters | null,
  };
  const repository: AnalysisRepository = {
    async resolveTerritory() {
      state.resolved += 1;
      return territory;
    },
    async loadCauseCounts(filters) {
      state.loaded += 1;
      state.lastFilters = filters;
      return rows;
    },
    async loadVehicleSeverityCounts() {
      state.vehicleLoaded += 1;
      return vehicles.severityRows ?? [];
    },
    async loadSiniestrosWithoutVehicleCount() {
      state.withoutLoaded += 1;
      return vehicles.withoutVehicleRows ?? 0;
    },
    async loadSexAgeCounts() {
      state.sexAgeLoaded += 1;
      return persons.sexAgeRows ?? [];
    },
    async loadQualityOutcomeCounts() {
      state.qualityLoaded += 1;
      return persons.qualityOutcomeRows ?? [];
    },
  };
  return { repository, state };
}

function analysisResponse(): AnalysisResponse {
  return {
    schemaVersion: 1,
    meta: { generatedAt: "2026-10-23T12:34:56.000Z" },
    filters: { from: "2025-01-01", to: "2025-12-31", regionId: null, communeId: null },
    causes: {
      totalAccidents: 0,
      rows: [],
    },
    vehicles: {
      totalSiniestros: 0,
      withoutVehicleRows: 0,
      byType: [],
      byTypeSeverity: [],
    },
    persons: {
      rows: 0,
      unknownAge: 0,
      unknownSex: 0,
      bySex: [],
      byAge: [
        { bucket: "0-17", persons: 0, share: 0 },
        { bucket: "18-25", persons: 0, share: 0 },
        { bucket: "26-40", persons: 0, share: 0 },
        { bucket: "41-64", persons: 0, share: 0 },
        { bucket: "65+", persons: 0, share: 0 },
        { bucket: "unknown", persons: 0, share: 0 },
      ],
      bySexAge: [],
      byQualityOutcome: [],
    },
  };
}

function trackingService(): AnalysisService & { calls: number; seen: DashboardFilters[] } {
  const service = {
    calls: 0,
    seen: [] as DashboardFilters[],
    async getAnalysis(filters: DashboardFilters) {
      service.calls += 1;
      service.seen.push(filters);
      return analysisResponse();
    },
  };
  return service;
}

function appWith(service: AnalysisService, overrides: Parameters<typeof buildApp>[0] = {}) {
  return buildApp({ logger: false, authToken: TOKEN, analysisService: service, ...overrides });
}

test("GET /api/analysis rejects missing and invalid bearers before the service runs", async (t) => {
  const service = trackingService();
  const app = appWith(service);
  t.after(() => app.close());

  const missing = await app.inject({ method: "GET", url: "/api/analysis" });
  assert.equal(missing.statusCode, 401);
  assert.deepEqual(missing.json(), {
    error: { code: "UNAUTHORIZED", message: "missing or invalid bearer token" },
  });
  assert.equal(missing.headers["cache-control"], "no-store");

  const invalid = await app.inject({
    method: "GET",
    url: "/api/analysis",
    headers: { authorization: "Bearer wrong-token" },
  });
  assert.equal(invalid.statusCode, 401);
  assert.equal(invalid.headers["cache-control"], "no-store");

  const wrongScheme = await app.inject({
    method: "GET",
    url: "/api/analysis",
    headers: { authorization: `Basic ${TOKEN}` },
  });
  assert.equal(wrongScheme.statusCode, 401);
  assert.equal(service.calls, 0, "the service must not run for a rejected request");
});

test("GET /api/analysis fails closed when UUID_CONNECTION is unset", async (t) => {
  const service = trackingService();
  const app = appWith(service, { authToken: null });
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.json(), {
    error: { code: "AUTH_NOT_CONFIGURED", message: "UUID_CONNECTION is not set on the backend" },
  });
  assert.equal(service.calls, 0);
});

test("GET /api/analysis applies the default filters and the private cache policy", async (t) => {
  const { repository, state } = repositoryWith(catalogRows([{ causeId: 2, name: "CAUSA B", accidents: 3 }]));
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis?unknown=ignored", headers: auth });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["cache-control"], "private, max-age=60");
  assert.deepEqual(state.lastFilters, {
    from: "2025-01-01",
    to: "2025-12-31",
    regionId: null,
    communeId: null,
  });

  const body = response.json() as AnalysisResponse;
  assert.equal(body.schemaVersion, 1);
  assert.equal(body.meta.generatedAt, "2026-10-23T12:34:56.000Z");
  assert.deepEqual(body.filters, { from: "2025-01-01", to: "2025-12-31", regionId: null, communeId: null });
});

test("GET /api/analysis rejects malformed filters with the dashboard contract", async (t) => {
  const service = trackingService();
  const app = appWith(service);
  t.after(() => app.close());

  for (const query of ["from=2025-2-01", "regionId=17", "communeId=not-a-commune"]) {
    const response = await app.inject({ method: "GET", url: `/api/analysis?${query}`, headers: auth });
    assert.equal(response.statusCode, 400, query);
    assert.equal(response.headers["cache-control"], "no-store", query);
    assert.equal(response.json().error.code, "VALIDATION_ERROR", query);
    assert.ok(response.json().error.details.length > 0, query);
  }
  assert.equal(service.calls, 0, "schema rejections happen before the service");
});

test("GET /api/analysis rejects out-of-2025 dates and inverted ranges", async (t) => {
  const { repository, state } = repositoryWith(catalogRows());
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const cases = [
    { query: "from=2024-12-31", field: "from", reason: "out_of_range" },
    { query: "to=2026-01-01", field: "to", reason: "out_of_range" },
    { query: "from=2025-04-01&to=2025-03-31", field: "from", reason: "after_to" },
  ];

  for (const { query, field, reason } of cases) {
    const response = await app.inject({ method: "GET", url: `/api/analysis?${query}`, headers: auth });
    assert.equal(response.statusCode, 400, query);
    assert.equal(response.json().error.code, "VALIDATION_ERROR", query);
    assert.deepEqual(response.json().error.details[0], { field, reason }, query);
  }

  assert.equal(state.resolved, 0, "validation runs before territory resolution");
  assert.equal(state.loaded, 0, "validation runs before the aggregate query");
});

test("GET /api/analysis maps unknown region and commune IDs to 400 not_found", async (t) => {
  const repository: AnalysisRepository = {
    async resolveTerritory(filters) {
      if (filters.communeId) {
        throw new DashboardValidationError("communeId", "not_found", "communeId does not exist");
      }
      throw new DashboardValidationError("regionId", "not_found", "regionId does not exist");
    },
    async loadCauseCounts() {
      throw new Error("aggregate must not run after territory resolution fails");
    },
    async loadVehicleSeverityCounts() {
      throw new Error("vehicle aggregate must not run after territory resolution fails");
    },
    async loadSiniestrosWithoutVehicleCount() {
      throw new Error("coverage aggregate must not run after territory resolution fails");
    },
    async loadSexAgeCounts() {
      throw new Error("sex × age aggregate must not run after territory resolution fails");
    },
    async loadQualityOutcomeCounts() {
      throw new Error("role × outcome aggregate must not run after territory resolution fails");
    },
  };
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const region = await app.inject({ method: "GET", url: "/api/analysis?regionId=13", headers: auth });
  assert.equal(region.statusCode, 400);
  assert.deepEqual(region.json().error.details[0], { field: "regionId", reason: "not_found" });

  const commune = await app.inject({ method: "GET", url: "/api/analysis?communeId=XIII-1", headers: auth });
  assert.equal(commune.statusCode, 400);
  assert.deepEqual(commune.json().error.details[0], { field: "communeId", reason: "not_found" });
});

test("returns every catalog cause once, ordered, and reconciled with the total", async (t) => {
  const rows = catalogRows([
    { causeId: 2, name: "CAUSA B", accidents: 40 },
    { causeId: 1, name: "CAUSA A", accidents: 40 },
    { causeId: 3, name: "CAUSA C", accidents: 5 },
  ]);
  const { repository } = repositoryWith(rows);
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  assert.equal(response.statusCode, 200);
  assert.equal(body.causes.rows.length, 70);
  assert.deepEqual(body.causes.rows.slice(0, 3).map((row) => row.causeId), [1, 2, 3]);
  assert.equal(body.causes.totalAccidents, 85);
  assert.equal(
    body.causes.rows.reduce((sum, row) => sum + row.accidents, 0),
    body.causes.totalAccidents,
  );

  const zero = body.causes.rows.find((row) => row.causeId === 4);
  assert.ok(zero, "zero-accident catalog causes stay in the response");
  assert.deepEqual(zero, { causeId: 4, name: "CAUSA 04", accidents: 0, share: 0 });
});

test("empty scopes return zero totals and zero-valued catalog rows", async (t) => {
  const { repository } = repositoryWith(catalogRows());
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  assert.equal(body.causes.totalAccidents, 0);
  assert.equal(body.causes.rows.length, 70);
  assert.ok(body.causes.rows.every((row) => row.accidents === 0 && row.share === 0));
});

test("shares are rounded to one decimal and the running order drives the API ranking", async (t) => {
  const rows = catalogRows([
    { causeId: 10, name: "CAUSA X", accidents: 2 },
    { causeId: 20, name: "CAUSA Y", accidents: 1 },
  ]);
  const { repository } = repositoryWith(rows);
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  assert.deepEqual(body.causes.rows.slice(0, 2), [
    { causeId: 10, name: "CAUSA X", accidents: 2, share: 66.7 },
    { causeId: 20, name: "CAUSA Y", accidents: 1, share: 33.3 },
  ]);
});

test("a commune scope derives its region into the response filters", async (t) => {
  const commune: ResolvedTerritory = {
    scopeLabel: "Santiago",
    territoryScope: "commune",
    regionId: 13,
    communeId: "XIII-1",
  };
  const { repository } = repositoryWith(catalogRows(), commune);
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({
    method: "GET",
    url: "/api/analysis?regionId=8&communeId=XIII-1",
    headers: auth,
  });
  const body = response.json() as AnalysisResponse;

  assert.deepEqual(body.filters, {
    from: "2025-01-01",
    to: "2025-12-31",
    regionId: 13,
    communeId: "XIII-1",
  });
});

test("the full 70-cause payload stays under the 100 KB cap", async (t) => {
  const rows = catalogRows().map((row) => ({
    ...row,
    name: `${row.name} CONDUCTOR NO ATENTO A LAS CONDICIONES DEL TRANSITO AL MOMENTO`,
  }));
  const { repository } = repositoryWith(rows);
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });

  assert.equal(response.statusCode, 200);
  assert.ok(Buffer.byteLength(response.body, "utf8") < 100 * 1024);
});

test("registering /api/analysis keeps the sibling protected routes reachable", async (t) => {
  const app = buildApp({
    logger: false,
    authToken: TOKEN,
    analysisService: trackingService(),
    dashboardService: { async getDashboard() { return { route: "dashboard" } as unknown as DashboardResponse; } },
    metaService: { async getMeta() { return { route: "meta" } as unknown as MetaResponse; } },
  });
  t.after(() => app.close());

  const dashboard = await app.inject({ method: "GET", url: "/api/dashboard", headers: auth });
  assert.equal(dashboard.statusCode, 200);
  assert.deepEqual(dashboard.json(), { route: "dashboard" });

  const meta = await app.inject({ method: "GET", url: "/api/meta", headers: auth });
  assert.equal(meta.statusCode, 200);
  assert.deepEqual(meta.json(), { route: "meta" });
});

test("GET /api/analysis sanitizes service failures without database details", async (t) => {
  const failing: AnalysisService = {
    async getAnalysis() {
      throw new Error("secret SQL details from db-neon.internal");
    },
  };
  const app = appWith(failing);
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });

  assert.equal(response.statusCode, 500);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.deepEqual(response.json(), { error: { code: "INTERNAL", message: "analysis query failed" } });
  assert.equal(response.body.includes("secret"), false);
  assert.equal(response.body.includes("db-neon"), false);
});

test("auth rejection precedes filter validation", async (t) => {
  const service = trackingService();
  const app = appWith(service);
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis?from=2024-12-31" });

  assert.equal(response.statusCode, 401);
  assert.equal(service.calls, 0, "an unauthenticated request must not reach validation or the service");
});

test("ties sort by name and zero-accident causes keep share 0", async (t) => {
  const rows = catalogRows([
    { causeId: 2, name: "B", accidents: 7 },
    { causeId: 1, name: "A", accidents: 7 },
  ]);
  const app = appWith(createAnalysisService(repositoryWith(rows).repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  assert.equal(response.statusCode, 200);
  assert.equal(body.causes.rows.length, 70);
  assert.deepEqual(body.causes.rows.slice(0, 2), [
    { causeId: 1, name: "A", accidents: 7, share: 50 },
    { causeId: 2, name: "B", accidents: 7, share: 50 },
  ]);
  assert.ok(
    body.causes.rows.slice(2).every((row) => row.accidents === 0 && row.share === 0),
    "the zero-accident catalog tail must stay present with share 0",
  );
});

// ---------------------------------------------------------------------------
// EXP-04 — vehicles section. `causes` must stay byte-for-byte additive.
// ---------------------------------------------------------------------------

const VEHICLE_MATRIX: AnalysisVehicleSeverityCount[] = [
  { typeId: 12, name: "AUTOMOVIL", severity: "fatal", siniestros: 3 },
  { typeId: 12, name: "AUTOMOVIL", severity: "serious", siniestros: 2 },
  { typeId: 12, name: "AUTOMOVIL", severity: "minor", siniestros: 1 },
  { typeId: 12, name: "AUTOMOVIL", severity: "onlyIlesos", siniestros: 59 },
  { typeId: 20, name: "MOTOCICLETA", severity: "onlyIlesos", siniestros: 25 },
];

test("vehicles is additive: causes keeps its exact shape and values", async (t) => {
  const rows = catalogRows([
    { causeId: 2, name: "CAUSA B", accidents: 40 },
    { causeId: 1, name: "CAUSA A", accidents: 40 },
    { causeId: 3, name: "CAUSA C", accidents: 5 },
  ]);
  const { repository } = repositoryWith(rows, NATIONAL, {
    severityRows: VEHICLE_MATRIX,
    withoutVehicleRows: 2,
  }, {
    sexAgeRows: [{ sexId: 1, name: "MASCULINO", bucket: "26-40", persons: 10 }],
    qualityOutcomeRows: [{ qualityId: 1, qualityName: "CONDUCTOR", outcomeId: 2, outcomeName: "ILESO", persons: 10 }],
  });
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  assert.equal(response.statusCode, 200);
  // The envelope gains `persons` additively (EXP-05); nothing else changes.
  assert.deepEqual(Object.keys(body).sort(), [
    "causes",
    "filters",
    "meta",
    "persons",
    "schemaVersion",
    "vehicles",
  ]);
  assert.equal(body.schemaVersion, 1);
  assert.equal(body.meta.generatedAt, "2026-10-23T12:34:56.000Z");
  assert.deepEqual(body.filters, { from: "2025-01-01", to: "2025-12-31", regionId: null, communeId: null });
  assert.equal(body.causes.totalAccidents, 85);
  assert.equal(body.causes.rows.length, 70);
  assert.deepEqual(body.causes.rows.slice(0, 3).map((row) => row.causeId), [1, 2, 3]);
  assert.deepEqual(body.causes.rows.find((row) => row.causeId === 4), {
    causeId: 4,
    name: "CAUSA 04",
    accidents: 0,
    share: 0,
  });

  // The vehicles section is present and its own invariants hold.
  assert.equal(body.vehicles.totalSiniestros, body.causes.totalAccidents);
  assert.equal(body.vehicles.withoutVehicleRows, 2);
  assert.deepEqual(body.vehicles.byType, [
    { typeId: 12, name: "AUTOMOVIL", siniestros: 65, share: 76.5 },
    { typeId: 20, name: "MOTOCICLETA", siniestros: 25, share: 29.4 },
  ]);
  assert.deepEqual(body.vehicles.byTypeSeverity, VEHICLE_MATRIX);

  // The persons section is present with its own denominator (10 persons, NOT
  // the 85 siniestros): cause and vehicle values above are untouched by it.
  assert.equal(body.persons.rows, 10);
  assert.deepEqual(body.persons.bySex, [{ sexId: 1, name: "MASCULINO", persons: 10, share: 100 }]);
});

test("one siniestro under two types counts once per type and breaks additivity", async (t) => {
  const rows = catalogRows([{ causeId: 1, name: "CAUSA A", accidents: 1 }]);
  // The scope's single siniestro has vehicle rows in two different types; the
  // SQL aggregates deduplicate per type, so each type reports exactly 1.
  const { repository } = repositoryWith(rows, NATIONAL, {
    severityRows: [
      { typeId: 12, name: "AUTOMOVIL", severity: "fatal", siniestros: 1 },
      { typeId: 20, name: "MOTOCICLETA", severity: "fatal", siniestros: 1 },
    ],
    withoutVehicleRows: 0,
  });
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  assert.equal(body.vehicles.totalSiniestros, 1);
  assert.deepEqual(body.vehicles.byType, [
    { typeId: 12, name: "AUTOMOVIL", siniestros: 1, share: 100 },
    { typeId: 20, name: "MOTOCICLETA", siniestros: 1, share: 100 },
  ]);
  // Documented non-additivity: rows sum above the total and shares above 100.
  assert.ok(
    body.vehicles.byType.reduce((sum, row) => sum + row.siniestros, 0) >= body.vehicles.totalSiniestros,
  );
  assert.ok(body.vehicles.byType.reduce((sum, row) => sum + row.share, 0) > 100);
  // No grand-total or cumulative field may invite the additive misreading.
  assert.equal(Object.keys(body.vehicles).sort().join(","), "byType,byTypeSeverity,totalSiniestros,withoutVehicleRows");
});

test("vehicle shares divide by totalSiniestros and round to one decimal", async (t) => {
  const rows = catalogRows([{ causeId: 1, name: "CAUSA A", accidents: 20000 }]);
  const { repository } = repositoryWith(rows, NATIONAL, {
    severityRows: [
      // 14010/20000 = 70.05 % must render as 70.1 (the causes rounding rule).
      { typeId: 12, name: "AUTOMOVIL", severity: "onlyIlesos", siniestros: 14010 },
      { typeId: 20, name: "MOTOCICLETA", severity: "fatal", siniestros: 6665 },
    ],
    withoutVehicleRows: 0,
  });
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  // Denominator is the scope total (20000), NOT the sum of type rows (20675):
  // 14010/20000 -> 70.1 (vs 67.8 under the wrong denominator).
  assert.deepEqual(body.vehicles.byType, [
    { typeId: 12, name: "AUTOMOVIL", siniestros: 14010, share: 70.1 },
    { typeId: 20, name: "MOTOCICLETA", siniestros: 6665, share: 33.3 },
  ]);
});

test("the severity matrix reconciles per type and exposes unknown only when fed", async (t) => {
  const rows = catalogRows([{ causeId: 1, name: "CAUSA A", accidents: 13 }]);
  const { repository } = repositoryWith(rows, NATIONAL, {
    severityRows: [
      { typeId: 12, name: "AUTOMOVIL", severity: "fatal", siniestros: 1 },
      { typeId: 12, name: "AUTOMOVIL", severity: "serious", siniestros: 2 },
      { typeId: 12, name: "AUTOMOVIL", severity: "minor", siniestros: 3 },
      { typeId: 12, name: "AUTOMOVIL", severity: "onlyIlesos", siniestros: 4 },
      { typeId: 20, name: "MOTOCICLETA", severity: "fatal", siniestros: 1 },
      { typeId: 20, name: "MOTOCICLETA", severity: "unknown", siniestros: 2 },
    ],
    withoutVehicleRows: 0,
  });
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  // Row sum per type reconciles exactly with that type's byType.siniestros.
  for (const typeRow of body.vehicles.byType) {
    const matrixSum = body.vehicles.byTypeSeverity
      .filter((row) => row.typeId === typeRow.typeId)
      .reduce((sum, row) => sum + row.siniestros, 0);
    assert.equal(matrixSum, typeRow.siniestros, `type ${typeRow.typeId} must reconcile`);
  }
  assert.deepEqual(
    body.vehicles.byType.map((row) => ({ typeId: row.typeId, siniestros: row.siniestros })),
    [
      { typeId: 12, siniestros: 10 },
      { typeId: 20, siniestros: 3 },
    ],
  );
  // The unknown bucket exists only where the data fed it.
  assert.deepEqual(
    body.vehicles.byTypeSeverity
      .filter((row) => row.severity === "unknown")
      .map((row) => row.typeId),
    [20],
  );
  // Bucket keys stay inside the approved vocabulary.
  const approved = new Set(["fatal", "serious", "minor", "onlyIlesos", "unknown"]);
  assert.ok(body.vehicles.byTypeSeverity.every((row) => approved.has(row.severity)));
});

test("withoutVehicleRows surfaces the repository value and never becomes a type", async (t) => {
  const rows = catalogRows([{ causeId: 1, name: "CAUSA A", accidents: 5 }]);
  const { repository } = repositoryWith(rows, NATIONAL, {
    severityRows: [{ typeId: 12, name: "AUTOMOVIL", severity: "fatal", siniestros: 5 }],
    withoutVehicleRows: 3,
  });
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  assert.equal(body.vehicles.withoutVehicleRows, 3);
  assert.deepEqual(body.vehicles.byType, [
    { typeId: 12, name: "AUTOMOVIL", siniestros: 5, share: 100 },
  ]);
});

test("an empty scope returns a present vehicles section with empty lists and zeros", async (t) => {
  const { repository } = repositoryWith(catalogRows());
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  assert.equal(response.statusCode, 200);
  assert.deepEqual(body.vehicles, {
    totalSiniestros: 0,
    withoutVehicleRows: 0,
    byType: [],
    byTypeSeverity: [],
  });
});

test("the full 38-type × 5-bucket matrix stays under the 100 KB cap", async (t) => {
  const severities = ["fatal", "serious", "minor", "onlyIlesos", "unknown"] as const;
  const severityRows: AnalysisVehicleSeverityCount[] = [];
  for (let typeId = 1; typeId <= 38; typeId += 1) {
    for (const [index, severity] of severities.entries()) {
      severityRows.push({
        typeId,
        name: `VEHICULO DE PRUEBA ${String(typeId).padStart(2, "0")} CON NOMBRE LARGO`,
        severity,
        siniestros: 1_000 + typeId * 10 + index,
      });
    }
  }
  const { repository } = repositoryWith(catalogRows([{ causeId: 1, name: "CAUSA A", accidents: 20000 }]), NATIONAL, {
    severityRows,
    withoutVehicleRows: 2,
  });
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });

  assert.equal(response.statusCode, 200);
  const body = response.json() as AnalysisResponse;
  assert.equal(body.vehicles.byType.length, 38);
  assert.equal(body.vehicles.byTypeSeverity.length, 190);
  assert.ok(Buffer.byteLength(response.body, "utf8") < 100 * 1024);
});

test("the matrix is re-ordered canonically even when the repository returns shuffled cells", async (t) => {
  const { repository } = repositoryWith(catalogRows([{ causeId: 1, name: "CAUSA A", accidents: 90 }]), NATIONAL, {
    severityRows: [
      { typeId: 20, name: "MOTOCICLETA", severity: "onlyIlesos", siniestros: 25 },
      { typeId: 12, name: "AUTOMOVIL", severity: "minor", siniestros: 1 },
      { typeId: 12, name: "AUTOMOVIL", severity: "fatal", siniestros: 3 },
      { typeId: 12, name: "AUTOMOVIL", severity: "onlyIlesos", siniestros: 59 },
      { typeId: 12, name: "AUTOMOVIL", severity: "serious", siniestros: 2 },
      { typeId: 20, name: "MOTOCICLETA", severity: "unknown", siniestros: 0 },
    ],
    withoutVehicleRows: 0,
  });
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  // byType: siniestros DESC (AUTOMOVIL 65 > MOTOCICLETA 25) — the zero-sum
  // unknown cell is dropped and never becomes a type row.
  assert.deepEqual(body.vehicles.byType, [
    { typeId: 12, name: "AUTOMOVIL", siniestros: 65, share: 72.2 },
    { typeId: 20, name: "MOTOCICLETA", siniestros: 25, share: 27.8 },
  ]);
  // Matrix order: byType rank first, then fatal→serious→minor→onlyIlesos→unknown.
  assert.deepEqual(body.vehicles.byTypeSeverity, [
    { typeId: 12, name: "AUTOMOVIL", severity: "fatal", siniestros: 3 },
    { typeId: 12, name: "AUTOMOVIL", severity: "serious", siniestros: 2 },
    { typeId: 12, name: "AUTOMOVIL", severity: "minor", siniestros: 1 },
    { typeId: 12, name: "AUTOMOVIL", severity: "onlyIlesos", siniestros: 59 },
    { typeId: 20, name: "MOTOCICLETA", severity: "onlyIlesos", siniestros: 25 },
  ]);
});

// ---------------------------------------------------------------------------
// EXP-05 — persons section. Person grain (COUNT(*) over persona rows); the
// sex × age and role × outcome matrices are MECE partitions of the same
// person set, so every marginal reconciles exactly with `rows`. `causes` and
// `vehicles` must stay byte-identical.
// ---------------------------------------------------------------------------

/** Fixture cells deliberately shuffled: the service must re-order them. */
const SEX_AGE_CELLS: AnalysisPersonSexAgeCount[] = [
  { sexId: 3, name: "SE IGNORA", bucket: "unknown", persons: 20 },
  { sexId: 1, name: "MASCULINO", bucket: "18-25", persons: 200 },
  { sexId: 2, name: "FEMENINO", bucket: "26-40", persons: 120 },
  { sexId: 1, name: "MASCULINO", bucket: "unknown", persons: 50 },
  { sexId: 3, name: "SE IGNORA", bucket: "41-64", persons: 10 },
  { sexId: 1, name: "MASCULINO", bucket: "0-17", persons: 100 },
];

const QUALITY_OUTCOME_CELLS: AnalysisPersonQualityOutcomeCount[] = [
  { qualityId: 3, qualityName: "PASAJERO", outcomeId: 5, outcomeName: "GRAVE", persons: 20 },
  { qualityId: 1, qualityName: "CONDUCTOR", outcomeId: 2, outcomeName: "ILESO", persons: 300 },
  { qualityId: 4, qualityName: "PEATON", outcomeId: 3, outcomeName: "MENOS GRAVE", persons: 20 },
  { qualityId: 2, qualityName: "SE DA A LA FUGA", outcomeId: 4, outcomeName: "FALLECIDO", persons: 20 },
  { qualityId: 1, qualityName: "CONDUCTOR", outcomeId: 1, outcomeName: "LEVE", persons: 120 },
  { qualityId: 3, qualityName: "PASAJERO", outcomeId: 2, outcomeName: "ILESO", persons: 20 },
];

function personsApp() {
  const { repository } = repositoryWith(
    catalogRows([{ causeId: 1, name: "CAUSA A", accidents: 250 }]),
    NATIONAL,
    {},
    { sexAgeRows: SEX_AGE_CELLS, qualityOutcomeRows: QUALITY_OUTCOME_CELLS },
  );
  return appWith(createAnalysisService(repository, NOW));
}

test("both person matrices and both marginals reconcile exactly to rows", async (t) => {
  const app = personsApp();
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  assert.equal(response.statusCode, 200);
  assert.equal(body.persons.rows, 500);

  // Every MECE view sums to the same rows count.
  const sumOf = (values: number[]) => values.reduce((sum, value) => sum + value, 0);
  assert.equal(sumOf(body.persons.bySexAge.map((row) => row.persons)), body.persons.rows);
  assert.equal(sumOf(body.persons.byQualityOutcome.map((row) => row.persons)), body.persons.rows);
  assert.equal(sumOf(body.persons.bySex.map((row) => row.persons)), body.persons.rows);
  assert.equal(sumOf(body.persons.byAge.map((row) => row.persons)), body.persons.rows);

  // Marginals are exact (NOT NULL sexo + exhaustive age CASE ⇒ structural equality).
  assert.deepEqual(body.persons.bySex, [
    { sexId: 1, name: "MASCULINO", persons: 350, share: 70 },
    { sexId: 2, name: "FEMENINO", persons: 120, share: 24 },
    { sexId: 3, name: "SE IGNORA", persons: 30, share: 6 },
  ]);
  assert.deepEqual(body.persons.byAge, [
    { bucket: "0-17", persons: 100, share: 20 },
    { bucket: "18-25", persons: 200, share: 40 },
    { bucket: "26-40", persons: 120, share: 24 },
    { bucket: "41-64", persons: 10, share: 2 },
    { bucket: "65+", persons: 0, share: 0 },
    { bucket: "unknown", persons: 70, share: 14 },
  ]);

  // unknownAge / unknownSex equal their marginals, never a re-derivation.
  assert.equal(body.persons.unknownAge, body.persons.byAge.find((row) => row.bucket === "unknown")?.persons);
  assert.equal(body.persons.unknownAge, 70);
  assert.equal(body.persons.unknownSex, body.persons.bySex.find((row) => row.sexId === 3)?.persons);
  assert.equal(body.persons.unknownSex, 30);

  // Shares divide by persons.rows (500), NOT by causes.totalAccidents (250):
  // 350/500 = 70 %; a siniestro denominator would have produced 140.
  assert.equal(body.causes.totalAccidents, 250);
  assert.equal(body.persons.bySex[0].share, 70);
});

test("person grain: two personas of one siniestro count as two persons", async (t) => {
  // One siniestro carrying two person rows (same sex, same band). The SQL
  // aggregates COUNT(*) over persona, so the repository seam reports 2.
  const { repository } = repositoryWith(
    catalogRows([{ causeId: 1, name: "CAUSA A", accidents: 1 }]),
    NATIONAL,
    {},
    {
      sexAgeRows: [{ sexId: 1, name: "MASCULINO", bucket: "18-25", persons: 2 }],
      qualityOutcomeRows: [
        { qualityId: 1, qualityName: "CONDUCTOR", outcomeId: 2, outcomeName: "ILESO", persons: 1 },
        { qualityId: 3, qualityName: "PASAJERO", outcomeId: 1, outcomeName: "LEVE", persons: 1 },
      ],
    },
  );
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  assert.equal(body.causes.totalAccidents, 1);
  assert.equal(body.vehicles.totalSiniestros, 1);
  // Person grain is its own count and its own denominator.
  assert.equal(body.persons.rows, 2);
  assert.deepEqual(body.persons.byAge.find((row) => row.bucket === "18-25"), {
    bucket: "18-25",
    persons: 2,
    share: 100,
  });
});

test("byAge always carries the six bands and zero-valued matrix cells never surface", async (t) => {
  const { repository } = repositoryWith(
    catalogRows([{ causeId: 1, name: "CAUSA A", accidents: 4 }]),
    NATIONAL,
    {},
    {
      sexAgeRows: [
        { sexId: 1, name: "MASCULINO", bucket: "0-17", persons: 5 },
        // Pinned rule: the repository contract returns only populated groups
        // (GROUP BY), but a defensive zero cell must never reach the response.
        { sexId: 1, name: "MASCULINO", bucket: "65+", persons: 0 },
        { sexId: 2, name: "FEMENINO", bucket: "unknown", persons: 2 },
      ],
      qualityOutcomeRows: [
        { qualityId: 1, qualityName: "CONDUCTOR", outcomeId: 1, outcomeName: "LEVE", persons: 7 },
        { qualityId: 2, qualityName: "SE DA A LA FUGA", outcomeId: 4, outcomeName: "FALLECIDO", persons: 0 },
      ],
    },
  );
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  assert.equal(body.persons.rows, 7);
  // All six bands are dense — including the zero-valued ones.
  assert.deepEqual(
    body.persons.byAge.map((row) => row.bucket),
    ["0-17", "18-25", "26-40", "41-64", "65+", "unknown"],
  );
  assert.deepEqual(body.persons.byAge.find((row) => row.bucket === "65+"), {
    bucket: "65+",
    persons: 0,
    share: 0,
  });
  // The sex × age and role × outcome matrices only ever carry populated cells.
  assert.deepEqual(body.persons.bySexAge, [
    { sexId: 1, name: "MASCULINO", bucket: "0-17", persons: 5 },
    { sexId: 2, name: "FEMENINO", bucket: "unknown", persons: 2 },
  ]);
  assert.deepEqual(body.persons.byQualityOutcome, [
    { qualityId: 1, qualityName: "CONDUCTOR", outcomeId: 1, outcomeName: "LEVE", persons: 7 },
  ]);
});

test("person cells come out canonical even when the repository returns them shuffled", async (t) => {
  const app = personsApp();
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  // bySexAge: sexId ASC, then the AGE_BANDS order inside each sex.
  assert.deepEqual(body.persons.bySexAge, [
    { sexId: 1, name: "MASCULINO", bucket: "0-17", persons: 100 },
    { sexId: 1, name: "MASCULINO", bucket: "18-25", persons: 200 },
    { sexId: 1, name: "MASCULINO", bucket: "unknown", persons: 50 },
    { sexId: 2, name: "FEMENINO", bucket: "26-40", persons: 120 },
    { sexId: 3, name: "SE IGNORA", bucket: "41-64", persons: 10 },
    { sexId: 3, name: "SE IGNORA", bucket: "unknown", persons: 20 },
  ]);

  // byQualityOutcome: persons DESC, then qualityId ASC, then outcomeId ASC.
  // The 20-way tie pins both id tiebreakers: (2,4) < (3,2) < (3,5) < (4,3).
  assert.deepEqual(body.persons.byQualityOutcome, [
    { qualityId: 1, qualityName: "CONDUCTOR", outcomeId: 2, outcomeName: "ILESO", persons: 300 },
    { qualityId: 1, qualityName: "CONDUCTOR", outcomeId: 1, outcomeName: "LEVE", persons: 120 },
    { qualityId: 2, qualityName: "SE DA A LA FUGA", outcomeId: 4, outcomeName: "FALLECIDO", persons: 20 },
    { qualityId: 3, qualityName: "PASAJERO", outcomeId: 2, outcomeName: "ILESO", persons: 20 },
    { qualityId: 3, qualityName: "PASAJERO", outcomeId: 5, outcomeName: "GRAVE", persons: 20 },
    { qualityId: 4, qualityName: "PEATON", outcomeId: 3, outcomeName: "MENOS GRAVE", persons: 20 },
  ]);
});

test("an empty scope returns a present persons section with zeros and no division by zero", async (t) => {
  const { repository } = repositoryWith(catalogRows());
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });
  const body = response.json() as AnalysisResponse;

  assert.equal(response.statusCode, 200);
  assert.deepEqual(body.persons, {
    rows: 0,
    unknownAge: 0,
    unknownSex: 0,
    bySex: [],
    byAge: [
      { bucket: "0-17", persons: 0, share: 0 },
      { bucket: "18-25", persons: 0, share: 0 },
      { bucket: "26-40", persons: 0, share: 0 },
      { bucket: "41-64", persons: 0, share: 0 },
      { bucket: "65+", persons: 0, share: 0 },
      { bucket: "unknown", persons: 0, share: 0 },
    ],
    bySexAge: [],
    byQualityOutcome: [],
  });
});

test("the full 3×6 + 4×5 person matrices stay under the 100 KB cap", async (t) => {
  const bands = ["0-17", "18-25", "26-40", "41-64", "65+", "unknown"] as const;
  const sexes = [
    { sexId: 1, name: "MASCULINO" },
    { sexId: 2, name: "FEMENINO" },
    { sexId: 3, name: "SE IGNORA" },
  ];
  const qualities = [
    { qualityId: 1, qualityName: "CONDUCTOR" },
    { qualityId: 2, qualityName: "SE DA A LA FUGA" },
    { qualityId: 3, qualityName: "PASAJERO" },
    { qualityId: 4, qualityName: "PEATON" },
  ];
  const outcomes = [
    { outcomeId: 1, outcomeName: "LEVE" },
    { outcomeId: 2, outcomeName: "ILESO" },
    { outcomeId: 3, outcomeName: "MENOS GRAVE" },
    { outcomeId: 4, outcomeName: "FALLECIDO" },
    { outcomeId: 5, outcomeName: "GRAVE" },
  ];
  const sexAgeRows: AnalysisPersonSexAgeCount[] = [];
  for (const sex of sexes) {
    for (const [bandIndex, bucket] of bands.entries()) {
      sexAgeRows.push({ ...sex, bucket, persons: 10_000 + bandIndex });
    }
  }
  const qualityOutcomeRows: AnalysisPersonQualityOutcomeCount[] = [];
  for (const [qualityIndex, quality] of qualities.entries()) {
    for (const [outcomeIndex, outcome] of outcomes.entries()) {
      qualityOutcomeRows.push({
        ...quality,
        ...outcome,
        persons: 5_000 + qualityIndex * 100 + outcomeIndex,
      });
    }
  }
  const { repository } = repositoryWith(catalogRows([{ causeId: 1, name: "CAUSA A", accidents: 20000 }]), NATIONAL, {}, {
    sexAgeRows,
    qualityOutcomeRows,
  });
  const app = appWith(createAnalysisService(repository, NOW));
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/analysis", headers: auth });

  assert.equal(response.statusCode, 200);
  const body = response.json() as AnalysisResponse;
  assert.equal(body.persons.bySex.length, 3);
  assert.equal(body.persons.byAge.length, 6);
  assert.equal(body.persons.bySexAge.length, 18);
  assert.equal(body.persons.byQualityOutcome.length, 20);
  assert.ok(Buffer.byteLength(response.body, "utf8") < 100 * 1024);
});

