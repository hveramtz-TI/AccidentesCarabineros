# EXP-03 — Análisis: Causas

Brainstorm idea: #6 Causas
Execution order: 03
Risk: 3/5
Cost: 3/5
Depends on: EXP-00
Status: in_progress

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

- [x] T1 — Define the analysis contract
  - Evidence: `backend/src/types/insights-api.ts` (`AnalysisResponse`, cause
    rows, service/repository seams), mirrored in
    `frontend/src/lib/api/analysis.ts`; `backend/docs/analysis-api.md` documents
    the payload field by field, the additive-section rule, filters, ordering,
    cache, and errors; the cumulative-share definition was added to
    `backend/docs/dashboard-metrics.md` (`CAU-2`).

- [x] T2 — Implement `/api/analysis`
  - Evidence: `backend/src/routes/analysis.ts` registers the route through
    `applyApiGuard` (401 before any query) and overwrites the guard's `no-store`
    with `private, max-age=60` on success only.
    `backend/src/services/analysis-service.ts` runs ONE parameterless aggregate
    (`causa LEFT JOIN siniestro` with date/territory restrictions **in the JOIN
    condition**, which is what keeps the zero-accident rows). Validation reuses
    `validateDashboardFilters`, so the 400 contract matches `/api/dashboard`.
    Plan measured: `Sort → HashAggregate (rows=70) → Hash Right Join`, 18.6 ms
    national / 2.6 ms commune; no fact rows enter Node.

- [x] T3 — Add backend tests
  - Evidence: `backend/src/routes/analysis.test.ts`, 15 tests: auth before
    service and before validation, fail-closed without `UUID_CONNECTION`,
    default filters plus cache, malformed/out-of-range/inverted filters matching
    the dashboard contract, unknown region/commune → 400, 70 rows reconciled with
    the total, empty scope, one-decimal shares, commune→region echo, payload cap,
    sibling routes still reachable, sanitized failure, tie-break by name with
    zero rows keeping `share: 0`. Added to the explicit `npm test` list.
    `npm test` → 57 tests, 57 pass, 0 fail.

- [x] T4 — Build the analysis shell
  - Evidence: `frontend/src/App.tsx` `Navigate to="causas" replace` under
    `/analisis` plus lazy `analysis-layout`; `AnalysisLayout` owns the single
    `useAnalysisQuery` and shares data through the outlet context; the tabs use
    `NavLink` and preserve the current query string; the disabled tabs render
    `<button disabled aria-disabled>` with “(Próximamente)”; the layout renders
    the filter bar and scope line once; the Análisis nav item is enabled and
    also carries the active `search`.

- [x] T5 — Build the Causas tab
  - Evidence: `analysis-scope-summary.tsx` (total, causes with accidents,
    leading cause), `analysis-cause-bars.tsx` (top-10 with plain CSS widths, the
    bar is `aria-hidden` and every row exposes rank/name/count/share as text),
    `analysis-causes-table.tsx` (NFD + combining-mark strip + `es-CL` lowercase
    search, sticky header, `tabular-nums`, one-decimal shares, horizontal scroll
    inside the card). Rank and cumulative share are derived from the FULL 70-row
    order in `analysis-causes-page.tsx`, so a search narrows the visible rows
    without renumbering or recomputing the cumulative.

