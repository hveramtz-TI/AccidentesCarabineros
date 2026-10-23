# EXP-00 — Dashboard Expansion Foundation

Brainstorm idea: prerequisite
Execution order: 00
Risk: 3/5
Cost: 3/5
Depends on: none
Status: planned

## Objective

Introduce client-side routing and shared plumbing so the dashboard can grow into
separate pages without duplicating authentication, error, filter, or fetch logic.
Preserve the current Panel behavior and visual output.

## Current state

- `frontend/src/App.tsx` renders `DashboardView` directly; there is no router.
- `frontend/src/layout/Layout.tsx` declares navigation labels and passes them to
  `Header`; `Header` and `HamburgerMenu` consume an `active` boolean.
- Mapas and Informes are disabled placeholders; Metodología does not exist.
- `backend/src/routes/dashboard.ts` owns the Bearer guard, `Cache-Control`,
  error handler, and query schema. New route plugins would duplicate them.
- The frontend has no test runner; checks are `npm run lint` and `npm run build`.
- The backend uses `node:test`; `npm test` covers routes and services.
- No schema, endpoint, or data change is required for this ODD.

## Why

Keeping every future section on `/` would grow one bundle and one initial data
load, remove deep links, and make each new feature edit unrelated code. Routing
plus shared guards and URL state gives each section its own reviewable slice
without changing the dashboard contract.

## Scope

1. Add `react-router` v7 and a route tree using `BrowserRouter`, `Routes`,
   `Route`, `Outlet`, and `NavLink`.
2. Move the current dashboard composition into a Panel page while preserving
   layout, filters, map, charts, loading, error, and empty states.
3. Convert `Layout` into an application shell with `<Outlet />`; keep the
   floating header, dot-grid main, and footer.
4. Extend `NavigationItem` with a destination and an enabled flag. Use `NavLink`
   for active state and `aria-current`; close the mobile menu after navigation.
5. Keep unbuilt sections disabled with the existing “(Próximamente)” pattern.
   Add the Análisis item disabled so the final header order is Panel, Mapas,
   Análisis, Informes. Each later ODD enables its own item and registers its own
   route. Metodología is footer-only and is added in EXP-01.
6. Move period/region/commune filters into URL search params
   (`period`, `region`, `commune`), validated against
   `frontend/src/data/oversio-identifiers.json`. Invalid values fall back to the
   national/default filter.
7. Add route-level lazy loading, a Suspense fallback, and a route error boundary
   so one page cannot blank the shell. Restore scroll and move focus to the page
   heading on navigation.
8. Extract the backend Bearer guard, cache header, error handler, and base
   filter schema from `routes/dashboard.ts` into a shared route helper. Register
   the existing dashboard route through it with no behavior change.
9. Add a shared abortable `useApiQuery` hook and migrate the dashboard query to
   it, keeping `useDashboardQuery` as the dashboard-facing wrapper.
10. Confirm the static-host SPA fallback; add `frontend/public/_redirects`
    (`/* /index.html 200`) only if the target host supports it.

## Out of scope

- Any new page content: Mapas table, Análisis tabs, Informes, Metodología.
- New backend endpoints, queries, schema changes, or migrations.
- Commune geometry or any new map asset.
- A frontend test runner or a new state-management dependency.
- Production deployment, Cloudflare/GCP configuration, or remote variables.

## Constraints and rules

- React 19, Vite 8, TypeScript 6. Respect `verbatimModuleSyntax`,
  `erasableSyntaxOnly`, `noUnusedLocals`, and `noUnusedParameters`; use
  `import type` for type-only imports.
- Tailwind v4 remains CSS-first; do not add `tailwind.config.js`.
- URL search params are the only filter source of truth; do not add a global
  filter store.
- Keep `GET /api/dashboard` request/response behavior, `Cache-Control: no-store`,
  Bearer failures, and validation errors unchanged.
- The shared backend guard must not add database work or query count.
- No secrets, tokens, or environment values in source or docs.
- Do not push, open a PR, or deploy without explicit authorization.

## Tasks

Route: all units inline (parent). Writer trigger not met — the backend guard unit
and the frontend routing unit are each small enough to write cheaper inline, and
the frontend change is one coherent behavior (router + shell + URL filters +
shared hook) that must not be split into test/code/docs writers. Work-unit
commits: C1 backend guard, C2 frontend routing foundation, C3 SPA fallback +
docs evidence.

- [ ] T1 — Add the router dependency and route tree — route: inline — commit C2
  - Add `react-router` to `frontend/package.json` and install it.
  - Create `frontend/src/pages/DashboardPage.tsx` from the current `App.tsx`
    composition; keep the existing `Layout` behavior.
  - Register `/` and a catch-all 404 route. Provide the composition point later
    ODDs extend.
  - Verify React 19 compatibility through the production build.

