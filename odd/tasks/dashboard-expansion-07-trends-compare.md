# EXP-07 — Análisis: Tendencias y Comparador

Brainstorm idea: #7 Tendencias / comparador
Execution order: 07
Risk: 4/5
Cost: 4/5
Depends on: EXP-03
Status: done

## Objective

Add a Tendencias tab with a 2025 monthly trend, a weekday × 3-hour heatmap for
the current scope, and a comparator for up to four territories. Extend
`GET /api/analysis` with `trend` and `weekdayHours`, and add `GET /api/compare`.
No multi-year, prediction, or synthetic index is introduced.

## Current state

- EXP-03 creates `/api/analysis` with `causes` and the `AnalysisLayout`.
- The dashboard has a monthly trend and a 3-hour hour-of-day distribution in its
  19-query aggregate, but no weekday dimension, no dedicated tab, and no
  comparator.
- 234 siniestros have an exact `00:00:00` time and are kept in the 00–03 bucket
  with a caveat; they are not reassigned.
- The frontend has the canonical region/commune catalog in
  `frontend/src/data/oversio-identifiers.json`.
- No schema change is needed; date and time already exist.

## Why

Trend and timing answer “when” and “compared to what”, which the current
single-scope view cannot. A comparator turns the dashboard into a decision tool
for prioritizing territories, while staying within 2025 data and aggregate
queries.

## Scope

1. Extend `GET /api/analysis` with:
   - `trend`: 12 monthly rows (`month`, `accidents`, `fatalities`), including
     zero months.
   - `weekdayHours`: 7 weekdays × 8 three-hour buckets (`weekday`, `bucket`,
     `accidents`), including zero cells. If the source has null times, add a
     single `unknown` bucket as a documented contract extension.
2. Add `GET /api/compare` with a maximum of 4 territory codes:
   - Scope follows the current filters: national compares regions; a selected
     region compares its communes.
   - Codes are the existing API/catalog identifiers: region roman numbers
     (`XV`, `I`, …) or commune identifiers (`XV-1`, `I-5`, …).
   - Comparator is disabled when a commune is selected.
   - Response: `schemaVersion`, `meta`, `level`, `period`, `territories` with
     `code`, `name`, `accidents`, `fatalities`, `share`, and a 12-point monthly
     `trend`.
   - Unknown or out-of-scope codes return `400`; do not silently drop them.
3. Enable the Tendencias tab at `/analisis/tendencias`.
4. Build a monthly trend (CSS bars or inline SVG with a table fallback) and a
   weekday × 3-hour heatmap with visible counts and an accessible table
   alternative.
5. Build the comparator UI with up to 4 selections from the local canonical
   catalog, a comparison table, and a small monthly series per territory.
6. Reuse the analysis request for the current scope; fetch `/api/compare` only
   when the user selects codes.
7. Keep every series reconciled to the scope totals and label the 00:00 caveat
   near the heatmap.

## Out of scope

- Multi-year, year-over-year, forecasts, prediction, or anomaly detection.
- Synthetic indices, clustering, or scoring models.
- Comparing more than 4 territories or exporting the comparison.
- Commune geometry or a new map layer.
- A chart library or animation framework.
- Schema changes, materialized views, or precomputed tables.
- CSV export of trend or compare (separate decision).

## Constraints and rules

- **2025 only:** the trend has 12 months; do not add a prior-year series.
- Monthly `accidents` sum to the scope total; `fatalities` sum to the scope
  fatality total. Zero months are rows, not gaps.
- The heatmap has 56 timed cells (7 × 8); their `accidents` plus any
  `unknown`-time coverage row sum to the scope total. The unknown row is not a
  57th grid cell.
- The `00–03` bucket includes the 234 exact-midnight records; disclose this and
  do not move them.
- Weekday labels use the approved Spanish labels; define whether the week starts
  on Monday or Sunday and keep API and UI aligned.
- `/api/compare` accepts 1–4 effective catalog identifiers, all at the current
  level; duplicates are de-duplicated before the 1–4 check. It never loads fact
  rows into Node.
- Comparator shares use the current scope total, not the sum of selected
  territories; label this.
- 1 GB / 1 shared vCPU: aggregate in SQL; one analysis request (its sections may
  use a small number of aggregate queries) plus one compare request. Payload
  <100 KB for analysis; compare ≤4 territories × 12 months. `statement_timeout`
  5 s.
- No predictions or causal claims; describe associations only.
- No PII, raw IDs, or stack traces.

## Tasks

- [x] T1 — Confirm time semantics and comparison scope
  - Verify the month and weekday derivation, the week start, and the 3-hour
    buckets against `backend/docs/dashboard-metrics.md`.
  - Verify the 234 midnight records and the missing-time count.
  - Confirm the comparator level rule (national → regions; region → communes;
    commune scope → disabled).

