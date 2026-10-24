# Analysis API — `GET /api/analysis` contract

**Status:** fixed for EXP-03 (Análisis: Causas); `vehicles` added additively by
EXP-04 (Análisis: Vehículos). The metric definitions and caveats are the
approved ones in `dashboard-metrics.md`; this document only fixes the HTTP
surface. The endpoint is additive by section: later analysis tabs append new
keys without renaming or removing `causes`.

## 1. Purpose

`GET /api/analysis` is the shared, read-only data source for the Análisis area.
EXP-03 ships one section, `causes`, which exposes **every** catalog cause — not
only the Top 10 — so the long tail and zero-accident causes stay visible.
EXP-04 appends `vehicles`: the full vehicle-type distribution of the scope and
the type × severity matrix, both counted in distinct siniestros. Later ODDs
(`Personas`, `Tendencias`) extend the same response instead of adding one
endpoint per tab.

## 2. Surface and auth

- `GET /api/analysis` — protected, read-only, one response for every section.
- Auth: requires `Authorization: Bearer <UUID_CONNECTION>`, the same request
  barrier as `GET /api/dashboard`. The token is a request barrier, not user
  authentication; the frontend value is intentionally public.
- The shared guard (`routes/api-guard.ts`) sets `Cache-Control: no-store` first,
  checks the Bearer in `preValidation`, then validates the query schema. A
  missing or invalid token returns `401` before any database work.
- If `UUID_CONNECTION` is unset, the route fails closed with
  `500 AUTH_NOT_CONFIGURED`.
- CORS is the shell allowlist from `app.ts`; `OPTIONS` preflight answers `204`
  before auth.

## 3. Query parameters

Exactly the `/api/dashboard` contract (`backend/docs/dashboard-api.md` §2); the
route reuses `baseFilterSchema` and the dashboard's `validateDashboardFilters`,
so there is no second validation path.

| Parameter | Type | Rule | Default |
|---|---|---|---|
| `from` | string `YYYY-MM-DD` | within 2025-01-01..2025-12-31; `from <= to` | `2025-01-01` |
| `to` | string `YYYY-MM-DD` | same | `2025-12-31` |
| `regionId` | integer | must exist in `region` (1..16) | no filter |
| `communeId` | string (`[IVX]+-[0-9]+`) | must exist in `comuna`; **wins over** `regionId` | no filter |

Unknown parameters are ignored. The 2025-only window is a validation error, never
an empty result. Commune identifiers follow the frontend catalog (`XIII-1`);
`comuna` has no `identifier` column, so the API resolves the commune by its
`comuna_id` exactly like the dashboard.

## 4. Response `200`

All values are counts ≤ 148.252, so they fit safely in JSON numbers (no BigInt).
`rows` always contains the whole catalog (currently 70 causes), including
zero-accident causes. One aggregate query with a `LEFT JOIN` from `causa` builds
the `causes` section; two further SQL aggregates build `vehicles` (the type ×
severity matrix, and the no-vehicle coverage count). Fact rows are never loaded
into Node.

```jsonc
{
  "schemaVersion": 1,
  "meta": { "generatedAt": "2026-10-23T12:34:56.000Z" },
  "filters": { "from": "2025-01-01", "to": "2025-12-31", "regionId": null, "communeId": null },
  "causes": {
    "totalAccidents": 73081,
    "rows": [
      { "causeId": 2, "name": "CONDUCTOR NO ATENTO CONDICIONES TRANSITO MOMENTO", "accidents": 32999, "share": 45.2 }
    ]
  },
  "vehicles": {
    "totalSiniestros": 73081,
    "withoutVehicleRows": 2,
    "byType": [
      { "typeId": 1, "name": "AUTOMOVIL", "siniestros": 51207, "share": 70.1 }
    ],
    "byTypeSeverity": [
      { "typeId": 1, "name": "AUTOMOVIL", "severity": "fatal", "siniestros": 800 }
    ]
  }
}
```

### 4.1 Ordering and density

- `causes.rows` is ordered by `accidents` **DESC**, then `name` **ASC**. The order
  is deterministic and is the ranking the frontend displays.
- A zero-accident catalog cause is present with `accidents: 0` and `share: 0`; it
  is never omitted.
- The sum of `causes.rows[].accidents` equals `causes.totalAccidents` and the
  filtered `/api/dashboard` `kpis.accidents` (one cause per siniestro, every
  siniestro has a `causa_id`).
- An empty filtered scope returns `totalAccidents: 0` and the full catalog with
  zeros; it never substitutes national data.

### 4.2 Share and cumulative share

- `share` = `accidents / totalAccidents * 100`, rounded to one decimal. When
  `totalAccidents` is 0, every `share` is `0`.
