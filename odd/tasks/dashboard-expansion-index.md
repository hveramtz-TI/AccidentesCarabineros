# Dashboard Expansion Program — ODD Index

## Purpose

Control plane for the seven approved brainstorm sections. Each section has its
own ODD so scope, risk, cost, decisions, and evidence are independently
reviewable. This index is the only source of execution order.

## Approval and locked decisions

- 2026-10-23: the user approved brainstorm ideas #1–#7.
- `/` keeps the large 50/50 map; it is the visual entry point of the product.
- `/mapas` adds the territory table and removes KPI cards from that route.
- Navigation: Panel, Mapas, Análisis, Informes; Metodología in the footer.
- Análisis tabs: Personas, Vehículos, Causas, Tendencias.
- No commune geometry in v1; the territory drill-down is table-only.
- Reports use aggregate CSV + browser print; no server PDF or Excel.
- 2025 only; no geocoding, alerts, multi-year, or synthetic indices.
- Backend remains Fastify + Prisma + Neon; 1 shared vCPU / 1 GB; no schema
  changes or materialized views in v1.
- Stitch is not a dependency; `frontend/DESIGN.md` is the local source of truth.

## Current state

- The frontend has no router; `src/App.tsx` renders one dashboard view.
- `src/layout/Layout.tsx` declares only navigation labels; Mapas and Informes
  are placeholders, while Análisis and Metodología do not exist.
- The backend exposes one protected data endpoint: `GET /api/dashboard`.
- Data: 73,081 siniestros / 148,252 personas / 130,234 vehículos, 2025 only.
- No coordinates, no commune geometry, no multi-year source.
- Backend checks are `npm test` and `npm run build`; frontend checks are
  `npm run lint` and `npm run build`. There is no frontend test runner.

## Scoring

- **Risk 1–5:**
  1 = static content or presentation only, with no data-contract change;
  2 = reuses existing data contracts, or adds a simple read-only metadata
  endpoint over existing tables without derived metrics;
  3 = adds an analytical or cross-layer shared contract, nontrivial
  aggregation/crosstab, export serialization, or nontrivial grain semantics
  without schema changes;
  4 = multi-series time analysis or comparison across scopes with several
  aggregate paths;
  5 = schema/source-data/pipeline change or irreversible architecture change.
- **Cost 1–5:**
  1 = one small static or local UI change;
  2 = one focused frontend page/table reusing an existing endpoint, with no new
  backend query or shared infrastructure;
  3 = one end-to-end API/data section plus page and checks, or one cross-layer
  foundation refactor;
  4 = several coordinated outputs/integrations or multiple aggregate/endpoint
  families;
  5 = pipeline/schema work or a broad multi-page program.
- **Score = Risk + Cost.** Rank approved ideas by ascending score; on equal
  scores, lower risk then lower cost comes first. Dependencies are hard gates;
  if one ever forces a score inversion, document the exception in this index.
- **EXP-00 is a hard prerequisite**, shown first and excluded from the idea
  ranking regardless of score. Among equal-ranked dependent analysis slices,
  deliver the shared contract before extensions, then lower data-semantic
  complexity first.
- Scores are relative to this program. The index owns the ranking; any score
  change must update the matching child ODD header in the same edit.

## Ordered backlog

