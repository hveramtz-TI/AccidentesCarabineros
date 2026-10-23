# EXP-03 — Análisis: Causas

Brainstorm idea: #6 Causas
Execution order: 03
Risk: 3/5
Cost: 3/5
Depends on: EXP-00
Status: planned

## Objective

Create the Análisis area with a shared tab layout and implement the Causas tab
over every catalog cause. Establish the `GET /api/analysis` contract that later
tabs extend additively.

## Current state

- The dashboard shows a “Top 10 causas” chart/section only; there is no route for
  the full cause catalog.
- No `/api/analysis` endpoint exists.
- `backend/docs/dashboard-metrics.md` defines causes as one cause per siniestro
  and warns that the Top 10 omits the long tail.
- The catalog is expected to contain 70 causes; some may have zero accidents in
  the filtered scope.
- No schema change is needed; the data is already relational.

## Why

The Top 10 hides most of the catalog and cannot answer “how many accidents did
cause X have?”. A dedicated tab with all causes, shares, and cumulative share
makes the long tail visible and gives the other analysis tabs a shared, tested
contract instead of four ad-hoc endpoints.

## Scope

1. Add `GET /api/analysis` as a protected, read-only endpoint with a shared
   filter schema and a versioned response:
   `schemaVersion`, `meta`, `filters`, and `causes`.
2. `causes` returns every catalog cause with `causeId`, `name`, `accidents`, and
   `share`; include zero-accident causes when the catalog has them.
3. Order by accidents descending, then name; do not load fact rows into Node.
4. Add `AnalysisLayout` with tabs Personas, Vehículos, Causas, Tendencias. Only
   Causas is enabled in this ODD; the others stay disabled until EXP-04/05/07.
5. Redirect `/analisis` to `/analisis/causas`.
6. Build `/analisis/causas` with a scope summary, a top-10 proportional bar list,
   a client-side cause search, and a full catalog table (expected 70 rows) with
   rank, cause,
   accidents, share, and cumulative share.
7. Use CSS/inline width for the bars; do not add a chart library.
8. `AnalysisLayout` owns the query and shares data/status with tabs through the
   router outlet context; tab pages stay presentational.
9. Preserve URL filters from EXP-00 and the shared loading/error/empty states.

## Out of scope

- Personas, Vehículos, or Tendencias content; only their disabled tabs.
- A new chart library, SVG chart framework, or animation system.
- Cause-to-person or cause-to-vehicle crosstabs.
- Schema changes, materialized views, or a second endpoint per tab.
- CSV export (EXP-06) or a comparator (EXP-07).

## Constraints and rules

- `GET /api/analysis` must be additive: later sections do not rename or remove
  `causes`.
- One cause per siniestro; the sum of `causes.rows[].accidents` must equal
  `causes.totalAccidents` and the filtered dashboard accident total.
- `share` is accidents / `totalAccidents`; format with one decimal in `es-CL`.
- Cumulative share is the running sum in the API’s descending order; label it
  clearly.
- Zero-accident catalog causes appear with `0` and `0.0%`, not as missing.
- The endpoint reuses the dashboard API query contract (`from`, `to`, `regionId`,
  `communeId`) and the frontend’s period→range mapping. API validation and error
  behavior match `/api/dashboard`; the frontend URL normalizes unknown values
  before calling.
- 1 GB / 1 shared vCPU: one aggregate query, no per-row loops, payload <100 KB,
  `statement_timeout` 5 s.
- No raw IDs beyond `causeId`, no PII, no stack traces.
- No frontend test runner; checks are lint/build plus manual browser checks.

## Tasks

- [ ] T1 — Define the analysis contract
  - Add `backend/src/types/insights-api.ts` (or equivalent) with
    `AnalysisResponse` and the `causes` section.
  - Mirror the types in `frontend/src/lib/api/analysis.ts`.
  - Document the endpoint in `backend/docs/analysis-api.md`, including the
    additive-section rule and filter semantics; add the cumulative-share
    definition to `backend/docs/dashboard-metrics.md`.