- Cumulative share is **not** a response field. The client computes it as the
  running cumulative share (accumulated accidents / `totalAccidents`) in the API
  order and labels it explicitly. Its definition lives in
  `dashboard-metrics.md` §3.8.

### 4.3 Filters echo

`filters` echoes the effective scope: `from`/`to` after defaults, `communeId` as
sent, and `regionId` derived from the commune when a commune filter is present
(the region is never sent twice as an independent filter).

### 4.4 Vehicles section (EXP-04)

All counts are `COUNT(DISTINCT siniestro_id)` in the filtered scope — never
vehicle rows. The definitions are the approved §3.6 (severity buckets) and
§3.11 (vehicle-type non-additivity) of `dashboard-metrics.md`.

- `totalSiniestros` is the scope siniestro count and always equals
  `causes.totalAccidents` (one cause per siniestro, every siniestro has a
  `causa_id`), so no third count query runs.
- `withoutVehicleRows` counts scope siniestros with no vehicle row (national
  baseline: 2). It is a coverage note, never a type row.
- `byType` returns **only the types present in the scope** (`siniestros > 0`),
  unlike `causes.rows` (which keeps the full catalog with zeros). Ordered by
  `siniestros` **DESC**, then `name` **ASC**. `share` = `siniestros /
  totalSiniestros * 100`, one decimal, same rounding rule as causes; `0` when
  the scope total is `0`.
- **Non-additive:** one siniestro can involve several vehicle types, so
  `sum(byType[].siniestros) >= totalSiniestros` and the shares may sum above
  100 %. This is the documented rule (`VEI-1`), not an error. The response has
  no grand total, no cumulative share, and none may be computed from `byType`.
- `byTypeSeverity` is the type × severity matrix at siniestro-level grain
  (`SEV-1` buckets: `fatal` when `fallecidos > 0`, else `serious` when
  `lesionados_graves > 0`, else `minor` when `lesionados_menos_graves > 0` or
  `lesionados_leves > 0`, else `onlyIlesos` when `ilesos > 0`). Because the
  buckets partition siniestros, the rows of one type reconcile exactly with
  that type's `byType.siniestros` — `byType` is derived by summing the matrix
  cells per type, so the equality is structural.
- `unknown` is a defensive bucket for siniestros whose severity columns are all
  zero/missing (measured 0 nationally). It appears only when the data produces
  it; zero-count cells are never emitted or padded.
- Ordering: types follow the `byType` order; within a type the buckets follow
  `fatal, serious, minor, onlyIlesos, unknown`. Deterministic for any
  repository implementation.
- An empty scope returns `totalSiniestros: 0`, `withoutVehicleRows: 0`, and
  both lists empty — never national data.

## 5. Cache policy

`Cache-Control: private, max-age=60` on a successful `200` (it overwrites the
guard's `no-store`). Rejections and failures keep `no-store`. The payload is
bounded by the 70-cause catalog plus at most 38 vehicle types × 5 severity
buckets and stays well under the 100 KB cap (EXP-03 measured 6.5–6.8 KB
causes-only; EXP-04 measured the national response with `vehicles` at 20,165
bytes).

## 6. Errors

- `401` — missing, malformed, or wrong Bearer, before the service runs:

```json
{ "error": { "code": "UNAUTHORIZED", "message": "missing or invalid bearer token" } }
```

- `400` — query validation (format, outside 2025, `from > to`, unknown
  `regionId`/`communeId`):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "from must be within 2025", "details": [ { "field": "from", "reason": "out_of_range" } ] } }
```

- `500` — aggregate or service failure: `{ "error": { "code": "INTERNAL",
  "message": "analysis query failed" } }`. No database name, stack trace, raw ID,
  or PII is included; details go to the structured Fastify log.
- `500 AUTH_NOT_CONFIGURED` — `UUID_CONNECTION` is unset.
- `404` — default Fastify for any other path.

## 7. Additive rule

`causes` is fixed for EXP-03 and `vehicles` is fixed for EXP-04. Later tabs add
sibling keys (for example `persons`, `trends`) and may add fields inside their
own section, but must not rename, remove, or change the meaning of `causes`,
`vehicles`, `totalAccidents`, `share`, or the response envelope. `schemaVersion`
is bumped only for a breaking change.

## 8. Non-goals

- No per-tab endpoint, no cause-to-person/vehicle crosstabs, no CSV export or
  comparator (EXP-06/EXP-07).
- No chart library, schema change, materialized view, or synthetic fallback.
- No raw IDs beyond `causeId` and `typeId`; no PII, no vehicle rows, plates,
  VINs, or brand/model/year.
