import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import type { DashboardFilters, DashboardService, TerritoryReport } from "../types/dashboard-api.js";

const TOKEN = "export-test-token";
const auth = { authorization: `Bearer ${TOKEN}` };
const BOM = "\uFEFF";

const HEADER_ROW = "nivel,codigo_region,region,codigo_comuna,comuna,siniestros,fallecidos,participacion";

function reportFixture(overrides: Partial<TerritoryReport> = {}): TerritoryReport {
  return {
    scope: "region",
    scopeLabel: "National (2025)",
    regionCode: null,
    regionName: null,
    rows: [],
    totalAccidents: 0,
    ...overrides,
  };
}

/**
 * Fake dashboard service exposing only the territory-report seam. It records
 * whether (and with which filters) the export controller called it, so tests
 * can prove 401/400 responses never reach the data layer.
 */
function serviceWith(report: TerritoryReport | Error): DashboardService & { calls: DashboardFilters[] } {
  const calls: DashboardFilters[] = [];
  const service = {
    calls,
    async getDashboard(): Promise<never> {
      throw new Error("dashboard must not be called");
    },
    async getTerritoryReport(filters: DashboardFilters) {
      calls.push(filters);
      if (report instanceof Error) throw report;
      return report;
    },
  };
  return service;
}

function appWith(service: DashboardService) {
  return buildApp({ logger: false, authToken: TOKEN, dashboardService: service });
}

function csv(lines: string[]): string {
  return BOM + [HEADER_ROW, ...lines].join("\r\n") + "\r\n";
}

test("export.csv rejects missing or wrong bearer before the service runs", async (t) => {
  const service = serviceWith(reportFixture());
  const app = appWith(service);
  t.after(() => app.close());

  const missing = await app.inject({ method: "GET", url: "/api/dashboard/export.csv" });
  assert.equal(missing.statusCode, 401);
  assert.deepEqual(missing.json(), { error: { code: "UNAUTHORIZED", message: "missing or invalid bearer token" } });

  const invalid = await app.inject({
    method: "GET",
    url: "/api/dashboard/export.csv",
    headers: { authorization: "Bearer wrong-token" },
  });
  assert.equal(invalid.statusCode, 401);
  assert.equal(service.calls.length, 0);
});

test("export.csv answers 400 for invalid filters without touching the service", async (t) => {
  const service = serviceWith(reportFixture());
  const app = appWith(service);
  t.after(() => app.close());

  const schemaRejection = await app.inject({
    method: "GET",
    url: "/api/dashboard/export.csv?regionId=17",
    headers: auth,
  });
  assert.equal(schemaRejection.statusCode, 400);
  const schemaBody = schemaRejection.json();
  assert.equal(schemaBody.error.code, "VALIDATION_ERROR");
  assert.deepEqual(schemaBody.error.details, [{ field: "regionId", reason: "out_of_range" }]);

  const dateRejection = await app.inject({
    method: "GET",
    url: "/api/dashboard/export.csv?from=2024-06-01",
    headers: auth,
  });
  assert.equal(dateRejection.statusCode, 400);
  const dateBody = dateRejection.json();
  assert.equal(dateBody.error.code, "VALIDATION_ERROR");
  assert.deepEqual(dateBody.error.details, [{ field: "from", reason: "out_of_range" }]);
  assert.equal(dateBody.error.message, "from must be within 2025");
  assert.equal(service.calls.length, 0);
});

test("national scope serializes region rows with BOM, CRLF, quoting and es-CL shares", async (t) => {
  const report = reportFixture({
    rows: [
      { code: "XV", name: "Región de Arica y Parinacota", accidents: 52788, fatalities: 900 },
      { code: "XIII", name: 'Región "Metro", Santiago', accidents: 20293, fatalities: 350 },
    ],
    totalAccidents: 73081,
  });
  const service = serviceWith(report);
  const app = appWith(service);
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/dashboard/export.csv", headers: auth });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "text/csv; charset=utf-8");
  assert.equal(response.headers["content-disposition"], 'attachment; filename="accidentes-2025-territorios.csv"');
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.headers["x-content-type-options"], "nosniff");

  assert.deepEqual(service.calls, [{ from: "2025-01-01", to: "2025-12-31", regionId: null, communeId: null }]);

  const body = response.rawPayload.toString("utf8");
  assert.ok(body.startsWith(BOM), "CSV must start with the UTF-8 BOM");
  assert.equal(
    body,
    csv([
      "Región,XV,Región de Arica y Parinacota,,,52788,900,\"72,2\"",
      "Región,XIII,\"Región \"\"Metro\"\", Santiago\",,,20293,350,\"27,8\"",
    ]),
  );
});