- [ ] T6 — Verify and update the index — data/build checks done, browser pass pending
  - Evidence: live `/api/analysis` vs `/api/dashboard` and independent SQL agree
    on every probed scope: national `73081`, `regionId=13` `20293`, `communeId=XIII-1`
    `502` (34 zero causes), Q3 `17767`, empty `I-2` `0` with all 70 rows at
    `share: 0`; `communeId` wins over `regionId` and the response echoes
    `regionId: 13`; payload 6.5–6.8 KB; per-cause rows byte-identical to SQL.
    Independent verification (`gentle-ai-verify`, baseline `93d793d`): **0
    blockers**, all 8 acceptance criteria PASS. Two advisories were fixed here
    (tab and nav links now preserve the URL filters; the two proposed regression
    tests were added). Backend 57/57 and build clean; frontend lint clean and
    build clean (`analysis-layout` 5.59 kB, `analysis-causes-page` 12.34 kB);
    the compose stack serves `/analisis` → `200` and the chunk as
    `application/javascript` (12,347 bytes).
  - Risk: item 3 (a new public contract that later tabs must extend additively)
    and item 6 (no frontend test runner can catch a tab, rank, or search
    regression). Mitigated by 15 route tests, the live/SQL reconciliation, and
    the source-level probes the verifier ran.
  - **Declared gap — `statement_timeout`:** the ODD asks for 5 s and the repo
    configures none (`SHOW statement_timeout` → `0`) because the shared Prisma
    client is also used by the importer. Observed latency is 2.6–18.6 ms, so no
    realistic input approaches the limit; adding a global timeout would change
    importer behaviour and is left as a separate decision rather than smuggled
    into this slice.

## Acceptance criteria

- [x] `/analisis` redirects to `/analisis/causas` (`Navigate replace`, so Back
  does not bounce); the rendered redirect is part of the browser pass.
- [x] Every catalog cause is available (70 on every scope) and the sum equals the
  filtered accident total — API, `/api/dashboard`, and SQL agree on all five
  probed scopes.
- [x] Zero-accident causes are visible as `0`, not omitted (34 rows in XIII-1, all
  70 in the empty `I-2` scope, each with `share: 0`).
- [x] Search, sorting, cumulative share, and top-10 bars are correct and
  accessible — accent- and case-insensitive search verified by logic probe;
  rank/cumulative stay those of the full order while searching; bars are CSS-only
  with text labels.
- [x] Only Causas is enabled; the other tabs are visibly disabled with
  “(Próximamente)” and no header/mobile-menu entry was added.
- [x] The layout issues one analysis request per filter change, not one per tab
  (single `useAnalysisQuery` in the layout; the query key is the four filters).
- [x] `GET /api/analysis` enforces Bearer, validates filters identically to
  `/api/dashboard`, and stays under the payload cap (<100 KB, measured 6.5 KB).
- [x] Backend tests/build and frontend lint/build pass.

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
- **2026-10-23 — T1-T5 implemented and verified:** catalog gate confirmed first
  (70 causes, `nombre_normal` is the legible label, `comuna` has no `identifier`
  column). Endpoint, tests, docs, shell, and Causas tab built; independent
  verification returned 0 blockers with all 8 acceptance criteria PASS. Fixed its
  two actionable advisories (URL filters preserved across tab/nav links, two
  regression tests added) and declared the missing `statement_timeout` as a gap
  instead of claiming it. Status stays `in_progress` until the browser pass
  (redirect, disabled tabs, search accents, keyboard sorting, 360 px).
- **2026-10-23 — Visual review applied (items 1-4):** after a code-level design
  review of the Causas tab: (1) the loading skeleton now mirrors the real page
  (summary + bars + table blocks) instead of three cards, removing the large
  layout jump on resolve; (2) the Top-10 section is not drawn at all for an
  empty scope — its old `No hay siniestros...` paragraph duplicated the shared
  `DashboardStatus` notice; (3) table rows gained `hover:bg-muted/40` so the eye
  can track a wrapped cause name to its numbers; (4) a Pareto boundary row marks
  where the cumulative share first reaches 80 % — nationally that is row 10
  (`80.1 %` at `SEÑALIZACION, DESOBEDECER SEÑAL CEDA EL PASO`), which turns the
  long-tail argument into something visible. The marker inherits the rank/cum
  honesty rule: it is positioned by the full API order and disappears when the
  search hides the boundary row rather than misleading about a subset. Items 5
  (bar scaling by share) and 6 (capitalized display names) stay open decisions.
  `npm run lint` and `npm run build` pass (`analysis-causes-page` 14.10 kB /
  4.64 kB gzip); container rebuilt, chunk confirmed as `application/javascript`.

