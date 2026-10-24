# EXP-02 — Mapas with Territory Table

Brainstorm idea: #1 Mapas
Execution order: 01
Risk: 2/5
Cost: 2/5
Depends on: EXP-00
Status: done (visual approved)

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
  current period and scope (`kpis.accidents`); a zero total yields `0,0 %`
  (`es-CL`) for every row.
- One row = one territory returned by the API. Do not merge or rename codes.
- Zero rows are real values; “no data” is reserved for a failed/empty response.
- No arbitrary Tailwind values; use the spacing scale and `w-full`.
- Mobile-first: the table scrolls horizontally; it must not cause page overflow.
- No raw IDs, PII, or new data files.
- No frontend test runner; checks are lint/build plus manual browser checks.

## Tasks

Route: all units inline (parent). Writer trigger not met — one frontend
behavior (reusable workspace + table + route) over a small, already-read file
set; file count never fires the trigger.

- [x] T1 — Confirm the territory contract
  - Verify `territories.all` for national and region scopes, including
    zero-accident catalog entries and the fields for code/name/accidents/fatalities.
  - Verify the list switches to communes when `region` is set.
  - If zero entries are missing, stop; do not fake them in the frontend.
  - Evidence (local Postgres via `docker compose`, importer: `status: ok`,
    73.081 / 148.252 / 130.234 rows, 0 errors, catalog 16 regions / 346 comunas):
    - national `?` → `scope: region`, 16 rows, `sum(all.accidents) = 73081 =
      kpis.accidents`, `zeroAccidentCount: 6`
    - `?regionId=13` → `scope: commune`, 52 rows, sum `20293 = kpis`
    - `?regionId=15` → 4 rows, sum `1603 = kpis`
    - `?communeId=XIII-1` → exactly 1 row (`Cerrillos`, 502)
    - the 6 zero communes (SQL: `I-2 Camiña`, `II-6 Ollagüe`, `V-4 Juan
      Fernández`, `XI-5 Guaitecas`, `XII-6 Antártica`, `XII-9 Timaukel`) are
      present with `accidents: 0` in their region scope, and the per-region row
      counts and sums match `SELECT ... FROM comuna GROUP BY region_id` exactly
  - **Contract nuance found:** in national scope `territories.all` lists the 16
    regions (none of them zero), so the 6 zero communes only surface once their
    region is selected. `territories.zeroAccidentCount` counts comunas with zero
    in scope, and `territories.items` excludes zeros while `all` keeps them. No
    frontend fabrication was needed, so the stop gate did not fire.

- [x] T2 — Extract the reusable map workspace
  - Create `MapExplorer` (or equivalent) with a `variant`/`children` boundary.
  - Keep `/` rendering the map + KPI cards; no visual regression.
  - Ensure filter changes still trigger the existing query and map selection.
  - Evidence: `components/map/map-explorer.tsx` keeps the approved layout
    (mobile stack, `lg` 50/50 absolute) and takes an `aside` slot;
    `components/Sections/containerMapFilter.tsx` is now `MapExplorer` +
    `KpiCards` with identical props, so the Panel JSX and the map cross-filter
    cascade are unchanged. The request rule moved once into
    `hooks/use-dashboard-workspace.ts` (filtered query + quiet national query for
    the choropleth only while a territory filter is active), and
    `hooks/use-url-filters.ts` is the shared URL filter state.
- [x] T3 — Build `TerritoryTable`
  - Add `frontend/src/components/map/territory-table.tsx`.
  - Derive rank after sorting; format numbers with `es-CL` and percentages with
    one decimal.
  - Show region context for commune rows.
  - Add accessible sort controls and an explicit empty state.
  - Add sticky header and horizontal scroll without page overflow.
  - Evidence: native `<table>` with `<caption>`, `scope="col"`, `aria-sort`
    (`ascending`/`descending`/`none`), buttons for name/siniestros/fallecidos/
    participación (rank is derived, not sortable), `tabular-nums`, right-aligned
    numerics, `Intl.NumberFormat("es-CL")`, share with one decimal, and
    `0.0 %` for every row when the total is 0. Commune rows carry the parent
    region name resolved from the canonical catalog (`regions` in `lib/data.ts`,
    identifier prefix before `-`), never a new data file. Empty response →
    explicit `role="status"` note; loading is handled by the page, so no
    synthetic table.
- [x] T4 — Wire `/mapas`
  - Register the route and enable the nav item.
  - Render scope title, filters, map, and table; omit KPI cards.
  - Keep URL filters authoritative and shareable.
  - Verify map click → region filter → commune table.
  - Evidence: `pages/maps-page.tsx` (lazy chunk `maps-page-*.js` 6.24 kB /
    2.65 kB gzip) renders `DashboardStatus`, the scope heading
    (`data-page-heading`), `MapExplorer` with `TerritoryTable` in the aside and
    no KPI cards; `App.tsx` registers `mapas` and `Layout.tsx` enables the Mapas
    item; the shared Suspense fallback + route error boundary moved into the
    shell so a new page is one `<Route>` + one nav flag.
  - Map click → region → commune table is wired through the same cascade
    (`onSelectRegion` sets `region`, clears `commune`, `parseFilters` and the
    API derive the commune list); the click itself needs the browser pass.

