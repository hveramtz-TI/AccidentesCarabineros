# EXP-00 — Dashboard Expansion Foundation

Brainstorm idea: prerequisite
Execution order: 00
Risk: 3/5
Cost: 3/5
Depends on: none
Status: done (desktop-approved)

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

- [x] T1 — Add the router dependency and route tree — route: inline — commit `6c9fd76`
  - Add `react-router` to `frontend/package.json` and install it.
  - Create `frontend/src/pages/DashboardPage.tsx` from the current `App.tsx`
    composition; keep the existing `Layout` behavior.
  - Register `/` and a catch-all 404 route. Provide the composition point later
    ODDs extend.
  - Verify React 19 compatibility through the production build.
  - Evidence: `react-router@7.18.4`; `frontend/src/pages/dashboard-page.tsx`
    carries the old `App.tsx` composition; `/` eager + `*` lazy inside
    `<Layout />`; `tsc -b && vite build` passes (2795 modules) and
    `vite preview` serves `/` with `200`.

- [x] T2 — Convert the shell and navigation — route: inline — commit `6c9fd76`
  - Change `NavigationItem` to carry `to` and `enabled`; derive active state
    from `NavLink`.
  - Update `Header` and `HamburgerMenu`; close the mobile sheet after a link.
  - Keep Mapas, Análisis, and Informes disabled until their ODDs land; do not
    add Metodología to the header.
  - Preserve `aria-current`, focus rings, 44px targets, and the existing label
    copy.
  - Evidence: `Layout.tsx` renders `<Outlet />` and declares Panel enabled,
    Mapas/Análisis/Informes disabled; `Header`/`HamburgerMenu` use `NavLink`
    (its own `aria-current="page"`) for enabled items and keep the disabled
    “(Próximamente)” button; mobile links close the sheet on click.

- [x] T3 — Move filters into the URL — route: inline — commit `6c9fd76`
  - Add a small `filters-url` module that parses and serializes
    `period`, `region`, and `commune`.
  - Validate region/commune against the canonical catalog; reject unknown values
    by falling back to `all`/`ALL_VALUE`.
  - If both are present and inconsistent, the commune wins and the region is
    normalized to that commune’s parent before the API query.
  - Migrate Panel to URL state; keep `filtersToQueryParams` as the API mapper.
  - Verify deep links, refresh, back/forward, and browser history.
  - Evidence (`frontend/src/lib/filters-url.ts`, run through `tsx`):
    `?period=q3&region=XIII` → `{from:2025-07-01,to:2025-09-30,regionId:13}`;
    `?commune=XV-2` → `{communeId:"XV-2"}`;
    `?region=IX&commune=XIII-1` → commune wins → `{communeId:"XIII-1"}`;
    `?period=nope&region=XX-99` and `?commune=ZZ-9` → national defaults.
    Serialization drops defaults, so the bare URL stays clean.
    Browser back/forward/refresh behavior is code-reviewed only: no browser or
    frontend test runner exists in this environment.

- [x] T4 — Add route resilience — route: inline — commit `6c9fd76`
  - Lazy-load pages that are not the initial route (starting with future pages).
  - Add a Suspense skeleton and a route error boundary with a retry/home action.
  - Restore scroll and focus the page heading after navigation.
  - Set a document title per route.
  - Evidence: `/` stays eager and `*` is `React.lazy` behind one Suspense
    skeleton (`frontend/src/App.tsx`); `routes/route-error-boundary.tsx` wraps
    the outlet in `Layout`, keyed by pathname, with Reintentar/Volver al panel;
    `hooks/use-page-effects.ts` sets the title and restores scroll / focuses
    `[data-page-heading]` (Panel `h2`, 404 `h1`), and ignores search-param
    changes so filter edits never jump the viewport.

- [x] T5 — Extract the shared backend API guard — route: inline — commit 6737386
  - Create `backend/src/routes/api-guard.ts` (or an equivalent single module)
    exporting the Bearer hook, `no-store` header, error handler, and base filter
    schema/validator.
  - Register `dashboardRoutes` through the helper; keep the same status codes,
    error bodies, headers, and ordering.
  - Add/adjust `node:test` coverage so a missing/invalid token still prevents
    service calls and validation behavior is unchanged.
  - Do not change the dashboard service or its query count.
  - Evidence: `routes/api-guard.ts` (`applyApiGuard`, `baseFilterSchema`,
    `createApiGuardError`); `dashboardRoutes` registers through it with
    `internalMessage: "dashboard query failed"`. 5 new guard tests plus the 9
    existing auth/validation tests pass (36 total), `tsc` clean. Differential
    check against `main`: a baseline server on `:8081` and the refactored server
    on `:8080` returned byte-identical output for `/health`, no-token 401,
    wrong-token 401, out-of-range 400 with `details`, preflight 204 with the
    allowlist headers, and a disallowed origin (no `access-control-allow-origin`,
    `cache-control: no-store`).

- [x] T6 — Add the shared query hook — route: inline — commit `6c9fd76`
  - Add an abortable `useApiQuery<T>` with explicit loading/error/data states.
  - Reimplement `useDashboardQuery` on top of it without changing its public
    shape.
  - Confirm the map’s quiet national query still aborts correctly.
  - Evidence: `hooks/use-api-query.ts` keys the effect on a primitive request
    identity and aborts on change/unmount; `useDashboardQuery(params, enabled)`
    keeps its exact signature and `{status,data,error,retry}` shape. The map
    query stays quiet with `enabled=false` while no territory filter is active
    (same gate as before).

