# EXP-05 — Análisis: Personas

Brainstorm idea: #4 Personas
Execution order: 05
Risk: 3/5
Cost: 3/5
Depends on: EXP-03
Status: planned

## Objective

Add a Personas tab with person-grain demographics and outcomes. Extend
`GET /api/analysis` with a `persons` section covering sex, age, sex × age, and
role × outcome, always keeping unknown values visible and never mixing person
counts with accident counts.

## Current state

- EXP-03 creates `/api/analysis` with `causes` and the `AnalysisLayout`.
- The dataset has 148,252 person rows for 2025.
- 23,918 person rows (16.1%) have no age.
- Sex and role/outcome fields contain unknown or missing values.
- The dashboard exposes person totals plus `calidad`, `sexo`, and `ageBands`
  aggregates, but no sex × age or role × outcome crosstabs.
- No schema change is needed; the person table already has the fields.

## Why

Personas is the human-impact view: who is hurt matters more than how many
vehicles were involved. A dedicated tab prevents the common mistake of reading
person counts as accident counts and makes coverage gaps (unknown age/sex)
explicit instead of hiding them in a chart.

## Scope

1. Extend `GET /api/analysis` with a `persons` section:
   `rows`, `unknownAge`, `unknownSex`, `bySex`, `byAge`, `bySexAge`, and
   `byQualityOutcome`.
2. `bySex`: `sexId`, `name`, `persons`, `share`; include the catalog’s unknown
   row rather than dropping it.
3. `byAge`: `bucket`, `persons`, `share`; reuse the existing `AGE_BANDS`:
   `0-17`, `18-25`, `26-40`, `41-64`, `65+`, and `unknown`.
4. `bySexAge`: `sexId`, `name`, `bucket`, `persons`; sums to `rows`.
5. `byQualityOutcome`: `qualityId`, `qualityName`, `outcomeId`, `outcomeName`,
   `persons`; include unknown for either dimension; sums to `rows`.
6. Every crosstab uses person grain and must reconcile to `persons.rows`.
7. Enable the Personas tab at `/analisis/personas`; Tendencias remains disabled.
8. Build a summary, a sex × age matrix, a role × outcome matrix, and CSS bars
   for sex/age. No chart library.
9. Display unknown age/sex as visible rows and as coverage notes; do not infer or
   impute.

## Out of scope

- Accident-level KPIs or mixing person counts with siniestro counts.
- Name, ID, address, or any PII.
- Injury severity prediction, risk models, or synthetic indices.
- A new endpoint per demographic view.
- A chart library, map geometry, or animation system.
- Schema changes or new catalogs.
- CSV export (EXP-06).

## Constraints and rules

- **Person grain:** one row = one person. Do not count distinct siniestros for
  person totals.
- **No mixed axes:** labels must say “personas”, never “siniestros”, for these
  counts. Do not place person counts on an accident chart axis.
- **Unknowns are data:** keep `unknown` visible; do not drop rows. `unknownAge`
  and `unknownSex` must match the corresponding buckets.
- **Age buckets:** reuse the existing `AGE_BANDS` (`0-17`, `18-25`, `26-40`,
  `41-64`, `65+`, `unknown`) from the dashboard service. Changing the bands is a
  metric-definition change and requires approval.
- **Outcome mapping:** use the approved severity labels; if person-level outcome
  differs from siniestro-level severity, document the mapping and keep it
  person-level here.
- Shares use `persons.rows` for the current scope; buckets sum to 100% within
  rounding.
- 1 GB / 1 shared vCPU: aggregate in SQL, at most two queries, no fact rows in
  Node, payload <100 KB, `statement_timeout` 5 s.
- No PII or raw person identifiers in the response.

## Tasks

- [ ] T1 — Confirm fields, buckets, and mappings
  - Verify the person table fields for sex, age, role, and outcome.
  - Confirm the existing `AGE_BANDS` and the unknown labels.
  - Verify 23,918 unknown ages and the unknown sex count for 2025.
  - Confirm `resultadoPersona` labels and person-level outcome semantics against
    the siniestro-level severity used in EXP-04.

- [ ] T2 — Extend the analysis contract
  - Add `persons` to `AnalysisResponse` and the frontend mirror.
  - Document grain, buckets, unknown handling, and reconciliation rules in
    `backend/docs/analysis-api.md`; add the sex × age and role × outcome
    definitions to `backend/docs/dashboard-metrics.md`.

- [ ] T3 — Implement the aggregates
  - Add the sex, age, sex × age, and role × outcome aggregates.
  - Use SQL `CASE` for age buckets; do not fetch person rows into Node.
  - Keep deterministic ordering: sex/age by approved order, role/outcome by
    count descending.
  - Preserve `causes` and `vehicles` unchanged.

- [ ] T4 — Add backend tests
  - `bySex`, `byAge`, `bySexAge`, and `byQualityOutcome` each sum to `rows`.
  - `unknownAge` equals the `unknown` age bucket; same for sex.
  - Age bucket boundaries are correct (17/18, 25/26, 40/41, 64/65).
  - No person is double-counted within a crosstab.
  - Auth, validation, empty scope, payload size, and response shape.
  - Existing cause and vehicle tests remain green.

- [ ] T5 — Build the Personas tab
  - Enable the tab and register `/analisis/personas`.
  - Add summary cards with explicit “personas” labels.
  - Add sex and age tables with CSS bars and unknown rows.
  - Add the sex × age and role × outcome matrices with sticky headers and
    horizontal scroll on mobile.
  - Add coverage notes for unknown age/sex.
  - Handle loading, error, empty scope, and missing `persons` defensively.

- [ ] T6 — Verify and update the index
  - Compare all counts with independent SQL at national and commune scope.
  - Check unknown counts and age boundaries against SQL.
  - Run backend tests/build and frontend lint/build.
  - Record evidence in the index.

## Acceptance criteria

- `GET /api/analysis` includes `persons` without changing existing sections.
- Every crosstab reconciles to `persons.rows`.
- Unknown age and sex are visible and match `unknownAge`/`unknownSex`.
- Age boundaries match the approved buckets.
- The tab never labels person counts as accidents and never mixes the two axes.
- URL filters apply; the tab shares the layout’s analysis request.
- Backend tests/build and frontend lint/build pass.

## Checks

- `cd backend && npm test && npm run build`
- `cd frontend && npm run lint && npm run build`
- SQL: `rows`, unknown age/sex, each age bucket, sex × age, role × outcome.
- SQL: boundary rows for ages 17/18, 25/26, 40/41, 64/65.
- Manual: unknown rows, empty scope, 360px matrices, keyboard navigation.
- Payload: analysis response <100 KB.

## User decision gates

- **Age buckets:** existing `0-17`, `18-25`, `26-40`, `41-64`, `65+`, `unknown`.
  Reuse them; a different grouping changes the contract and needs approval.
- **Sex labels:** Femenino, Masculino, Sin dato (unknown). Confirm wording and
  whether unknown should be shown in the main bars or only as a note.
- **Role/outcome mapping:** confirm the source labels map to conductor,
  pasajero, peatón, and the approved outcomes; do not infer missing roles.

## Delivery

- One additive backend section + tests and one tab.
- Do not push, open a PR, or deploy without explicit authorization.
- Update the index status and evidence after verification.

## Next step

After EXP-05, execute EXP-06 (Informes, order 06); it remains independent of the
analysis contract. EXP-07 (Tendencias, order 07) is the final feature and may
extend `/api/analysis` additively.

## Progress

- **2026-10-23 — ODD created:** person-grain contract, demographic crosstabs,
  unknown handling, and acceptance defined; implementation not started.