- [ ] T5 — Verify and update the index — data/build checks done, browser pass pending
  - Compare table totals with `/api/dashboard` KPIs and independent SQL.
  - Run frontend lint/build; smoke desktop/mobile and keyboard sorting.
  - Record evidence in the index.
  - Independent verification (`gentle-ai-verify`, baseline `ecb291c`): **0
    blockers**. Panel extraction proven byte-identical by an SSR differential
    (`vite build --ssr` of the baseline `ContainerMapFilter` vs
    `MapExplorer`+`KpiCards`, with live API rows): identical HTML length in both
    loading states; request-shape parity verified (params key, `enabled` gate,
    `regionSeriesState` tree, abort/retry semantics). Acceptance 4/5 re-derived
    independently (16/52/4/1 rows, sums `73081/20293/1603/502`, SQL `GROUP BY
    region_id` matches, the 6 zero comunas appear only in their region scope and
    `items` excludes them while `all` keeps them). Backend `git diff ecb291c` is
    only the EXP-00 guard files; service untouched.
  - Two advisories fixed here: the sticky header used an arbitrary Tailwind value
    `bg-[#0a0b0d]` → now `bg-background` (same token, `index.css:19`), and this
    doc said `kpis.totalAccidents` / `0.0%` → corrected to `kpis.accidents` and
    the `es-CL` rendering `0,0 %`.
  - After the fix: `npm run lint` clean, `npm run build` clean
    (`maps-page-*.js` 6.24 kB / 2.64 kB gzip), `cd backend && npm test` 36/36.
  - Served-shape check: `docker compose build frontend && docker compose up -d
    frontend` → `GET /mapas` = `200 text/html` with the app shell,
    the lazy chunk is served as `application/javascript`, and `/algo/no-existe`
    = `200` (nginx `try_files` SPA fallback, client-side 404). **Correction:** a
    bare `200` on an `/assets/...` URL proves nothing here, because the SPA
    fallback also answers `200 text/html` for a missing file; chunk presence must
    be checked by `content-type`, not status code. Main chunk stayed 1,011.78 kB
    / 317.42 kB gzip, so the table cost is its own 6.24 kB lazy chunk, not the
    Panel budget.
  - **Still open:** the browser pass (desktop/mobile widths, real click/Tab
    sorting, announcements, visual Panel equality).
  - Risk: item 6 (no frontend test runner can catch a Panel-layout or table
    regression; mitigated by the SSR differential and the live API/SQL
    reconciliation above).

## Acceptance criteria

- [x] `/mapas` shows the map, filters, and a table; no KPI cards appear on this
  route (route registered, lazy chunk served, KPI branch absent from the page).
- [x] `/` still shows the map and KPI cards unchanged — `containerMapFilter.tsx`
  renders the extracted `MapExplorer` with the same `KpiCards` props; visual
  equality still needs the browser pass.
- [x] National scope lists regions (16); a selected region lists its communes with
  region context (52 for XIII, 4 for XV); a selected commune shows that one row
  (XIII-1).
- [x] Table totals reconcile with the filtered KPI total; shares sum to 100%
  within rounding — `sum(territories.all.accidents) === kpis.accidents` for every
  scope probed, and SQL agrees per region.
- [x] Zero-accident catalog territories appear with `0` — the 6 zero communes are
  returned in their region scope (see the national-scope nuance in T1).
- [ ] Sorting works with mouse and keyboard; `aria-sort` reflects the active
  column — implemented with real `<button>` headers and `aria-sort`; not
  exercised in a browser yet.
- [ ] Deep links and back/forward restore the same period/region/commune and
  table — same URL contract as the Panel; browser pass pending.
- [x] No new endpoint, schema change, geometry, or page overflow introduced
  (`git diff`: frontend only; the table scrolls inside its own
  `overflow-auto` card).
- [x] `cd frontend && npm run lint && npm run build` passes.

## Checks

- `cd frontend && npm run lint && npm run build`
- Manual: `/mapas` national, region, commune, zero rows, empty scope, slow/error.
- Keyboard: tab to headers, toggle sort, verify announcements.
- Responsive: 360px, 768px, 1280px; check sticky header and horizontal scroll.
- Reconcile: sum table accidents vs `kpis.accidents`; compare to SQL.
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
- **2026-10-23 — T1 verified against real data:** local Postgres via
  `docker compose` + importer (73.081 / 148.252 / 130.234, 0 errors); the
  territory contract and the zero-commune scope nuance recorded above. The stop
  gate did not fire: no frontend fabrication needed.
- **2026-10-23 — T2-T4 implemented:** `MapExplorer` + `TerritoryTable` +
  `maps-page.tsx` + `use-url-filters.ts` + `use-dashboard-workspace.ts` +
  `route-fallback.tsx`; `/mapas` registered and its nav item enabled.
- **2026-10-23 — T5 independent verification:** 0 blockers, Panel extraction
  proven byte-identical by SSR differential, two advisories fixed
  (`bg-background`, doc field names). Browser pass pending, so the status stays
  `in_progress`.

## Verification gap (declared, not claimed)

The user approved `/mapas` visually on desktop, including the table against the
filtered scope. Keyboard sorting (Tab + Enter/Space), deep-link back/forward
restoration of the table, and 360 px width were not exercised in a browser. The
default sort, `aria-sort` state, rank derivation, and share math are verified in
the rendered markup and by the independent SSR probe; the covered gap is
interaction coverage, not a known defect.