test("commune scope emits Comuna rows with region columns and zero-share as 0,0", async (t) => {
  const report = reportFixture({
    scope: "commune",
    scopeLabel: "Cerrillos",
    regionCode: "XIII",
    regionName: "Región Metropolitana de Santiago",
    rows: [{ code: "XIII-1", name: "Cerrillos", accidents: 0, fatalities: 0 }],
    totalAccidents: 0,
  });
  const service = serviceWith(report);
  const app = appWith(service);
  t.after(() => app.close());

  const response = await app.inject({
    method: "GET",
    url: "/api/dashboard/export.csv?communeId=XIII-1",
    headers: auth,
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(service.calls, [{
    from: "2025-01-01",
    to: "2025-12-31",
    regionId: null,
    communeId: "XIII-1",
  }]);
  assert.equal(
    response.rawPayload.toString("utf8"),
    csv(["Comuna,XIII,Región Metropolitana de Santiago,XIII-1,Cerrillos,0,0,\"0,0\""]),
  );
});

test("missing region metadata falls back to the commune code prefix", async (t) => {
  const report = reportFixture({
    scope: "commune",
    regionCode: null,
    regionName: null,
    rows: [{ code: "XIV-2", name: "Casa Blanca", accidents: 5, fatalities: 0 }],
    totalAccidents: 5,
  });
  const service = serviceWith(report);
  const app = appWith(service);
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/dashboard/export.csv", headers: auth });
  assert.equal(response.rawPayload.toString("utf8"), csv(["Comuna,XIV,,XIV-2,Casa Blanca,5,0,\"100,0\""]));
});

test("formula injection in text cells is prefixed without touching numeric cells", async (t) => {
  const dangerous = ["=SUM(A1)", "+1", "-1", "@evil", "\ttab", "\rcarriage"];
  const report = reportFixture({
    scope: "commune",
    regionCode: "XIII",
    regionName: "Región Metropolitana",
    rows: dangerous.map((name, index) => ({
      code: `XIII-${index + 1}`,
      name,
      accidents: index + 1,
      fatalities: 0,
    })),
    totalAccidents: 21,
  });
  const service = serviceWith(report);
  const app = appWith(service);
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/dashboard/export.csv", headers: auth });
  const body = response.rawPayload.toString("utf8");
  assert.ok(body.includes("XIII-1,'=SUM(A1),1,0,\"4,8\""));
  assert.ok(body.includes("XIII-2,'+1,2,0,\"9,5\""));
  assert.ok(body.includes("XIII-3,'-1,3,0,\"14,3\""));
  assert.ok(body.includes("XIII-4,'@evil,4,0,\"19,0\""));
  assert.ok(body.includes("XIII-5,'\ttab,5,0,\"23,8\""));
  assert.ok(body.includes("XIII-6,\"'\rcarriage\",6,0,\"28,6\""), "CR cells stay quoted after the prefix");
});

test("empty territory scope returns a header-only 200", async (t) => {
  const service = serviceWith(reportFixture());
  const app = appWith(service);
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/dashboard/export.csv", headers: auth });
  assert.equal(response.statusCode, 200);
  assert.equal(response.rawPayload.toString("utf8"), `${BOM}${HEADER_ROW}\r\n`);
});

test("row cap rejects with 400 too_large instead of truncating", async (t) => {
  const rows = Array.from({ length: 347 }, (_unused, index) => ({
    code: `XIII-${index + 1}`,
    name: `Comuna ${index + 1}`,
    accidents: 1,
    fatalities: 0,
  }));
  const service = serviceWith(reportFixture({ scope: "commune", regionCode: "XIII", rows, totalAccidents: 347 }));
  const app = appWith(service);
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/dashboard/export.csv", headers: auth });
  assert.equal(response.statusCode, 400);
  const body = response.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.deepEqual(body.error.details, [{ field: "export", reason: "too_large" }]);
  assert.match(body.error.message, /346/);
});

test("byte cap rejects with 400 too_large", async (t) => {
  const huge = "A".repeat(20_000);
  const rows = [1, 2, 3].map((index) => ({
    code: `XIII-${index}`,
    name: `${index} ${huge}`,
    accidents: index,
    fatalities: 0,
  }));
  const service = serviceWith(reportFixture({ scope: "commune", regionCode: "XIII", rows, totalAccidents: 6 }));
  const app = appWith(service);
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/dashboard/export.csv", headers: auth });
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json().error.details, [{ field: "export", reason: "too_large" }]);
});

test("service failures answer the shared 500 body without leaking internals", async (t) => {
  const service = serviceWith(new Error("SELECT * FROM internal_tables secret"));
  const app = appWith(service);
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/dashboard/export.csv", headers: auth });
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.json(), { error: { code: "INTERNAL", message: "dashboard export failed" } });
  assert.ok(!response.rawPayload.toString("utf8").includes("SELECT"));
});