- [x] T7 — Configure the SPA fallback — route: inline — commit `6c9fd76`
  - Confirm the static host used for the frontend.
  - If it supports `_redirects`, add `frontend/public/_redirects` with
    `/* /index.html 200`; otherwise document the equivalent rewrite.
  - Verify that refreshing a deep link does not 404.
  - Evidence: `README.md` and `AGENTS.md` both name Cloudflare Pages as the
    production frontend, so `frontend/public/_redirects` adds
    `/*  /index.html  200`; the local nginx image already had
    `try_files $uri $uri/ /index.html`. `vite preview` returns `200` with the
    app shell for `/mapas` and `/ruta-inexistente`, so a refresh on a client
    route does not 404.

- [x] T8 — Verify and update the index — route: inline — evidence below
  - Run frontend lint/build and backend test/build.
  - Smoke the Panel, deep links, back/forward, mobile menu, and focus behavior.
  - Record evidence in the index and enable no feature items yet.
  - Evidence: `cd frontend && npm run lint` clean; `npm run build` = 2795 modules,
    `index-*.js` 1,010.71 kB (317.43 kB gzip) vs `main` baseline 964.75 kB
    (300.82 kB gzip) → router cost ≈ +46 kB raw / +16.6 kB gzip, and
    `not-found-page-*.js` is a separate 1.26 kB lazy chunk. `cd backend &&
    npm test` = 36/36 pass; `npm run build` clean. `curl` smoke against the
    running refactored server: `/health` 200, no/wrong Bearer 401 with
    `no-store`, out-of-2025 `from` 400 with `details`, preflight 204 with the
    allowlist headers, disallowed origin without CORS headers. `vite preview`
    served `/`, `/mapas` and `/ruta-inexistente` as `200` with the app shell and
    `dist/_redirects` present.
  - **Pending (no browser in this environment):** visual Panel comparison, real
    back/forward, mobile menu close, and keyboard focus must be eyeballed once
    with `cd frontend && npm run dev`.

## Acceptance criteria

- [/] `/` renders the Panel with the same layout, data, filters, and states as before
  — composition moved untouched into `pages/dashboard-page.tsx`; visual
  confirmation pending a browser pass.
- [/] A deep link such as `/?period=q3&region=XIII` loads the correct filters and
  survives a page refresh — parse → API params verified (`regionId:13`,
  `2025-07-01..2025-09-30`) and refreshing a client path returns the app shell;
  the rendered selection itself belongs to the pending browser pass.
- [ ] Back/forward and nav links preserve or restore filters correctly — every
  filter change pushes a history entry; not exercised in a real browser yet.
- [x] Mapas, Análisis, and Informes remain disabled; Metodología is not added to the
  header (EXP-01 adds the footer link).
- [ ] Mobile navigation closes after a link and returns focus to a sensible
  target — `HamburgerMenu` closes on `NavLink` click; browser pass pending.
- [x] `GET /api/dashboard` keeps its contract, `no-store`, 401/400 behavior, and
  query count — responses byte-identical to `main`; the service was not touched.
- [x] No new page content, endpoint, schema change, or remote configuration is
  added.
- [x] `cd frontend && npm run lint && npm run build` and
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

- Risk: item 2 for C1 (the Bearer barrier and error mapping moved, so a guard
  mistake could open the protected endpoint) and item 6 for C2 (no frontend test
  runner can catch a routing, filter, or Panel regression). C1 was neutralized by
  the byte-identical differential against `main` plus the 5 new guard tests and
  the 9 unchanged auth/validation tests; C2 stays exposed until the browser pass.
- One reviewable foundation slice; keep tests and docs with the behavior.
- Do not push, open a PR, or deploy without explicit authorization.
- Update the index status and evidence after verification.
- **RDD record:** `gentle-ai review assess --base-ref ecb291c --committed-only`
  over `0b96bae`+`6737386`+`6c9fd76` returned risk `medium`
  (`configuration_change: backend/package.json`), 28 paths / 2,742 lines,
  `review_due: false` (`under_budget`), with
  `--untracked-scope=exclude --expected-untracked-inventory=sha256:2b8f340f…`
  declared for the untracked scratch files that are not part of this candidate.
  The slice stays open: a later commit that crosses the budget closes it, and the
  reviewed boundary only advances on acknowledgement.

## Next step

After EXP-00 is done, execute EXP-02 (Mapas, order 01) and then EXP-01
(Metodología, order 02). EXP-03 may be prepared after the shared router and API
guard are stable, but remains order 03 in the ranked backlog.

## Progress

- **2026-10-23 — ODD created:** scope, risk, cost, tasks, and acceptance defined;
  implementation not started.
- **2026-10-23 — T5 delivered (`6737386`):** shared `applyApiGuard` /
  `baseFilterSchema` / `createApiGuardError` extracted; `dashboardRoutes`
  registers through it. 36 backend tests pass, `tsc` clean, and a live
  differential run against `main` produced byte-identical responses.
- **2026-10-23 — T1-T4, T6, T7 delivered (`6c9fd76`):** `react-router@7.18.4` route
  tree, `Layout` shell with `<Outlet />` and the enabled/disabled nav table,
  URL-backed filters (`lib/filters-url.ts`), lazy 404 + Suspense skeleton +
  route error boundary + `usePageEffects`, shared `useApiQuery`, and
  `public/_redirects`. Frontend lint/build and backend test/build pass; three
  acceptance items stay open until a browser pass (no browser available here).

## Verification gap (declared, not claimed)

The user approved `/`, `/mapas`, and `/metodologia` visually on desktop. Browser
history (back/forward), the mobile sheet at 360 px, and focus-ring rendering were
not exercised in a browser; the code-level evidence for them (URL round-trip
tests, `NavLink` state, `data-page-heading` focus) is recorded above. Nothing in
this slice is known broken; the gap is coverage, not a failing check.