- [x] T2 — Extend the analysis contract
  - Add `trend` and `weekdayHours` to `AnalysisResponse` and the frontend mirror.
  - Document zero-filled series, the 00–03 caveat, and reconcile rules in
    `backend/docs/analysis-api.md`; add the weekday × 3-hour definition to
    `backend/docs/dashboard-metrics.md`.

- [x] T3 — Implement trend and heatmap aggregates
  - Add a monthly aggregate with zero-filled months.
  - Add a weekday × bucket aggregate with zero-filled cells and an unknown
    bucket if needed.
  - Keep `causes`, `vehicles`, and `persons` unchanged.

- [x] T4 — Implement `/api/compare`
  - Add the route through the shared guard.
  - Validate 1–4 codes against the current level; reject unknown/out-of-scope
    codes with `400`.
  - Return totals, share, and a 12-point monthly trend per territory.
  - Set `Cache-Control: private, max-age=60`; `401` before any query.
  - Document the endpoint in `backend/docs/analysis-api.md` or a dedicated
    `backend/docs/compare-api.md`; add the comparator-share definition to
    `backend/docs/dashboard-metrics.md`.

- [x] T5 — Add backend tests
  - Monthly sums equal scope totals; zero months are present.
  - Heatmap sums equal scope totals; midnight falls in 00–03; any unknown-time
    row reconciles.
  - Compare accepts 1–4 effective codes after de-duplication; rejects 0, 5+,
    unknown codes, and out-of-scope codes.
  - Compare totals reconcile with SQL; auth, validation, payload, and headers.
  - Existing analysis tests remain green.

- [x] T6 — Build the Tendencias tab
  - Enable the tab and register `/analisis/tendencias`.
  - Render the monthly trend with a table fallback and labels.
  - Render the heatmap with visible counts, keyboard/table access, and the
    00:00 caveat.
  - Build the comparator using the local catalog: up to 4 selections, level-aware
    labels, disabled state for commune scope, loading/error/empty states.
  - Render the comparison table and per-territory monthly series; label shares
    as scope shares.
  - Avoid a chart library; use CSS/inline SVG with accessible fallbacks.

- [x] T7 — Verify and update the index
  - Reconcile trend, heatmap, and compare with independent SQL at national and
    region scope.
  - Check the 4-code limit, out-of-scope rejection, and commune disabled state.
  - Run backend tests/build and frontend lint/build.
  - Record evidence in the index.

## Acceptance criteria

- `GET /api/analysis` includes `trend` and `weekdayHours`; existing sections are
  unchanged.
- Monthly and 56-cell heatmap series reconcile to scope totals; zero months and
  cells appear, and any unknown-time row is shown separately.
- The 00:00 caveat is visible; midnight records remain in 00–03.
- `/api/compare` supports 1–4 in-scope codes and rejects invalid/out-of-scope
  requests with `400`.
- The comparator is disabled when a commune is selected.
- The tab works with URL filters, shares the analysis request, and uses no chart
  library.
- Backend tests/build and frontend lint/build pass.

## Checks

- `cd backend && npm test && npm run build`
- `cd frontend && npm run lint && npm run build`
- SQL: monthly sums, weekday × bucket sums, midnight count, unknown time count.
- SQL: compare totals and monthly series for 1, 2, and 4 regions/communes.
- `curl` `/api/compare` with 0, 1, 4, 5, duplicate, unknown, and out-of-scope
  codes.
- Manual: heatmap accessibility, comparator disabled state, 360px layout.
- Payload: analysis <100 KB; compare response within the documented cap.

## User decision gates

- **Comparison scope:** inferred from filters (national → regions, region →
  communes, commune → disabled). Confirm before T4; an explicit `level` param is
  the alternative.
- **Max 4:** locked for v1. More requires a new ODD and a payload review.
- **Week start:** Monday vs Sunday affects the heatmap and API labels. Confirm
  before T3.
- **Visualization:** CSS/inline SVG with table fallbacks; no chart library.
  Confirm if a richer chart is required.

## Delivery

- One additive analysis section, one new compare endpoint, tests, and one tab.
- Do not push, open a PR, or deploy without explicit authorization.
- Update the index status and evidence after verification.

## Next step

After EXP-07, the approved program is complete. Any multi-year, prediction, or
raw export request requires a new ODD and data-source review.

## Progress

- **2026-10-23 — ODD created:** trend, heatmap, comparator, caps, and acceptance
  defined; implementation not started.
