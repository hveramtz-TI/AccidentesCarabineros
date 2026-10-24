# EXP-04 — Análisis: Vehículos

Brainstorm idea: #5 Vehículos
Execution order: 04
Risk: 3/5
Cost: 3/5
Depends on: EXP-03
Status: done

## Objective

Add a Vehículos tab to the Análisis area. Extend `GET /api/analysis` with a
vehicle-type distribution and a type × severity matrix, counting distinct
siniestros and disclosing that type shares are non-additive.

## Current state

- EXP-03 creates `/api/analysis` with `causes` and the `AnalysisLayout`.
- The dashboard exposes a top-10 vehicle-type list plus “other”, with a
  non-additivity note, but no full type list, no type × severity matrix, and no
  analysis tab.
- A siniestro can involve several vehicle types; the same accident can appear
  under more than one type.
- 2 valid siniestros have no vehicle rows.
- The vehicle catalog is normalized; no schema change is required.

## Why

Vehicle type is a main operational lever for road-safety analysis, but the
current KPIs only show totals. A dedicated tab makes the type mix and its
severity profile visible while preventing the classic error of summing
non-additive type shares.

## Scope

1. Extend `GET /api/analysis` with a `vehicles` section:
   `totalSiniestros`, `withoutVehicleRows`, `byType`, and `byTypeSeverity`.
2. `byType`: `typeId`, `name`, `siniestros` (distinct), and `share` of scope
   siniestros; return every vehicle type present in the scope, not just the
   dashboard’s top 10.
3. `byTypeSeverity`: `typeId`, `name`, `severity`, and `siniestros` (distinct),
   using the four approved siniestro-level buckets (`fatal`, `serious`, `minor`,
   `onlyIlesos`) plus an `unknown` bucket only if severity is missing.
4. Count each type with `COUNT(DISTINCT siniestro_id)`; do not count vehicle rows.
5. Enable the Vehículos tab at `/analisis/vehiculos`; Personas and Tendencias
   remain disabled.
6. Build a type table (type, siniestros, share), a severity matrix (type × the
   four approved buckets, plus an unknown column when needed), and a visible
   non-additivity caveat.
7. Show `withoutVehicleRows` as a coverage note, not as a type.
8. Reuse the `AnalysisLayout` query/outlet context; no second request.

## Out of scope

- Person-level vehicle analysis or driver/rider demographics.
- Vehicle brand, model, year, or plate analysis.
- A new endpoint per vehicle view.
- A chart library or map geometry.
- Schema changes, new catalogs, or data enrichment.
- CSV export (EXP-06).

## Constraints and rules

- **Non-additive:** one siniestro can appear in several vehicle types, so
  `sum(byType.siniestros)` may exceed `totalSiniestros` and shares may exceed
  100%. Never present a grand total as the sum of type rows.
- **Severity grain:** the severity bucket is the siniestro-level severity defined
  in `backend/docs/dashboard-metrics.md`: `fatal` when `fallecidos > 0`, then
  `serious` when `lesionadosGraves > 0`, then `minor` when
  `lesionadosMenosGraves` or `lesionadosLeves > 0`, then `onlyIlesos` when
  `ilesos > 0`. It is not a person-level severity. If the data only supports
  person-level severity, stop and ask before implementing the matrix.
- For each type, severity counts use distinct siniestros and include an `unknown`
  bucket for missing severity so the matrix reconciles to the type total; never
  silently drop rows.
- `share` denominator is `totalSiniestros` for the current scope and period.
- `withoutVehicleRows` counts valid siniestros with no vehicle row; do not infer
  a vehicle type.
- The response stays additive: `causes` and existing sections are unchanged.
- 1 GB / 1 shared vCPU: aggregate in SQL, one or two queries, no fact rows in
  Node, payload <100 KB, `statement_timeout` 5 s.
- No raw vehicle IDs, plates, VINs, or PII.

## Tasks

