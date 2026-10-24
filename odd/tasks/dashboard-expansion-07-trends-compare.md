# EXP-07 — Análisis: Tendencias y Comparador

Brainstorm idea: #7 Tendencias / comparador
Execution order: 07
Risk: 4/5
Cost: 4/5
Depends on: EXP-03
Status: planned

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

- [ ] T1 — Confirm time semantics and comparison scope
  - Verify the month and weekday derivation, the week start, and the 3-hour
    buckets against `backend/docs/dashboard-metrics.md`.
  - Verify the 234 midnight records and the missing-time count.
  - Confirm the comparator level rule (national → regions; region → communes;
    commune scope → disabled).

- [ ] T2 — Extend the analysis contract
  - Add `trend` and `weekdayHours` to `AnalysisResponse` and the frontend mirror.
  - Document zero-filled series, the 00–03 caveat, and reconcile rules in
    `backend/docs/analysis-api.md`; add the weekday × 3-hour definition to
    `backend/docs/dashboard-metrics.md`.

- [ ] T3 — Implement trend and heatmap aggregates
  - Add a monthly aggregate with zero-filled months.
  - Add a weekday × bucket aggregate with zero-filled cells and an unknown
    bucket if needed.
  - Keep `causes`, `vehicles`, and `persons` unchanged.

- [ ] T4 — Implement `/api/compare`
  - Add the route through the shared guard.
  - Validate 1–4 codes against the current level; reject unknown/out-of-scope
    codes with `400`.
  - Return totals, share, and a 12-point monthly trend per territory.
  - Set `Cache-Control: private, max-age=60`; `401` before any query.
  - Document the endpoint in `backend/docs/analysis-api.md` or a dedicated
    `backend/docs/compare-api.md`; add the comparator-share definition to
    `backend/docs/dashboard-metrics.md`.

- [ ] T5 — Add backend tests
  - Monthly sums equal scope totals; zero months are present.
  - Heatmap sums equal scope totals; midnight falls in 00–03; any unknown-time
    row reconciles.
  - Compare accepts 1–4 effective codes after de-duplication; rejects 0, 5+,
    unknown codes, and out-of-scope codes.
  - Compare totals reconcile with SQL; auth, validation, payload, and headers.
  - Existing analysis tests remain green.

- [ ] T6 — Build the Tendencias tab
  - Enable the tab and register `/analisis/tendencias`.
  - Render the monthly trend with a table fallback and labels.
  - Render the heatmap with visible counts, keyboard/table access, and the
    00:00 caveat.
  - Build the comparator using the local catalog: up to 4 selections, level-aware
    labels, disabled state for commune scope, loading/error/empty states.
  - Render the comparison table and per-territory monthly series; label shares
    as scope shares.
  - Avoid a chart library; use CSS/inline SVG with accessible fallbacks.

- [ ] T7 — Verify and update the index
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
