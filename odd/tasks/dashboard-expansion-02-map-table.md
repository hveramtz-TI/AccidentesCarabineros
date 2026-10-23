# EXP-02 — Mapas with Territory Table

Brainstorm idea: #1 Mapas
Execution order: 01
Risk: 2/5
Cost: 2/5
Depends on: EXP-00
Status: planned

## Objective

Add a dedicated `/mapas` route with the existing regional map, the existing
filters, and a sortable territory table. The table replaces the KPI cards on this
route. No new backend endpoint or geometry is introduced.

## Current state

- `/` renders the 50/50 map workspace via
  `frontend/src/components/Sections/containerMapFilter.tsx`, reusing
  `frontend/src/components/dashboard/region-map.tsx`.
- `GET /api/dashboard` returns `territories.all`; when a region is selected the
  list switches from regions to its communes.
- The map is a regional choropleth; there is no commune geometry.
- The current workspace shows KPI cards and a legend, not a table.
- The source has 6 catalog communes with zero accidents
  (`territories.zeroAccidentCount`); the map already represents regions with
  zero counts.
- No schema, endpoint, or dataset change is required for this ODD.

## Why

The map answers “where” visually but cannot be read precisely or sorted. A table
adds exact counts, ranking, and keyboard access without loading another endpoint.
Keeping the large map on `/` preserves the product’s visual entry point; `/mapas`
becomes the analytical workspace.

## Scope

1. Add `/mapas` to the route tree and enable the Mapas navigation item.
2. Refactor the map workspace into a reusable `MapExplorer` that supports two
   compositions: Panel (map + KPIs) and Mapas (map + table). Preserve Panel.
3. On `/mapas`, render the map, the existing filters, a short scope title, and
   `TerritoryTable`; do not render KPI cards.
4. Table columns: rank, code, territory name, accidents, fatalities, and share
   of accidents. When rows are communes, show the region name as secondary
   context in the name cell.
5. Default sort: accidents descending. Allow sorting by name, accidents,
   fatalities, and share. Rank is derived and not sortable.
6. Use a native `<table>` with `<caption>`, `<thead>`, `<tbody>`, `scope="col"`,
   `aria-sort`, numeric right alignment, `tabular-nums`, a sticky header, and
   horizontal scroll on narrow screens.
7. Include zero-accident catalog territories with `0`, not as “no data”.
   `territories.all` already contains them; if a deployment omits them, stop and
   ask before changing the backend.
8. Keep filters in the URL from EXP-00; selecting a region on the map or in the
   filter updates the table to communes. Selecting a commune is only possible
   through the filter, because there is no commune geometry.
9. Preserve loading, error, and empty states; do not show a synthetic table.
   A zero-accident scope still shows its territory rows with `0`; the empty state
   is reserved for a response with no territories.
10. Leave the “Ficha territorial” link out of this ODD; EXP-06 adds it.

## Out of scope

- Commune geometry, new GeoJSON, or a new map library.
- A new API endpoint or a change to `/api/dashboard`.
- Row click drill-down, charts, or extra metrics.
- The “Ficha territorial” link (EXP-06).
- CSV export (EXP-06) or print layout (EXP-06).
- KPI changes on `/`; the Panel keeps its current cards.

## Constraints and rules

- Reuse `GET /api/dashboard`; do not add `GET /api/territories`.
- The table denominator for share is the filtered total accidents for the
  current period and scope; a zero total yields `0.0%` for every row.
- One row = one territory returned by the API. Do not merge or rename codes.
- Zero rows are real values; “no data” is reserved for a failed/empty response.
- No arbitrary Tailwind values; use the spacing scale and `w-full`.
- Mobile-first: the table scrolls horizontally; it must not cause page overflow.
- No raw IDs, PII, or new data files.
- No frontend test runner; checks are lint/build plus manual browser checks.

## Tasks

- [ ] T1 — Confirm the territory contract
  - Verify `territories.all` for national and region scopes, including
    zero-accident catalog entries and the fields for code/name/accidents/fatalities.
  - Verify the list switches to communes when `region` is set.
  - If zero entries are missing, stop; do not fake them in the frontend.

- [ ] T2 — Extract the reusable map workspace
  - Create `MapExplorer` (or equivalent) with a `variant`/`children` boundary.
  - Keep `/` rendering the map + KPI cards; no visual regression.
  - Ensure filter changes still trigger the existing query and map selection.

- [ ] T3 — Build `TerritoryTable`
  - Add `frontend/src/components/map/territory-table.tsx`.
  - Derive rank after sorting; format numbers with `es-CL` and percentages with
    one decimal.
  - Show region context for commune rows.
  - Add accessible sort controls and an explicit empty state.
  - Add sticky header and horizontal scroll without page overflow.

- [ ] T4 — Wire `/mapas`
  - Register the route and enable the nav item.
  - Render scope title, filters, map, and table; omit KPI cards.
  - Keep URL filters authoritative and shareable.
  - Verify map click → region filter → commune table.

- [ ] T5 — Verify and update the index
  - Compare table totals with `/api/dashboard` KPIs and independent SQL.
  - Run frontend lint/build; smoke desktop/mobile and keyboard sorting.
  - Record evidence in the index.

## Acceptance criteria

- `/mapas` shows the map, filters, and a table; no KPI cards appear on this route.
- `/` still shows the map and KPI cards unchanged.
- National scope lists regions; a selected region lists its communes with region
  context; a selected commune shows that one row.
- Table totals reconcile with the filtered KPI total; shares sum to 100% within
  rounding.
- Zero-accident catalog territories appear with `0`.
- Sorting works with mouse and keyboard; `aria-sort` reflects the active column.
- Deep links and back/forward restore the same period/region/commune and table.
- No new endpoint, schema change, geometry, or page overflow.
- `cd frontend && npm run lint && npm run build` passes.

## Checks

- `cd frontend && npm run lint && npm run build`
- Manual: `/mapas` national, region, commune, zero rows, empty scope, slow/error.
- Keyboard: tab to headers, toggle sort, verify announcements.
- Responsive: 360px, 768px, 1280px; check sticky header and horizontal scroll.
- Reconcile: sum table accidents vs `kpis.totalAccidents`; compare to SQL.
- `git diff`: no new endpoints, no map assets, no KPI changes on `/`.

## User decision gates

- **Zero-row contract:** the table includes zero-accident catalog territories.
  If the API does not return them, confirm whether to extend the response or
  accept an explicit “not listed” note before T3.
- **Row actions:** rows are not clickable in v1; the ficha link arrives in EXP-06.
  Confirm if a row should instead filter the map.
- **Share column:** share means share of accidents, not fatalities. Confirm if a
  second share column is needed; it would change the table width.

## Delivery

- One frontend-only slice: route, reusable workspace, table, tests via checks.
- Do not push, open a PR, or deploy without explicit authorization.
- Update the index status and evidence after verification.

## Next step

After EXP-02, execute EXP-01 (Metodología, order 02), then EXP-03 (Causas,
order 03). EXP-06 adds the “Ficha territorial” link later, after its order-06
slot; it already depends on this table.

## Progress

- **2026-10-23 — ODD created:** route, table contract, reuse rules, and acceptance
  defined; implementation not started.