- [x] T1 — Confirm semantics and catalog
  - Evidence (live DB, before implementation): `tipo_vehiculo` holds 38 types,
    all 38 appear in `vehiculo` nationally; severity is siniestro-level
    (`fallecidos`, `lesionados_graves`, `lesionados_menos_graves`,
    `lesionados_leves`, `ilesos` on `siniestro`); exactly 0 all-zero-severity
    siniestros (the `unknown` bucket is defensive only); exactly 2 siniestros
    without vehicle rows. The stop gate never fired: severity is not
    person-level.

- [x] T2 — Extend the analysis contract
  - Evidence: `vehicles` added to `backend/src/types/insights-api.ts`
    (`totalSiniestros`, `withoutVehicleRows`, `byType`, `byTypeSeverity`) and
    mirrored in `frontend/src/lib/api/analysis.ts`; documented in
    `backend/docs/analysis-api.md` (§vehicles, additive rule, reconciliation,
    non-additivity, measured payload) with the type × severity definition added
    as `VEI-2` in `backend/docs/dashboard-metrics.md`.

- [x] T3 — Implement the aggregate
  - Evidence: `backend/src/services/analysis-service.ts` adds two aggregates
    fetched with `Promise.all` next to the cause query: per (type, severity)
    `COUNT(DISTINCT siniestro_id)` with a severity CASE that is **verbatim** the
    dashboard's approved `querySeverity` (plus `ELSE unknown`, which replaces
    the dashboard's `allZero` discard and keeps the partition exhaustive), and
    `withoutVehicleRows` via `NOT EXISTS` with the same territory clause
    (renamed `siniestroTerritoryClause`, body unchanged). `byType` is derived by
    summing each type's matrix cells: the buckets partition siniestros, so the
    sum equals `COUNT(DISTINCT siniestro_id)` structurally.
    `totalSiniestros` reuses `causes.totalAccidents` (safe: `causa_id` is
    NOT NULL/FK, zero NULLs verified). Shares use the existing `percent` helper.
  - Deviation declared: the ODD constraint says "one or two queries"; the
    endpoint now runs territory + 3 aggregates (4 round-trips, 0.16 s national,
    0.01 s commune). The intent — aggregate in SQL, no fact rows in Node — is
    met; the literal count is not. Not hidden, not smuggled: recorded here.

- [x] T4 — Add backend tests
  - Evidence: +8 tests in `backend/src/routes/analysis.test.ts` (additivity of
    `causes`, distinct-per-type counting through a two-type overlap, share
    rounding parity, matrix reconciliation, coverage rows, empty scope, shape,
    plus the verifier's durable probe: shuffled repository cells are
    re-ordered canonically and zero cells never surface). Existing 15 analysis
    tests untouched in content (the diff only extends fixtures).
    `npm test` → 65 tests, 65 pass, 0 fail. RED observed first (7 failures),
    then GREEN.

- [x] T5 — Build the Vehículos tab
  - Evidence: `frontend/src/pages/analysis-vehicles-page.tsx` +
    `vehicle-type-table.tsx` + `vehicle-severity-matrix.tsx`; tab enabled in
    `analysis-layout.tsx` and routed lazily in `App.tsx`; the page is
    presentational (outlet context only, zero fetches), the non-additivity
    disclosure renders **before** any numbers, there is deliberately **no
    cumulative column and no Pareto line** (cumulative over non-additive data
    would lie), `unknown` columns appear only when fed, the Total column equals
    `byType.siniestros` by construction, `withoutVehicleRows` is a coverage
    sentence and never a type row, the skeleton mirrors the real sections, and
    a stale server without `vehicles` renders a status message instead of
    crashing.