| Exec | ODD | Idea | Scope | Risk | Cost | Score | Depends on | Status |
|---|---|---|---|---|---|---|---|---|
| 00 | [EXP-00 Foundation](./dashboard-expansion-00-foundation.md) | prerequisite | Router, shell, URL state, shared guard, lazy routes | 3 | 3 | 6* | — | in_progress |
| 01 | [EXP-02 Map table](./dashboard-expansion-02-map-table.md) | #1 Mapas | `/mapas` table replaces KPIs; reuse dashboard | 2 | 2 | 4 | EXP-00 | in_progress |
| 02 | [EXP-01 Methodology](./dashboard-expansion-01-methodology.md) | #3 Metodología | `/metodologia` + `/api/meta` | 2 | 3 | 5 | EXP-00 | planned |
| 03 | [EXP-03 Causes](./dashboard-expansion-03-causes.md) | #6 Causas | `/api/analysis` skeleton + all causes | 3 | 3 | 6 | EXP-00 | planned |
| 04 | [EXP-04 Vehicles](./dashboard-expansion-04-vehicles.md) | #5 Vehículos | Analysis `vehicles` + type×severity | 3 | 3 | 6 | EXP-03 | planned |
| 05 | [EXP-05 Persons](./dashboard-expansion-05-persons.md) | #4 Personas | Analysis `persons` + crosstabs | 3 | 3 | 6 | EXP-03 | planned |
| 06 | [EXP-06 Reports](./dashboard-expansion-06-reports.md) | #2 Informes | Preview + CSV + print | 3 | 4 | 7 | EXP-00, EXP-02 | planned |
| 07 | [EXP-07 Trends](./dashboard-expansion-07-trends-compare.md) | #7 Tendencias | Trend + weekday×3-hour + comparator | 4 | 4 | 8 | EXP-03 | planned |

\* EXP-00 is a hard prerequisite and is excluded from the idea ranking; it runs
before the lower-scored feature slices by design.

## Why this order

1. **Mapas** first among approved ideas (score 4): focused UI work reusing the
   existing map and `/api/dashboard` contract.
2. **Metodología** second (score 5): a simple metadata endpoint and page, without
   new derived-metric semantics.
3. **Causas** third (score 6): creates the shared analytical contract and a
   single-cause aggregation.
4. **Vehículos** fourth (score 6): extends that contract with distinct accident
   counts and a type × severity matrix.
5. **Personas** fifth (score 6): adds person-grain demographic/outcome crosstabs
   and explicit unknown handling.
6. **Informes** sixth (score 7): coordinates CSV serialization, preview, print,
   and a link back from Mapas.
7. **Tendencias** last (score 8): adds multi-series analysis, a heatmap, and a
   cross-territory comparison endpoint.

## Child ODD contract

| ODD | Backend | Frontend | Acceptance | Out of scope |
|---|---|---|---|---|
| EXP-00 | Shared Bearer/error/query helpers | Shell, router, NavLink, URL filters, lazy routes, 404 | Deep links, back/forward, mobile menu, build/lint | Any data feature |
| EXP-01 | `GET /api/meta` (counts, coverage, caveats) | `/metodologia` + footer link | Counts match DB; caveats visible | New metrics |
| EXP-02 | None | `MapExplorer` + `TerritoryTable`; table replaces KPIs | Region→commune, sorting, keyboard, deep links | Commune polygons, new endpoint, ficha link |
| EXP-03 | `GET /api/analysis` skeleton + causes | `AnalysisLayout` + `/analisis/causas` | Causes sum = accidents; empty scope | Other tabs, schema changes |
| EXP-04 | Extend analysis `vehicles` | `/analisis/vehiculos` | Distinct-siniestro semantics; caveat | Person grain, schema changes |
| EXP-05 | Extend analysis `persons` | `/analisis/personas` | Crosstabs sum = persons.rows; unknown visible | Accident KPIs in same axis |
| EXP-06 | `GET /api/dashboard/export.csv` | `/informes` preview, CSV, print CSS, ficha link from Mapas | CSV reconciles; no raw IDs; print usable | Server PDF/Excel, raw rows |
| EXP-07 | Extend analysis `trend`/`weekdayHours`; `GET /api/compare` | `/analisis/tendencias` | Series sums reconcile; compare ≤4 codes | Multi-year, prediction |

## Shared ownership

- EXP-00 owns the router, shell, URL state, Bearer guard, error handler, shared
  query schema, and `useApiQuery`.
- EXP-03 owns the initial `/api/analysis` contract and its tests; EXP-04/05/07
  extend it additively and must keep existing sections green.
- EXP-06 owns CSV serialization and formula-injection sanitization.
- EXP-01 owns `/api/meta`; EXP-07 owns `/api/compare`.
- No child ODD may edit another child's scope without updating this index.

## Traceability rules

- Every child ODD header records: brainstorm idea, execution order, risk, cost,
  dependencies, and status.
