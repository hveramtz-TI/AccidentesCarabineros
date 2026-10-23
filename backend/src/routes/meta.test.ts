import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import { createMetaService } from "../services/meta-service.js";
import type { MetaRepository } from "../services/meta-service.js";
import type { MetaService } from "../types/meta-api.js";

const TOKEN = "meta-test-token";
const COUNTS = { siniestros: 73081, personas: 148252, vehiculos: 130234 };
const NOW = () => new Date("2026-10-23T12:34:56.000Z");
const auth = { authorization: `Bearer ${TOKEN}` };

const APPROVED_CAVEATS = [
  "La cobertura corresponde solo al año 2025; no existen datos de otros años para comparar.",
  "234 siniestros (0,3 %) registran una hora exacta de 00:00:00, probablemente por hora faltante en la fuente; se mantienen en la franja 00–03 y se informan, nunca se reasignan.",
  "23.918 filas de personas (16,1 %) no tienen edad registrada; se muestran como una banda propia «sin dato», sin imputación.",
  "6 comunas del catálogo no registran accidentes; se distinguen de la ausencia de datos.",
  "Las participaciones por tipo de vehículo no suman 100 %, porque un siniestro puede involucrar varios tipos.",
  "2 siniestros válidos no tienen filas de vehículo asociadas.",
  "«ZONA» es una dimensión de la fuente y no una región; la región siempre se deriva de la comuna.",
];

function trackingService() {
  const state = { calls: 0 };
  const repository: MetaRepository = {
    async countRows() {
      state.calls += 1;
      return COUNTS;
    },
  };
  return { service: createMetaService(repository, NOW), state };
}

function appWith(service: MetaService) {
  return buildApp({ logger: false, authToken: TOKEN, metaService: service });
}

test("GET /api/meta rejects a missing or invalid bearer before the service runs", async (t) => {
  const { service, state } = trackingService();
  const app = appWith(service);
  t.after(() => app.close());

  const missing = await app.inject({ method: "GET", url: "/api/meta" });
  assert.equal(missing.statusCode, 401);
  assert.deepEqual(missing.json(), {
    error: { code: "UNAUTHORIZED", message: "missing or invalid bearer token" },
  });

  const invalid = await app.inject({
    method: "GET",
    url: "/api/meta",
    headers: { authorization: "Bearer wrong-token" },
  });
  assert.equal(invalid.statusCode, 401);
  assert.deepEqual(invalid.json(), {
    error: { code: "UNAUTHORIZED", message: "missing or invalid bearer token" },
  });

  assert.equal(state.calls, 0, "the service must not run for a rejected request");
});

test("GET /api/meta returns the dataset summary with the protected cache policy", async (t) => {
  const { service, state } = trackingService();
  const app = appWith(service);
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/meta", headers: auth });

  assert.equal(response.statusCode, 200);
  assert.equal(state.calls, 1);
  assert.equal(response.headers["cache-control"], "private, max-age=300");

  const body = response.json();
  assert.equal(body.schemaVersion, 1);
  assert.equal(body.source, "carabineros-2025-normalized");
  assert.equal(body.synthetic, false);
  assert.deepEqual(body.coverage, { from: "2025-01-01", to: "2025-12-31" });
  assert.deepEqual(body.rowCounts, COUNTS);
  assert.equal(body.generatedAt, "2026-10-23T12:34:56.000Z");
});

test("GET /api/meta returns the seven approved caveats in order", async (t) => {
  const { service } = trackingService();
  const app = appWith(service);
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/meta", headers: auth });
  const caveats: string[] = response.json().caveats;

  assert.equal(caveats.length, 7);
  assert.deepEqual(caveats, APPROVED_CAVEATS);
});

test("GET /api/meta sanitizes service failures without database details", async (t) => {
  const failing: MetaService = {
    async getMeta() {
      throw new Error("secret SQL details from db-neon.internal");
    },
  };
  const app = appWith(failing);
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/api/meta", headers: auth });

  assert.equal(response.statusCode, 500);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.deepEqual(response.json(), { error: { code: "INTERNAL", message: "meta query failed" } });
  assert.equal(response.body.includes("secret"), false);
  assert.equal(response.body.includes("SQL"), false);
  assert.equal(response.body.includes("db-neon"), false);
});

test("GET /api/meta fails closed without UUID_CONNECTION and never calls the service", async (t) => {
  const { service, state } = trackingService();
  const app = buildApp({ logger: false, authToken: null, metaService: service });
  t.after(() => app.close());

  const response = await app.inject({
    method: "GET",
    url: "/api/meta",
    headers: { authorization: "Bearer anything" },
  });

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.json(), {
    error: { code: "AUTH_NOT_CONFIGURED", message: "UUID_CONNECTION is not set on the backend" },
  });
  assert.equal(state.calls, 0);
});

test("GET /api/meta rejections keep the no-store policy instead of the private one", async (t) => {
  const { service } = trackingService();
  const app = appWith(service);
  t.after(() => app.close());

  const response = await app.inject({
    method: "GET",
    url: "/api/meta",
    headers: { authorization: "Bearer wrong-token" },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.headers["cache-control"], "no-store");
});
