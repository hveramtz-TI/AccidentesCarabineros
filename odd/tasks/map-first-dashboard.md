# Map-First Dashboard Layout

## Objective

Implement the approved redesign in `frontend/DASHBOARD-REDESIGN-PLAN.md`: a first-view row with the reserved white map placeholder (disabled, non-functional zoom controls) on the left and the functional filters plus four KPI cards on the right; existing charts move to a section below.

## Problem

Current layout puts filters inside the floating header and stacks KPIs/charts in one column, which does not match the approved mockup: map workspace left, filters + 2×2 KPI panel right, charts below.

## Why

User accepted the plan document and authorized implementation. The map itself (GeoJSON, library, interactions) is explicitly out of scope for this slice; only the reserved placeholder is built.

## Scope (this slice)

1. New `map-placeholder.tsx`: white canvas, `+`/`−` controls disabled with accessible names, minimum 44×44px targets, no map data or dependencies.
2. Move `DashboardFiltersBar` from the header toolbar into the dashboard's right panel; keep period/region/commune cascading behavior.
3. KPI cards (Accidents, Fatalities, Injuries, Active cases) in a 2×2 grid on the right panel.
4. `DashboardView` restructure: first-view row (map left ~45%, filters + KPI right ~55% at ≥1024px; stacked below) and a separate charts section keeping Trend/Severity/Ranking behavior and synthetic-data disclosures.
5. `Header`/`Layout`/`App` wiring updated accordingly (toolbar responsibility removed from header).

## Out of scope

GeoJSON/TopoJSON, map library, functional zoom, selection sync, export buttons, browser-based visual QA, backend data.

## Constraints

- Follow `frontend/DESIGN.md` tokens (obsidian surfaces, emerald accent, Geist/Inter/JetBrains Mono); white map canvas is the deliberate plan-approved exception.
- Tailwind v4 CSS-first; TS flags (`erasableSyntaxOnly`, `verbatimModuleSyntax`, `noUnusedLocals/Parameters`).
- No new dependencies. No test runner exists → build/lint are the functional checks.

## Tasks

- [x] T1 Map placeholder component with disabled accessible zoom controls
- [x] T2 Move filters to right panel; restructure DashboardView (first-view row + charts section)
- [x] T3 Header/Layout/App wiring: drop header toolbar responsibility, pass filters state to view
- [x] T4 Responsive/a11y pass: stacking below 1024px, no horizontal overflow, focus visible, 44px controls
- [x] T5 Verification: `npm run build`, `npm run lint` green; record evidence

## Acceptance criteria

- Desktop: floating header; white empty map placeholder left; functional filters top-right; 2×2 KPI grid below them; charts in a full-width section beneath.
- Zoom controls visibly disabled, accessible, non-functional; no GeoJSON or map dependency added.
- Filters, KPIs, charts keep current behavior and synthetic-data labeling.
- No horizontal scrolling or clipped labels at 375/768/1024/1440 widths.
- `npm run build` and `npm run lint` pass.

## Checks

- `cd frontend && npm run build`
- `cd frontend && npm run lint`

## Route

Delegated direct (writer trigger: 5+ non-trivial files including a new component). Test-first exception: no test runner; functional checks are build/lint. Delivery strategy: `ask-on-risk`; forecast ≈200–320 authored lines, under the ~400-line budget (single slice).

## Progress

- 2026-10-07: Plan accepted by user. Prior T6 committed as `353a3ad` (floating header/nav/footer); approved plan committed as `00aebd8` on `feat/floating-dashboard-header`. RDD off (global) — ordinary checks only, no browser runs.
- 2026-10-07 (writer, T1–T5 implemented, uncommitted):
  - T1: `frontend/src/components/dashboard/map-placeholder.tsx` — plain white `rounded-lg` canvas (`min-h-[300px]`, stretches in the lg row), upper-left `+`/`−` as real `<button>`s with `disabled` + `aria-disabled="true"` + descriptive `aria-label`s, `cursor-not-allowed`, `min-h-11 min-w-11` (44×44px), muted white/`neutral-500` styling; no map text, no data, no new dependency (lucide icons already in app).
  - T2: `dashboard-view.tsx` — first-view row `lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]`: map left; right column = filters in a `glass-card` panel over the 2×2 KPI grid. Synthetic chip/period banner, `synthetic === false` warning, and `emptyScope` notice preserved verbatim at the top; trend/severity (7-col 4+3 split) and territory ranking kept intact in a new lower `<section aria-label="Trend, severity, and territorial analysis charts">`. KpiCards is outside allowed edit surfaces, so the panel wrapper applies `[&>section]:xl:grid-cols-2!` to keep the approved 2×2 shape inside the ~55% panel (verified compiled in `dist` CSS with `!important`).
  - T3: `App.tsx` keeps filter state ownership and passes `filters`/`onFiltersChange` to `DashboardView`; `Layout.tsx`/`Header.tsx` toolbar prop and the header's filter-descendant selector block removed; floating brand/nav layout untouched. `dashboard-filters.tsx` now owns its layout (`grid grid-cols-1 sm:grid-cols-3`, full-width triggers) since the header injection is gone; cascade logic (region→commune reset) unchanged.
  - T4: stacking order below `lg` is map → filters → KPIs → charts via single-column grids; `min-w-0` guards on row/column children; no new focus-visible regressions (only non-focusable disabled controls added).
  - T5 evidence: `npm run build` exit 0 (only expected `__dirname` config warning and >500 kB Recharts chunk warning; 771.86 kB JS); `npm run lint` exit 0, no findings.

## Next step

- DONE: parent verification after writer — `gentle-ai review assess` (RDD off) returned tier `medium`, 7 paths / 204 lines, `review_due=false (under_budget)`; writer self-verification stands and parent spot-checked `npm run lint` (exit 0) plus a structural readback of the diff. Browser viewport QA remains excluded per the approved plan (structural guards only). Work-unit commit recorded below.
- Follow-ups: replace `map-placeholder.tsx` with the real Chile vector map slice (GeoJSON source + library decision pending); optional `KpiCards` layout prop to remove the `[&>section]:xl:grid-cols-2!` override coupling.