- Every child ODD updates its row here with commit/test evidence when done.
- Order changes only in this index; child IDs never renumber.
- One ODD = one reviewable slice. If it exceeds roughly 400 changed lines, split
  it into sub-ODDs while keeping the same idea ID.
- Any shared-contract change requires regression tests for all consumers.
- The approved data definitions remain in `backend/docs/dashboard-metrics.md`.
  Any new user-facing derived view (cumulative share, type × severity,
  person crosstabs, weekday × 3-hour, comparator share) must cite its base
  fields and be documented there before delivery.

## Definition of done

- Backend: `npm test` and `npm run build` pass.
- Frontend: `npm run lint` and `npm run build` pass.
- The child ODD's acceptance criteria and checks pass.
- Evidence is linked in this index: commit, tests, performance numbers, screenshots.
- No production deploy, schema migration, or remote configuration is included.

## Decision gates

- Commune geometry: deferred; requires a new ODD and a frontend asset decision.
- Raw row export: deferred; aggregate CSV only.
- Multi-year or YoY: blocked by source data; requires an ingestion ODD.
- New endpoint beyond this list: requires a real consumer and approval.
- Schema change or materialized view: requires explicit approval before work.
- Official server-side PDF: requires a separate worker/container.
- Any change to the locked decisions above requires user approval and an update
  to this index before implementation.

## Status legend

- `planned` — approved, not started.
- `in_progress` — active work; dependencies satisfied.
- `blocked` — waiting on a decision or dependency.
- `done` — acceptance and evidence complete.

## Next step

Write and execute EXP-00, then follow the ranked feature order: EXP-02, EXP-01,
EXP-03, EXP-04, EXP-05, EXP-06, and EXP-07. EXP-04/05/07 must wait for EXP-03;
EXP-06 must wait for EXP-00 and EXP-02.

## Progress

- **2026-10-23 — Index created:** seven approved ideas mapped to eight child
  ODDs (one foundation plus one per idea), ordered by risk + cost. No code or
  schema changes were made.
- **2026-10-23 — Risk/cost recalibrated:** clarified all five score levels,
  corrected estimates against each ODD's scope, and reordered the feature backlog
  while retaining dependency gates. EXP-00 remains a prerequisite exception.
- **2026-10-23 — Child ODDs created:** EXP-00 through EXP-07 written with
  objective, current state, scope, out-of-scope, constraints, tasks, acceptance,
  checks, decision gates, delivery, next step, and progress. Status remains
  `planned`; implementation has not started.
- **2026-10-23 — EXP-00 in progress:** T5 shared backend guard committed
  (`6737386`) with byte-identical responses against `main`; T1-T4/T6/T7
  (router tree, shell, URL filters, lazy 404 + error boundary, `useApiQuery`,
  `_redirects`) committed (`6c9fd76`). Backend 36/36 + build and frontend lint +
  build pass. RDD assess over the branch (`--base-ref ecb291c --committed-only`)
  returned `medium` / `review_due: false` (`under_budget`), so the review slice
  stays open. EXP-00 remains `in_progress` until the manual browser pass
  (back/forward, mobile menu, focus) is done.
- **2026-10-23 — EXP-02 implemented (`in_progress`):** territory contract
  verified against the real database (national 16 regions `73081`, `regionId=13`
  52 comunas `20293`, `regionId=15` 4 `1603`, `communeId=XIII-1` 1 row; the 6
  zero communes present only in their region scope, `items` excluding zeros while
  `all` keeps them). `/mapas` built from the extracted `MapExplorer` +
  `TerritoryTable` + `use-dashboard-workspace`; nav item enabled; lazy chunk
  6.24 kB. Independent verification (`gentle-ai-verify`, baseline `ecb291c`)
  returned **0 blockers**, with the Panel extraction proven byte-identical by an
  SSR differential and request-shape parity confirmed; its two advisories were
  fixed. Frontend lint + build and backend 36/36 pass. Remaining before closure:
  the user's browser pass (sorting by mouse/Tab, deep links, 360/768/1280 px,
  Panel visual parity).
