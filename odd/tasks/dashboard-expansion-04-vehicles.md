# EXP-04 — Análisis: Vehículos

Brainstorm idea: #5 Vehículos
Execution order: 04
Risk: 3/5
Cost: 3/5
Depends on: EXP-03
Status: planned

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

- [ ] T1 — Confirm semantics and catalog
  - Verify the vehicle-type normalization and the number of distinct types.
  - Verify the siniestro-level severity definition, the four keys/labels
    (`fatal`, `serious`, `minor`, `onlyIlesos`), and unknown-severity handling.
  - Verify the 2 siniestros without vehicle rows.
  - If severity is person-level only, stop and open a separate decision.

- [ ] T2 — Extend the analysis contract
  - Add `vehicles` to `AnalysisResponse` and the frontend mirror.
  - Document the non-additivity rule, denominator, and severity grain in
    `backend/docs/analysis-api.md`; add the type × severity definition to
    `backend/docs/dashboard-metrics.md`.

- [ ] T3 — Implement the aggregate
  - Add the by-type query with `COUNT(DISTINCT siniestro_id)`.
  - Add the type × severity query with the same distinct rule.
  - Compute shares in one pass; keep deterministic ordering (siniestros desc,
    then type).
  - Compute `withoutVehicleRows` from the scope.
  - Preserve the EXP-03 cause query and response shape.

- [ ] T4 — Add backend tests
  - Sum of type rows may exceed the total; assert the caveat and denominator.
  - Each type count equals an independent `COUNT(DISTINCT)` SQL check.
  - Severity matrix reconciles per type, including an unknown/coverage bucket.
  - `withoutVehicleRows` equals the known baseline for the full dataset.
  - Auth, validation, empty scope, payload size, and response shape.
  - Existing cause tests remain green.

- [ ] T5 — Build the Vehículos tab
  - Enable the tab and register `/analisis/vehiculos`.
  - Add the type table with rank, type, siniestros, and share.
  - Add the severity matrix with sticky header and mobile horizontal scroll.
  - Add a prominent non-additivity caveat and a coverage note for missing rows.
  - Use accessible table semantics, numeric alignment, and `tabular-nums`.
  - Handle loading, error, empty scope, and missing `vehicles` defensively.

- [ ] T6 — Verify and update the index
  - Compare type counts with SQL for national and one commune.
  - Prove shares can exceed 100% and that the UI does not total them.
  - Run backend tests/build and frontend lint/build.
  - Record evidence in the index.

## Acceptance criteria

- `GET /api/analysis` includes `vehicles` without changing `causes`.
- Each type count uses distinct siniestros and matches independent SQL.
- Type shares use the scope total and are labeled non-additive.
- The severity matrix reconciles per type and exposes missing severity.
- `withoutVehicleRows` is visible and not treated as a type.
- The Vehículos tab works with URL filters and shares one analysis request.
- Backend tests/build and frontend lint/build pass.

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
