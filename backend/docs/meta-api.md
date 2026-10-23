# Dataset metadata API — `GET /api/meta` contract

**Status:** fixed for EXP-01 (Metodología). The caveats, coverage window, and row
counts are the approved values from `dashboard-metrics.md`; this document only
fixes the HTTP surface. No endpoint may add an indicator that is not there.

## 1. Purpose

`GET /api/meta` is a small, read-only dataset summary for the Metodología page:
what the dataset is, which period it covers, how many fact rows exist right now,
and which caveats travel with every indicator. It replaces hard-coded numbers on
the frontend so the page cannot drift from the database. It never returns rows,
metrics, rates, rankings, charts, or comparisons.

## 2. Surface and auth

- `GET /api/meta` — protected, read-only. No query parameters are read.
- Auth: requires `Authorization: Bearer <UUID_CONNECTION>`, the same request
  barrier as `GET /api/dashboard`. **The Bearer token is a request barrier, not
  user authentication**: the frontend value is intentionally public and
  compiled into the bundle.
- The shared guard (`routes/api-guard.ts`) sets `Cache-Control: no-store` on
  every response first, runs the Bearer check in `preValidation`, and only then
  reaches the route handler. A missing or invalid token returns `401` before any
  database work; the count query is never called.
- If `UUID_CONNECTION` is unset on the backend, the route fails closed with
  `500 AUTH_NOT_CONFIGURED`.
- CORS is the shell allowlist from `app.ts`; `OPTIONS` preflight answers `204`
  before auth.

## 3. Cache policy

`Cache-Control: private, max-age=300` on the `200` response. This is the approved
protected default for a dataset summary. The public variant
(`public, max-age=3600`) must not be used unless the endpoint is explicitly made
public in a later decision. Rejections and failures keep the guard's `no-store`.

## 4. Response `200`

All values are counts ≤ 148.252, so they fit safely in JSON numbers (no BigInt).
`rowCounts` comes from one parameterless query with subselects; fact rows are
never loaded into Node. The payload stays well under the 5 KB cap.

```jsonc
{
  "schemaVersion": 1,
  "source": "carabineros-2025-normalized",
  "synthetic": false,
  "coverage": { "from": "2025-01-01", "to": "2025-12-31" },
  "rowCounts": { "siniestros": 73081, "personas": 148252, "vehiculos": 130234 },
  "caveats": [
    "La cobertura corresponde solo al año 2025; no existen datos de otros años para comparar.",
    "234 siniestros (0,3 %) registran una hora exacta de 00:00:00, probablemente por hora faltante en la fuente; se mantienen en la franja 00–03 y se informan, nunca se reasignan.",
    "23.918 filas de personas (16,1 %) no tienen edad registrada; se muestran como una banda propia «sin dato», sin imputación.",
    "6 comunas del catálogo no registran accidentes; se distinguen de la ausencia de datos.",
    "Las participaciones por tipo de vehículo no suman 100 %, porque un siniestro puede involucrar varios tipos.",
    "2 siniestros válidos no tienen filas de vehículo asociadas.",
    "«ZONA» es una dimensión de la fuente y no una región; la región siempre se deriva de la comuna."
  ],
  "generatedAt": "2026-10-23T12:34:56.000Z"
}
```

## 5. Caveats (ordered, exactly seven)

The array order is part of the contract. Wording and numbers are quoted from
`dashboard-metrics.md`; do not reword or add a caveat without a matching
approval there.

| # | Topic | Source |
|---|---|---|
| 1 | 2025-only coverage | §2, §5 (no multi-year / YoY) |
| 2 | 234 siniestros (0,3 %) at exact `00:00:00`, kept in the 00–03 bucket, disclosed, never reassigned | §3.10 |
| 3 | 23.918 person rows (16,1 %) without age, shown as an explicit `unknown` band | §3.12 |
| 4 | 6 catalog communes with zero accidents, distinguishable from missing data | §3.7 |
| 5 | Vehicle-type shares do not sum to 100 % (one siniestro can involve several types) | §3.11 |
| 6 | 2 valid siniestros have no vehicle rows | §3.11 |
| 7 | `ZONA` is a source dimension, not a region | §1, §5 |

## 6. Errors

- `401` — missing, malformed, or wrong Bearer; returned before the service runs:

```json
{ "error": { "code": "UNAUTHORIZED", "message": "missing or invalid bearer token" } }
```

- `500` — count-query or service failure: `{ "error": { "code": "INTERNAL",
  "message": "meta query failed" } }`. No database name, connection string,
  stack trace, or PII is included in the body; details go to the structured
  Fastify log.
- `500 AUTH_NOT_CONFIGURED` — `UUID_CONNECTION` is unset; the route fails closed.
- `404` — default Fastify for any other path.

## 7. Non-goals

- No rows, samples, PII, or exports.
- No new metric, rate, ranking, chart, or comparison.
- No schema change, import-metadata table, or materialized view.
- No public access by default.