- [ ] T2 — Convert the shell and navigation
  - Change `NavigationItem` to carry `to` and `enabled`; derive active state
    from `NavLink`.
  - Update `Header` and `HamburgerMenu`; close the mobile sheet after a link.
  - Keep Mapas, Análisis, and Informes disabled until their ODDs land; do not
    add Metodología to the header.
  - Preserve `aria-current`, focus rings, 44px targets, and the existing label
    copy.

- [ ] T3 — Move filters into the URL
  - Add a small `filters-url` module that parses and serializes
    `period`, `region`, and `commune`.
  - Validate region/commune against the canonical catalog; reject unknown values
    by falling back to `all`/`ALL_VALUE`.
  - If both are present and inconsistent, the commune wins and the region is
    normalized to that commune’s parent before the API query.
  - Migrate Panel to URL state; keep `filtersToQueryParams` as the API mapper.
  - Verify deep links, refresh, back/forward, and browser history.

- [ ] T4 — Add route resilience
  - Lazy-load pages that are not the initial route (starting with future pages).
  - Add a Suspense skeleton and a route error boundary with a retry/home action.
  - Restore scroll and focus the page heading after navigation.
  - Set a document title per route.

- [ ] T5 — Extract the shared backend API guard
  - Create `backend/src/routes/api-guard.ts` (or an equivalent single module)
    exporting the Bearer hook, `no-store` header, error handler, and base filter
    schema/validator.
  - Register `dashboardRoutes` through the helper; keep the same status codes,
    error bodies, headers, and ordering.
  - Add/adjust `node:test` coverage so a missing/invalid token still prevents
    service calls and validation behavior is unchanged.
  - Do not change the dashboard service or its query count.

- [ ] T6 — Add the shared query hook
  - Add an abortable `useApiQuery<T>` with explicit loading/error/data states.
  - Reimplement `useDashboardQuery` on top of it without changing its public
    shape.
  - Confirm the map’s quiet national query still aborts correctly.

- [ ] T7 — Configure the SPA fallback
  - Confirm the static host used for the frontend.
  - If it supports `_redirects`, add `frontend/public/_redirects` with
    `/* /index.html 200`; otherwise document the equivalent rewrite.
  - Verify that refreshing a deep link does not 404.

- [ ] T8 — Verify and update the index
  - Run frontend lint/build and backend test/build.
  - Smoke the Panel, deep links, back/forward, mobile menu, and focus behavior.
  - Record evidence in the index and enable no feature items yet.

## Acceptance criteria

- `/` renders the Panel with the same layout, data, filters, and states as before.
- A deep link such as `/?period=q3&region=XIII` loads the correct filters and
  survives a page refresh.
- Back/forward and nav links preserve or restore filters correctly.
- Mapas, Análisis, and Informes remain disabled; Metodología is not added to the
  header (EXP-01 adds the footer link).
- Mobile navigation closes after a link and returns focus to a sensible target.
- `GET /api/dashboard` keeps its contract, `no-store`, 401/400 behavior, and
  query count.
- No new page content, endpoint, schema change, or remote configuration is added.
- `cd frontend && npm run lint && npm run build` and
  `cd backend && npm test && npm run build` pass.

## Checks

- `cd frontend && npm install`
- `cd frontend && npm run lint && npm run build`
- `cd backend && npm test && npm run build`
- Manual browser: `/`, deep link, refresh, back/forward, mobile menu, keyboard
  focus, 404 route.
- `curl` smoke: valid/invalid/missing Bearer on `/api/dashboard`; `/health`.
- `git diff` review: no secrets, no generated files, no unrelated design changes.

## User decision gates

- **Router dependency:** use `react-router` v7. If the user rejects the new
  dependency, stop and propose a minimal history/hash router before T2.
- **Nav visibility:** unbuilt sections stay disabled with “(Próximamente)” until
  their ODD lands. Confirm if the user prefers hiding them entirely.
- **URL contract:** filter keys are `period`, `region`, and `commune`. Confirm
  before deep links become public.
- **SPA fallback:** depends on the final static host. Do not assume Cloudflare
  Pages if the deployment target changes.

## Delivery

- One reviewable foundation slice; keep tests and docs with the behavior.
- Do not push, open a PR, or deploy without explicit authorization.
- Update the index status and evidence after verification.

## Next step

After EXP-00 is done, execute EXP-02 (Mapas, order 01) and then EXP-01
(Metodología, order 02). EXP-03 may be prepared after the shared router and API
guard are stable, but remains order 03 in the ranked backlog.

## Progress

- **2026-10-23 — ODD created:** scope, risk, cost, tasks, and acceptance defined;
  implementation not started.
