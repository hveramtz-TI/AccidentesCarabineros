# Analysis API — `GET /api/analysis` contract

**Status:** fixed for EXP-03 (Análisis: Causas); `vehicles` added additively by
EXP-04 (Análisis: Vehículos) and `persons` by EXP-05 (Análisis: Personas). The
metric definitions and caveats are the approved ones in `dashboard-metrics.md`;
this document only fixes the HTTP surface. The endpoint is additive by section:
later analysis tabs append new keys without renaming or removing `causes`.

## 1. Purpose

`GET /api/analysis` is the shared, read-only data source for the Análisis area.
EXP-03 ships one section, `causes`, which exposes **every** catalog cause — not
only the Top 10 — so the long tail and zero-accident causes stay visible.
EXP-04 appends `vehicles`: the full vehicle-type distribution of the scope and
the type × severity matrix, both counted in distinct siniestros. EXP-05 appends
`persons`: the person-grain demographic distributions (sex, age) and the two
person crosstabs (sex × age, role × outcome). Later ODDs (`Tendencias`) extend
the same response instead of adding one endpoint per tab.

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
severity matrix, and the no-vehicle coverage count) and two more build `persons`
(the sex × age matrix and the role × outcome matrix). Fact rows are never loaded
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
  },
  "persons": {
    "rows": 148252,
    "unknownAge": 23918,
    "unknownSex": 6448,
    "bySex": [
      { "sexId": 1, "name": "MASCULINO", "persons": 104536, "share": 70.5 }
    ],
    "byAge": [
      { "bucket": "0-17", "persons": 5255, "share": 3.5 },
      { "bucket": "18-25", "persons": 15942, "share": 10.8 },
      { "bucket": "26-40", "persons": 45651, "share": 30.8 },
      { "bucket": "41-64", "persons": 46236, "share": 31.2 },
      { "bucket": "65+", "persons": 11250, "share": 7.6 },
      { "bucket": "unknown", "persons": 23918, "share": 16.1 }
    ],
    "bySexAge": [
      { "sexId": 1, "name": "MASCULINO", "bucket": "0-17", "persons": 2825 }
    ],
    "byQualityOutcome": [
      { "qualityId": 1, "qualityName": "CONDUCTOR", "outcomeId": 2, "outcomeName": "ILESO", "persons": 80182 }
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

### 4.5 Persons section (EXP-05)

All counts are **personas** (`COUNT(*)` over `persona` rows joined through
`siniestro` with the same date/territory clause), never distinct siniestros —
one siniestro involves several people, so person counts must never be compared
1:1 with accident counts or share an axis with them. The definitions are the
approved §3.12 of `dashboard-metrics.md` (`PER-1`/`PER-2`).

- Exactly **two new SQL aggregates** build the whole section: the sex × age
  matrix (`GROUP BY sexo_id` + the age CASE verbatim from the dashboard) and the
  role × outcome matrix (`GROUP BY calidad_persona_id, resultado_persona_id`).
  Everything else derives from those matrices.
- **MECE by construction:** every persona row has exactly one `sexo` (NOT NULL
  FK; unknown sex is the catalog row `SE IGNORA` id 3, never NULL), falls in
  exactly one age band (NULL `edad` → `unknown`, else the ordered CASE,
  exhaustive via `ELSE 65+`), and has exactly one role and one outcome (NOT NULL
  FKs over complete catalogs). Therefore `rows` equals the sum of **either**
  matrix and `bySex`/`byAge` are exact marginals, not estimates — verified
  cell-by-cell against independent SQL at national (18 + 19 populated cells)
  and `XIII-1` scope (13 + 17 cells), 2026-10-23.
- `rows` is the scope person count (national baseline: 148.252).
- `unknownAge` is the `unknown` band marginal (national baseline: 23.918);
  `unknownSex` is the sexId-3 marginal. Both are also present inside `byAge`/
  `bySex`; the fields are coverage notes, never separate data. Nothing is
  imputed or reassigned.
- `bySex` is ordered by `sexId` **ASC** (matching the dashboard's sex grouping,
  catalog `nombre_normal` labels). `byAge` always returns **all six bands** in
  the exact `AGE_BANDS` order (`0-17, 18-25, 26-40, 41-64, 65+, unknown`),
  including zero-valued bands, so the bands stay visible in every scope.
- `bySexAge` lists the populated cells of the sex × age matrix, ordered
  `sexId` ASC then band order. `byQualityOutcome` lists the populated cells of
  the role × outcome matrix, ordered `persons` **DESC**, then `qualityId` ASC,
  then `outcomeId` ASC. Cells with `persons = 0` are never emitted: a SQL
  `GROUP BY` only produces populated groups, and the repository contract
  returns exactly those cells (the service also filters any defensive zero from
  a custom repository — same rule as the EXP-04 matrix). The frontend pads
  missing matrix positions to 0.
- `share` (in `bySex`/`byAge`) = `persons / rows * 100`, one decimal, same
  rounding as `causes`; the denominator is `persons.rows`, **never**
  `causes.totalAccidents`. `0` when the scope has no persons.
- The outcome dimension is `resultado_persona` — the **person-level** outcome
  (catalog ids: 1 LEVE, 2 ILESO, 3 MENOS GRAVE, 4 FALLECIDO, 5 GRAVE),
  semantically distinct from the siniestro-level severity buckets used by
  `vehicles`; the mapping between the two grains is the reconciliation table of
  `dashboard-metrics.md` §4. Columns are ordered by `outcomeId`.
- No PII: only catalog ids and labels appear; `persona_id` never does.
- An empty scope returns `rows: 0`, `unknownAge: 0`, `unknownSex: 0`, empty
  `bySex`, the six `byAge` bands with `persons: 0` and `share: 0` (no division
  by zero), and both matrices empty — never national data.

### 4.6 Sección `trend` (EXP-07)

Distribución mensual de siniestros y fallecidos del **siniestro** (grano de
siniestro, la misma que el `monthlyTrend` del panel), para el período filtrado.

```jsonc
"trend": {
  "months": [
    { "month": "2025-01", "accidents": 5776, "fatalities": 121 },
    { "month": "2025-02", "accidents": 5410, "fatalities": 109 }
    // ... denso sobre from..to
  ],
  "totalAccidents": 73081,
  "totalFatalities": 1507
}
```

- `months` es **denso sobre el período pedido**: con los defaults (año 2025
  completo) son exactamente **12 filas**, enero a diciembre; un trimestre
  devuelve sus 3 meses. Un mes sin siniestros en el alcance es una fila con
  `0`, nunca un hueco (regla de denseMonths idéntica al panel).
- `month` es `YYYY-MM` derivado de `fecha` (columna date, sin zona: no hay
  desplazamiento posible).
- `totalAccidents` = suma de `months.accidents` y debe coincidir con
  `causes.totalAccidents` del mismo alcance; `totalFatalities` = suma de
  `months.fatalities` y coincide con `kpis.fatalities` del panel para el mismo
  filtro. Meses sin siniestros aportan `0` a ambas sumas.

### 4.7 Sección `weekdayHours` (EXP-07)

Mapa de calor siniestros por **día de la semana × franja de 3 horas**.

```jsonc
"weekdayHours": {
  "cells": [
    { "weekday": 1, "bucket": 0, "accidents": 315 },
    { "weekday": 1, "bucket": 3, "accidents": 115 }
    // ... 56 celdas
  ],
  "midnightArtifactCount": 234,
  "totalAccidents": 73081
}
```

- `weekday` usa **ISO-8601**: `1 = lunes … 7 = domingo` (inicio de semana en
  lunes, decisión de usuario EXP-07). Las etiquetas en español las pone el
  frontend; la API nunca las renombra.
- `bucket` es la hora inicial inclusiva de la misma franja de 3 horas del
  panel (`0, 3, 6, …, 21`), derivada de `hora` con truncado entero.
- `cells` contiene **exactamente 56 filas** (7 × 8), ordenadas `weekday` ASC
  y luego `bucket` ASC, con ceros incluidos. `siniestro.hora` es NOT NULL en
  las 73.081 filas importadas (verificado en vivo), por lo que **no existe ni
  puede agregarse una cubeta `unknown` de tiempo** sin un cambio de contrato.
- Los registros con hora exacta `00:00:00` (artefacto conocido del origen)
  **permanecen en su cubeta 00–03**; `midnightArtifactCount` informa cuántos
  hay en el alcance para que la UI lo divulgue junto al heatmap. No se
  remueven, no se reasignan, no son una celda aparte.
- `totalAccidents` = suma de las 56 celdas = total del alcance; junto con el
  caveat de medianoche es la misma disciplina de reconciliación del panel.
- Un alcance vacío devuelve las 56 celdas con `0` y contador de medianoche `0`.

## 5. Cache policy

`Cache-Control: private, max-age=60` on a successful `200` (it overwrites the
guard's `no-store`). Rejections and failures keep `no-store`. The payload is
bounded by the 70-cause catalog, at most 38 vehicle types × 5 severity buckets,
the person matrices (at most 3 sexes × 6 bands plus 4 roles × 5 outcomes), the
12-row trend and the fixed 56-cell heatmap, and stays well under the 100 KB cap
(EXP-03 measured 6.5–6.8 KB causes-only; EXP-04 measured the national response
with `vehicles` at 20,165 bytes; EXP-05 measured the national response with
`persons` at 23,657 bytes — 18 sex × age cells and 19 role × outcome cells, the
20th combination being a true zero that is never emitted; EXP-07 adds the two
dense time series, ≈4 KB fixed-size, with the exact national byte count recorded
in the ODD evidence at T7).

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

`causes` is fixed for EXP-03, `vehicles` is fixed for EXP-04, `persons` is
fixed for EXP-05, and `trend` + `weekdayHours` are fixed for EXP-07. Later tabs
may add sibling keys and fields inside their own section, but must not rename,
remove, or change the meaning of `causes`, `vehicles`, `persons`, `trend`,
`weekdayHours`, `totalAccidents`, `share`, or the response envelope.
`schemaVersion` is bumped only for a breaking change.

## 8. Non-goals

- No per-tab endpoint, no cause-to-person/vehicle crosstabs (the EXP-05 matrices
  cross sex × age and role × outcome, both at person grain), no CSV export or
  comparator (EXP-06/EXP-07).
- No chart library, schema change, materialized view, or synthetic fallback.
- No raw IDs beyond catalog identifiers (`causeId`, `typeId`, `sexId`,
  `qualityId`, `outcomeId`); no PII, no `persona_id` or person rows, no vehicle
  rows, plates, VINs, or brand/model/year.