- [x] T6 — Verify and update the index
  - Evidence: national API `byType[0]` = AUTOMOVIL 51,207 / 70.1 %; per-type and
    per-bucket counts match independent SQL cell-by-cell in four scopes
    (national 38 types/137 cells, XIII 36/107, XIII-1 19/42, Q3 36/109); the
    dashboard's own independent `queryVehicles` top-10 matches the analysis
    top-10 item-for-item; `withoutVehicleRows`: national 2 / Q3 1 / XIII-1 0;
    payload 20,165 B < 100 KB; `causes` section byte-identical to the baseline
    reconstruction in all five probed scopes; auth/validation/cache identical
    (`private, max-age=60`, 401/400 bodies unchanged).
    Independent verification (`gentle-ai-verify`, baseline `a5654ad`, dual
    `mktemp` scratch): **0 blockers, 7/7 acceptance PASS, central MECE claim
    VERIFIED**; its advisories were fixed (doc `typeId` example corrected to
    the real 1; the durable ordering test added).
  - Risk: item 3 (extends a consumed public contract; the additive rule is the
    whole point of later tabs) — mitigated by the byte-identical `causes`
    differential and the additivity test.
  - **Still open:** browser pass (disclosure reading order, matrix horizontal
    scroll at 360 px, tab switching keeps filters) and the declared gaps
    inherited from EXP-03 (`statement_timeout`).

## Acceptance criteria

- [x] `GET /api/analysis` includes `vehicles` without changing `causes` —
  byte-identical `causes` section vs the baseline, verified in 5 scopes.
- [x] Each type count uses distinct siniestros and matches independent SQL —
  cell-by-cell MATCH-ALL in four scopes, plus the dual-type siniestro probe
  (id 146164 counted once per type).
- [x] Type shares use the scope total and are labeled non-additive — every share
  recomputed matches; the disclosure precedes the numbers; no grand total of
  type rows exists anywhere (grep-proved).
- [x] The severity matrix reconciles per type and exposes missing severity —
  cells sum to `byType.siniestros` structurally and live; `unknown` rendered
  only when fed.
- [x] `withoutVehicleRows` is visible and not treated as a type.
- [x] The Vehículos tab works with URL filters and shares one analysis request —
  static proof (layout owns the only query; key is the four filters; tab link
  carries `location.search`); click-through is part of the browser pass.
- [x] Browser-only half of the criteria (360 px scroll, reading order,
  filter-preserving tab click): approved by the user on the browser pass.
- [x] Backend tests/build and frontend lint/build pass — 65/65, tsc clean,
  eslint clean, `analysis-vehicles-page-*.js` 12.25 kB / 3.51 kB gzip.

## Checks

- `cd backend && npm test && npm run build`
- `cd frontend && npm run lint && npm run build`
- SQL: `COUNT(DISTINCT siniestro_id)` per type vs API.
- SQL: type × severity matrix vs API for national and one region.
- Manual: non-additivity caveat, missing rows, empty scope, 360px width.
- Payload: analysis response <100 KB.

## User decision gates

- **Severity grain:** siniestro-level severity is required for the matrix. Confirm
  before T3; otherwise the matrix must be redesigned.
- **Unknown severity:** keep the `unknown` bucket visible if missing values
  exist. Confirm its label and placement, not whether it is dropped.
- **Type grouping:** use the existing normalized vehicle catalog; do not merge
  types for readability without approval.

## Delivery

- One additive backend section + tests and one tab.
- Do not push, open a PR, or deploy without explicit authorization.
- Update the index status and evidence after verification.

## Next step

After EXP-04, execute EXP-05 (Personas, order 05). EXP-06 (Informes, order 06)
does not depend on this section; EXP-07 (Tendencias, order 07) follows later and
extends the same analysis endpoint.

## Progress

- **2026-10-23 — ODD created:** vehicle contract, distinct-count semantics,
  non-additivity caveat, and acceptance defined; implementation not started.
- **2026-10-23 — T1-T5 implemented and verified:** catalog/semantics gate passed
  live first; the endpoint extended additively (two aggregates + derived
  `byType`); 8 new tests; tab built without cumulative/Pareto by design.
  Independent verification: 0 blockers, MECE claim VERIFIED cell-by-cell, 7/7
  acceptance PASS; its two actionable advisories applied. Compose stack rebuilt:
  `/analisis/vehiculos` → 200 and the chunk is real `application/javascript`.
  Status stays `in_progress` until the browser pass.
- **2026-10-23 — EXP-04 closed:** the user approved `/analisis/vehiculos` on the
  browser pass (disclosure order, matrix scroll, filter-preserving tab click).
  Declared gaps stay declared: 4 round-trips vs "one or two" (intent met,
  recorded), `statement_timeout` inherited from EXP-03.