- **2026-10-24 — L1 (kickoff, verbatim):** "vamos por el EXP 7" + "okey, estas
  modo orquestador". Branch `feat/dashboard-expansion-07-trends` created from
  `main` (`5beba23`, EXP-06 merged via PR #17). Execution continues the
  user-ordered direct inline mode from EXP-06 (no writer/verifier subagents;
  parent builds and verifies).
- **2026-10-24 — L2 (T1 done, data verification + gates closed):**
  - SQL evidence on the live compose DB: `siniestro.hora` is **NOT NULL** in
    all 73,081 rows → the ODD's `unknown`-bucket branch does **not** fire;
    `weekdayHours` is exactly 56 dense cells (7×8). Exactly **234** rows have
    `hora = 00:00:00` (they stay in 00–03 with disclosure). `EXTRACT(ISODOW
    FROM fecha)` yields 1..7 cleanly (Mon=1). No national zero-accident months
    in 2025, but dense zero-filled months stay mandatory for filtered scopes.
  - User decision gates closed (user chose the proposed defaults): **week
    starts Monday** (ISO 1=Lunes…7=Domingo, es-CL labels client-side);
    **comparison level inferred from filters** (national→regions,
    region→communes, commune→UI hides comparator and the API answers `400`);
    **`codes` is a comma list, de-duplicated before the 1–4 check**;
    **comparator share uses the scope total, not the selection sum**; max 4 and
    no chart library remain locked by the ODD.
  - T1 semantics also fix the API shapes recorded in the plan: `trend.months`
    (12 dense rows + totals), `weekdayHours.cells` (56 dense cells +
    `midnightArtifactCount` + total), compare envelope `{schemaVersion, meta,
    level, filters, territories[]}` with a 12-point `trend` per territory.
- **2026-10-24 — Route declaration:** all tasks direct inline (parent); the
  Writer trigger never fires because the user ordered build-mode explicitly
  (L1). Slices: backend-analysis sections → backend-compare → frontend tab.
- **2026-10-24 — L3 (T2/T3 evidence, analysis sections implemented):**
  backend-implemented test-first. `analysis.test.ts` extended with 7 EXP-07
  tests over a `TimeFixture` (sparse monthly rows + sparse weekday×bucket cells
  + midnight count) and a consistent fixture (causes total = monthly sum =
  cell sum = 10). RED observed (trend/weekdayHours absent → 6 fails), then
  GREEN. `insights-api.ts` gained `AnalysisTrendSection` + `
  AnalysisWeekdayHoursSection`; `createAnalysisService` added
  `loadMonthlyTrend` + `loadWeekdayHourCells` to `Promise.all` and two pure
  builders: `buildTrendSection` (dense UTC months over `from..to`, the
  dashboard's approved `SER-1`/denseMonths walk) and
  `buildWeekdayHoursSection` (56 dense cells, weekday 1..7 × buckets 0..21,
  Monday first). Prisma repo reuses `siniestroTerritoryClause`/`countNumber`;
  monthly = `to_char(fecha,'YYYY-MM')` count + COALESCE fatality sum; heatmap =
  one `GROUP BY EXTRACT(ISODOW), (HOUR/3)*3` aggregate plus a paired
  `COUNT(*) FILTER (hora = TIME '00:00:00')`. `causes`/`vehicles`/`persons`
  untouched (guard key-list updated additively to 8 keys). Frontend mirror
  `lib/api/analysis.ts` gained the same two sections (required + defensive
  comment, matching EXP-04/05). Docs: `analysis-api.md` §4.6/§4.7 + additive
  rule + cache note; `dashboard-metrics.md` §3.13 (`TRE-1`, `HOU-2`).
  `npm test` → 93/93 (86 + 7); `npm run build` → exit 0. Frontend lint 0
  errors, build exit 0.
- **2026-10-24 — L4 (live reconciliation, analysis sections):** rebuilt
  backend; `GET /api/analysis` national now returns 12 dense months summing
  exactly `73,081`/`1,507` (= `causes.totalAccidents` = panel KPIs) and 56
  heatmap cells summing `73,081`, `midnightArtifactCount` 234. Cell (5,15) =
  2,265 and (1,0) = 361 matched independent SQL; months 2025-01/02 matched SQL
  row-for-row (6040/143, 5458/118). Q3 scope returns exactly Jul/Aug/Sep
  summing 17,767 in both sections with its own midnight count 64. National
  payload 26,809 bytes (< 100 KB cap). Scratch under `/tmp/opencode/exp07/`
  (outside the repo).
- **2026-10-24 — L5 (T4/T5 evidence, /api/compare):** direct build,
  test-first. `src/routes/compare.test.ts` written first (RED: module
  missing, then 3 assertion corrections that were TEST errors: 5 entries of
  one code de-dup to 4 and pass the cap — the cap test now uses 5 DISTINCT
  codes; a two-region selection legitimately sums to ~100 because it covers
  the whole scope — the assertion now pins each share against the scope total
  73,081; `regionId=99` is caught by the schema before the service, so the
  not_found test uses an in-range unknown id). Semantics fixed while writing:
  shape-invalid → `invalid_format` before any query; right shape but not in
  the level's catalog → `not_found`; commune code whose roman prefix is not
  the selected region → `out_of_scope`; commune scope → `not_supported` before
  any query; trends runs only AFTER every code passed membership (totals
  aggregate doubles as the level catalog: one read gives codes, names, totals
  and the scope denominator). New `types/compare-api.ts`,
  `services/compare-service.ts` (dense months reuse the approved UTC walk;
  `percent()` shared), `routes/compare.ts` (shared guard; success overwrites
  to `private, max-age=60`), `app.ts` registration + `compareService` seam,
  test file added to the explicit `test` script. Docs: new
  `backend/docs/compare-api.md`, `dashboard-metrics.md` §3.14 (`CMP-1`), and
  `analysis-api.md` §8 rewritten to point at both new endpoints.
  `npm test` → 109/109 (93 + 16); `npm run build` → exit 0.
- **2026-10-24 — L6 (live reconciliation, compare):** rebuilt backend.
  `codes=XIII,XV` → XIII `20293/350 share 27.8`, XV `1603/27 share 2.2` (over
  national total 73,081), 12 dense points, XV `2025-01=127` matched SQL;
  region XIII `codes=XIII-32,XIII-1` → `1662 → 8.2` and `502 → 2.5` against
  the REGION total (not the selection), both matching SQL exactly. Rejection
  matrix via curl: dup-under-cap `200`, `XX` → `not_found`, `xiii` →
  `invalid_format`, absent → `required`, `regionId=13&codes=XV-1` →
  `out_of_scope`, commune scope → `not_supported`, `from=2026` →
  `out_of_range`; headers `private, max-age=60` + nosniff, payload 1,717 B,
  no token → `401`.
- **2026-10-24 — L7 (T6 evidence, frontend):** `lib/api/compare.ts` (mirror
  types + auth'd fetch), `hooks/use-compare.ts` (level derivation + opt-in
  query keyed by filters+codes), three components under
  `components/analysis/`: `trend-monthly-bars` (counts printed per column,
  `details`-disclosed month/fatality table), `weekday-hour-heatmap` (the
  matrix IS a `<table>` with day/bucket/grand totals and the 00:00 disclosure
  line; shading is six decorative `color-mix` steps in `index.css` — never
  the only channel), `territory-comparator` (chips from the local catalog,
  aria-pressed, max 4 with disabled rest, level pruning DONE BY DERIVATION
  not by a setState-in-effect (eslint `react-hooks/set-state-in-effect`),
  sparkline `aria-hidden` + explicit "Mes pico" column, shares labeled over
  scope). Page `analysis-trends-page.tsx` presentational, defensive on stale
  server sections; tab enabled in order in `analysis-layout.tsx`; lazy route
  in `App.tsx`; `monthLabel` shared in `lib/month-label.ts`.
  `npm run lint` → 0 errors; `npm run build` → exit 0;
  chunk `analysis-trends-page-*.js` emitted.
- **2026-10-24 — L8 (commits, user-approved):** committed on
  `feat/dashboard-expansion-07-trends` after explicit permission — `3ecd19e`
  (backend trend + weekdayHours), `68f8ea7` (`/api/compare`), `a06331b`
  (Tendencias tab). Suite 109/109, `tsc` build exit 0, frontend lint 0 / build
  exit 0; docker stack rebuilt (`:3200` and `/health` 200). No push.
  Remaining for T7 close: the browser pass (heatmap accessibility, comparator
  disabled-at-commune state, 360 px layout) and the index status flip.
- **2026-10-24 — L9 (T7 closed, slice done):** the user verified the
  Tendencias tab in the browser and ordered the close ("cierra EXP-07"),
  committing the L8 evidence entry themselves (`49056ff`). Final state on
  `feat/dashboard-expansion-07-trends`: `86037ab` (footer nav) + `3ecd19e` +
  `68f8ea7` + `a06331b` + `49056ff`, nothing pushed. Backend 109/109 + tsc OK,
  frontend lint/build OK, live SQL reconciliation recorded in L4/L6. This was
  the last feature ODD of the dashboard-expansion program (EXP-00…EXP-07 all
  done). Manual 360 px/keyboard details rest on the shared patterns already
  browser-approved in EXP-02–06; the new browser pass accepted the tab as-is.
