# EXP-05 — Análisis: Personas

Brainstorm idea: #4 Personas
Execution order: 05
Risk: 3/5
Cost: 3/5
Depends on: EXP-03
Status: in_progress

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

- [x] T1 — Confirm fields, buckets, and mappings
  - Evidence (live DB before implementation): `persona` = `persona_id`,
    `siniestro_id`, `calidad_persona_id`, `sexo_id`, `resultado_persona_id`,
    `edad` (nullable smallint; no -1 sentinel; min 1, max 96; zero negative).
    All FKs NOT NULL in the 148,252 rows. `sexo` = 1 MASCULINO, 2 FEMENINO,
    3 SE IGNORA (unknown sex is catalog row 3, 6,448 nationally — verified by
    the independent verifier). `calidad_persona` has a fourth real role
    `SE DA A LA FUGA` (kept, not merged or dropped). `resultado_persona` =
    LEVE/ILESO/MENOS GRAVE/FALLECIDO/GRAVE — person-level, distinct from the
    siniestro severity buckets; the mapping is documented via §4/PER-2, never
    silently reused. `AGE_BANDS` and the age CASE copied verbatim from the
    dashboard service. The stop gate (person-only severity) did not fire.

- [x] T2 — Extend the analysis contract
  - Evidence: `persons` added to `backend/src/types/insights-api.ts` and
    mirrored in `frontend/src/lib/api/analysis.ts`; documented in
    `backend/docs/analysis-api.md` (§4.5 grain/MECE/reconciliation rules and
    the measured payload) with PER-2 added to `backend/docs/dashboard-metrics.md`
    including the measured age-boundary counts.

- [x] T3 — Implement the aggregates
  - Evidence: `backend/src/services/analysis-service.ts` adds EXACTLY TWO new
    aggregates (its own literal limit): sex × age (`GROUP BY sexo_id` + the
    verbatim dashboard CASE, `COUNT(*)` at person grain — not distinct
    siniestros) and role × outcome (`GROUP BY calidad, resultado`), both
    restricted through the siniestro join with the shared territory clause and
    fetched in the existing `Promise.all`. `rows`, `bySex`, `byAge`,
    `unknownAge`, `unknownSex` derive as marginals of the MECE matrices;
    `byAge` stays dense (six bands, zeros included) while matrix cells drop
    zeros — the rule is documented where it is implemented.

- [x] T4 — Add backend tests
  - Evidence: +6 tests in `backend/src/routes/analysis.test.ts` (both matrices
    sum to `rows`; `unknownAge`/`unknownSex` equal their marginals with a
    sexoId-3 fixture; dense `byAge` bands; canonical re-ordering of shuffled
    cells; person-grain double-row siniestro counts 2 persons; envelope shape
    and empty scope). The additive test re-asserts the exact pre-EXP-05
    `causes`/`vehicles` values with `persons` present. RED observed (7
    failures), then GREEN; the reconciliation assertion also caught a wrong
    fixture sum (480 vs 500) during development. `npm test` → 71/71.

- [x] T5 — Build the Personas tab
  - Evidence: `/analisis/personas` lazy route + enabled tab; the page is
    presentational (outlet context only); the person-vs-siniestro grain
    disclosure precedes every number; summary cards, sex bars, age bars (the
    `SE IGNORA`/`unknown` rows stay inside the bars), the 3×6 sex×age matrix
    and the role×outcome matrix with marginals-supplied totals (never
    recomputed from visible cells), the coverage note, the defensive
    `!data.persons` branch, and a skeleton mirroring the sections.

- [ ] T6 — Verify and update the index — checks done, browser pass pending
  - Evidence: independent verification (`gentle-ai-verify`, baseline
    `52fd101`): **0 blockers, 7/7 acceptance PASS, all 5 central claims
    VERIFIED**. MECE cell-by-cell vs SQL with zero mismatches in five scopes
    (national 18/19 cells, XIII 17/18, XIII-1 13/17, Q3 17/19, I-2 empty);
    person grain proved by XIII-1 (502 siniestros vs 1,065 persons in the same
    response; worst siniestro has 95 persons); boundaries measured
    (17→0-17:669, 18→18-25:1307, 25→2648, 26→2612, 40→2973, 41→2428,
    64→1293, 65→1221; CASE char-identical to `queryAgeBands`); dense vs zeros
    proved in XIII-1 (5+3 absent zero combos) and I-2; `SE DA A LA FUGA` ×
    `FALLECIDO` confirmed as a true structural zero (19 of 20 combos live).
    Payloads 7,003–23,657 B < 100 KB; auth/validation/cache unchanged;
    `/api/dashboard`, `/api/meta`, `/health`, causas and vehículos tabs
    untouched. Backend 71/71 + tsc clean; frontend lint clean and build clean
    (`analysis-persons-page-*.js` 14.73 kB / 4.98 kB gzip).
  - Risk: item 3 (a third additive extension of the consumed contract; the
    additivity of `causes`/`vehicles` is the load-bearing guarantee) and item 6
    for the tab. Mitigated by the envelope test, the verifier's code-identity
    proof of the untouched section builders, and the live totals check.
  - **Open:** browser pass (matrix reading at 360 px, unknown-row visibility,
    tab-switch filter carry). The one thing the verifier could not run host-side
    is a live byte-diff of the baseline payload (Postgres has no host port); it
    proved additivity by code identity instead — recorded honestly.

## Acceptance criteria

- [x] `GET /api/analysis` includes `persons` without changing existing sections
  (verifier: builders byte-unchanged; live national totals identical).
- [x] Every crosstab reconciles to `persons.rows` — zero cell mismatches in
  five live scopes.
- [x] Unknown age and sex are visible and match `unknownAge`/`unknownSex`
  (23,918 and 6,448, both as bars and coverage note).
- [x] Age boundaries match the approved buckets (measured at 17/18, 25/26,
  40/41, 64/65; CASE copied verbatim).
- [x] The tab never labels person counts as accidents and never mixes the two
  axes — grain disclosure precedes all numbers; every unit says "personas".
- [x] URL filters apply; the tab shares the layout's analysis request (single
  owner, key unchanged, tab link carries `location.search`); click-through is
  part of the browser pass.
- [x] Backend tests/build and frontend lint/build pass — 71/71, tsc, eslint,
  vite all clean.

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
- **2026-10-23 — T1-T5 implemented and verified:** T1 data gates passed live
  first (all FKs NOT NULL; unknown sex is catalog row 3; fourth role kept;
  outcome documented as person-level distinct from siniestro severity). Two new
  MECE aggregates, marginals derived, dense byAge vs dropped zero cells.
  Independent verification: 0 blockers, 7/7 PASS, all five central claims
  VERIFIED. Compose stack rebuilt both containers; `/analisis/personas` serves
  200. Status stays `in_progress` until the browser pass.