- [ ] T2 — Implement `/api/analysis`
  - Reuse the shared Bearer/error/query guard from EXP-00.
  - Add the cause aggregate query and catalog join.
  - Return every catalog cause (expected 70); compute total and share in SQL or
    a single pass.
  - Set `Cache-Control: private, max-age=60`; `401` before any query.
  - Add a query plan check; ensure no fact-row fetch into Node.

- [ ] T3 — Add backend tests
  - Auth: missing/invalid token; service not called.
  - Validation: `from`/`to`/`regionId`/`communeId` behavior matches
    `/api/dashboard`; unknown IDs are rejected, not silently dropped.
  - Sum of causes equals `totalAccidents` and the dashboard total.
  - One row per catalog cause (expected 70); zero causes included; deterministic
    ordering.
  - Empty scope returns `totalAccidents: 0` and zero-valued catalog rows.
  - Payload size and response shape.

- [ ] T4 — Build the analysis shell
  - Add routes `/analisis` → redirect, `/analisis/causas`, and a shared
    `AnalysisLayout`.
  - Render the four tabs with `NavLink`; disabled tabs use the existing
    “(Próximamente)” pattern.
  - Render the filter bar and scope summary once in the layout.
  - Share query data/status via outlet context; avoid duplicate requests on tab
    switch.

- [ ] T5 — Build the Causas tab
  - Add a scope summary (total, causes with accidents, leading cause).
  - Add a top-10 proportional bar list with accessible labels and no chart
    dependency.
  - Add a search input that filters by cause name, case- and accent-insensitive.
  - Add the full table: rank, cause, accidents, share, cumulative share; sticky
    header, numeric alignment, mobile horizontal scroll.
  - Handle zero rows, zero-accident causes, loading, error, and retry.

- [ ] T6 — Verify and update the index
  - Compare totals with `/api/dashboard` and independent SQL.
  - Run backend tests/build and frontend lint/build.
  - Record evidence in the index.

## Acceptance criteria

- `/analisis` redirects to `/analisis/causas`.
- Every catalog cause is available (expected 70); the sum equals the filtered
  accident total.
- Zero-accident causes are visible as `0`, not omitted.
- Search, sorting, cumulative share, and top-10 bars are correct and accessible.
- Only Causas is enabled; other tabs are visibly disabled.
- The layout issues one analysis request per filter change, not one per tab.
- `GET /api/analysis` enforces Bearer, validates filters, and stays under the
  payload cap.
- Backend tests/build and frontend lint/build pass.

## Checks

- `cd backend && npm test && npm run build`
- `cd frontend && npm run lint && npm run build`
- `curl` `/api/analysis` with valid/invalid/missing Bearer and each filter.
- SQL: sum by cause vs `kpis.totalAccidents` for national and one commune.
- Manual: full catalog (expected 70 rows), zero cause, search accents, sort,
  keyboard, 360px width.
- Payload size: `curl ... | wc -c` < 100 KB.

## User decision gates

- **Catalog completeness:** expected 70 causes including zero-accident ones. If
  the catalog differs, confirm the expected count before T2.
- **Default tab:** `/analisis` redirects to Causas. Confirm if another tab should
  become the default once all tabs exist.
- **Visualization:** CSS bars, no chart library. Confirm if a richer chart is
  required; that would be a separate dependency decision.

## Delivery

- One backend endpoint + tests, one shared shell, one tab.
- Do not push, open a PR, or deploy without explicit authorization.
- Update the index status and evidence after verification.

## Next step

After EXP-03, execute EXP-04 (Vehículos, order 04), then EXP-05 (Personas, order
05). EXP-06 (Informes, order 06) follows without depending on this contract;
EXP-07 (Tendencias, order 07) is the final feature and also extends `/api/analysis`.

## Progress

- **2026-10-23 — ODD created:** analysis contract, Causas tab, and additive rules
  defined; implementation not started.
