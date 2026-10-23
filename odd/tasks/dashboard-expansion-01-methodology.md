# EXP-01 — Metodología and Data Quality

Brainstorm idea: #3 Metodología / Calidad del dato
Execution order: 02
Risk: 2/5
Cost: 3/5
Depends on: EXP-00
Status: in_progress

## Objective

Add a Metodología page that explains the source, 2025 coverage, indicator
definitions, known limitations, and data-quality caveats. Expose the live row
counts and coverage through a small read-only `GET /api/meta` endpoint so the page
cannot drift from the database.

## Current state

- The frontend has no Metodología route or footer link.
- `backend/docs/dashboard-metrics.md` is the approved source of truth for
  formulas, national baselines, and caveats.
- `GET /api/dashboard` already returns `meta` for a filtered query, but there is
  no dataset-level endpoint for coverage and row counts.
- The verified 2025 counts are 73,081 siniestros, 148,252 personas, and 130,234
  vehículos.
- No schema change is needed; the counts come from existing tables.

## Why

The dashboard is used for institutional analysis. Users need to know what the
data covers, what it does not, and which caveats travel with each indicator.
A visible methodology page reduces misinterpretation and makes the report
disclaimers traceable to a single source.

## Scope

1. Add `GET /api/meta` as a protected, read-only endpoint returning:
   `schemaVersion`, `source` (`carabineros-2025-normalized`), `synthetic: false`,
   `coverage`, `rowCounts`, `caveats`, and `generatedAt`.
2. Compute the three row counts in one query using subselects; do not load fact
   rows into Node.
3. Add the route to the shared API guard from EXP-00, with Bearer protection and
   a cache policy appropriate for a protected dataset summary.
4. Add a typed frontend client, query hook, and `/metodologia` page.
5. Add a `Metodología` link to the footer; do not add it to the main header.
6. Present: Fuente, Cobertura, Universo, Definiciones, Calidad del dato,
   Caveats, and Versionado.
7. Reuse the caveat copy from `backend/docs/dashboard-metrics.md`; do not invent
   new indicators or thresholds.
8. Add a shared `QueryStatus` component for loading/error/retry if EXP-00 did not
   already provide one.

## Out of scope

- New metrics, rates, rankings, charts, or comparisons.
- Public/unauthenticated access by default.
- Schema changes, import metadata tables, or materialized views.
- Editing the approved formulas or national baselines.
- A downloadable data dictionary or raw data export (separate decision).

## Constraints and rules

- 2025 only; no multi-year or YoY language.
- Do not describe the Bearer token as authentication.
- `rowCounts` must be database-derived, not hard-coded in the frontend.
- Caveats that must be visible:
  - 234 siniestros with exact time `00:00:00` (about 0.3%), kept in the 00–03
    bucket and disclosed, not reassigned.
  - 23,918 person rows (16.1%) without age.
  - 6 catalog communes with zero accidents, distinguishable from “no data”.
  - Vehicle shares do not sum to 100% because one siniestro can involve several
    vehicle types.
  - 2 valid siniestros have no vehicle rows.
  - `ZONA` is a source dimension, not a region.
  - The dataset covers 2025 only.
- The endpoint must not expose database details, stack traces, or PII.
- Cache policy: protected default `private, max-age=300`; if the user explicitly
  makes the page public, use `public, max-age=3600` and document the change.
- Payload cap: `<5 KB`; the endpoint returns summary metadata, never rows.
- No secrets or environment values in source or docs.

## Tasks

- [x] T1 — Define and document the `/api/meta` contract
  - Add the response type to `backend/src/types/` and mirror it in the frontend.
  - Fix field names, ordering, and the exact caveat list before implementation.
  - Record the endpoint in `backend/docs/dashboard-api.md` or a dedicated
    `backend/docs/meta-api.md`.
  - Evidence: `backend/src/types/meta-api.ts` (`MetaResponse`, `MetaService`,
    `MetaRepository`), `backend/docs/meta-api.md` (auth, cache policy, exact
    payload, error codes, and the "Bearer is a request barrier, not user
    authentication" note), mirrored shape in `frontend/src/lib/api/meta.ts`.
    Field names and the seven caveats were fixed before implementation.

- [x] T2 — Implement the service and route
  - Add a small service that runs one parameterless count query.
  - Register the route through the shared guard from EXP-00.
  - Return `401` before any query when the Bearer token is missing/invalid.
  - Set `Cache-Control: private, max-age=300` (or the approved public variant).
  - Evidence: `backend/src/services/meta-service.ts` runs a single
    parameterless `$queryRaw` with three subselects (`siniestro`, `persona`,
    `vehiculo`) and converts the BigInt results; `backend/src/routes/meta.ts`
    registers `/api/meta` through `applyApiGuard`, whose hook runs in
    `preValidation`. `backend/src/app.ts` wires it with a `metaService`
    injection seam next to the dashboard one. The guard sets `no-store`, and the
    handler overwrites it with `private, max-age=300` only on success.

- [x] T3 — Add backend tests
  - Missing, invalid, and valid token behavior; service-not-called on rejection.
  - Counts match the verified 2025 baselines.
  - Response shape, caveat list, and cache header.
  - No database details or PII in errors.
  - Evidence: `backend/src/routes/meta.test.ts`, six tests (auth before service
    with `state.calls === 0`, shape plus cache header, the seven caveats in
    order, sanitized failure, fail-closed without `UUID_CONNECTION`, and
    rejections keeping `no-store`). Added to the explicit file list in
    `backend/package.json`. `npm test` → 42 tests, 42 pass, 0 fail.

- [x] T4 — Build the frontend page
  - Add `src/lib/api/meta.ts`, `src/hooks/use-meta-query.ts`, and
    `src/pages/MethodologyPage.tsx`.
  - Use the shared `QueryStatus`/error pattern; no synthetic fallback.
  - Render the approved sections with accessible headings and readable copy.
  - Add `/metodologia` to the route tree and enable the footer link.
  - Evidence: `frontend/src/lib/api/meta.ts` (throws on any non-200, returns no
    default counts), `frontend/src/hooks/use-meta-query.ts` on `useApiQuery`,
    `frontend/src/pages/methodology-page.tsx` (Fuente, Cobertura, Universo,
    Definiciones, Calidad del dato, Caveats, Versionado; every number and caveat
    comes from the endpoint), lazy `/metodologia` route in `App.tsx`, and a
    footer-only link in `Footer.tsx` (never the header). The shared
    `DashboardStatus` gained an optional `subject` prop so its error copy no
    longer says "del panel" here.

- [ ] T5 — Verify and update the index — data/build checks done, browser pass pending
  - Compare the page counts with independent SQL.
  - Run backend tests/build and frontend lint/build.
  - Record evidence in the index.
  - Evidence: live `GET /api/meta` returns `73081 / 148252 / 130234` with
    `private, max-age=300` and 1,010 bytes; independent SQL agrees
    (`73081|148252|130234`); `/health` and `/api/dashboard` unchanged (dashboard
    `git diff` empty, KPI values identical); CORS preflight still 204.
    Independent verification (`gentle-ai-verify`, baseline `15f5935`): **0
    blockers**, 6 acceptance criteria PASS, two advisories fixed here (the
    approved `0,3 %` qualifier restored in the caveat and its doc, and the shared
    error copy), plus the two proposed regression tests added. Backend 42/42 and
    build clean; frontend lint clean and build clean
    (`methodology-page-*.js` 8.29 kB / 2.83 kB gzip, main chunk 1,012.33 kB).
    `docker compose up -d --build frontend` serves `/metodologia` → `200
    text/html` and its chunk → `200`.
  - Risk: item 2 (the Bearer barrier and error mapping are shared with the
    dashboard, so a wiring mistake could open or break a protected route;
    mitigated by the guard reuse, the auth-before-service tests, and the live
    valid/missing/wrong/unset-token probes) and item 6 for the page (no frontend
    test runner).

## Acceptance criteria

- [x] `GET /api/meta` returns 73,081 / 148,252 / 130,234 for the current dataset
  (live payload and independent SQL agree; the frontend holds no such literal).
- [x] The page shows source, coverage, universe, definitions, quality, caveats, and
  version without inventing new metrics (seven sections, each with an accessible
  heading; copy traceable to `dashboard-metrics.md`).
- [x] The Metodología link is reachable from the footer on desktop and mobile — it
  is a real focusable link in `Footer.tsx`, and neither the header nor the mobile
  menu gained an entry; the rendered check is part of the browser pass.
- [x] Missing/invalid Bearer returns `401` before any database work (guard runs in
  `preValidation`; the test asserts the service was never called), and an unset
  `UUID_CONNECTION` still fails closed with `500 AUTH_NOT_CONFIGURED`.
- [x] Loading, error, and retry states are explicit; no synthetic fallback.
- [x] Backend tests/build and frontend lint/build pass.

## Checks

- `cd backend && npm test && npm run build`
- `cd frontend && npm run lint && npm run build`
- `curl` `/api/meta` with valid, invalid, and missing Bearer.
- Independent SQL: `SELECT count(*)` for the three fact tables.
- Manual: desktop/mobile, keyboard, error/retry, footer link.

## User decision gates

- **Protected vs public:** default is protected. Making `/api/meta` public
  changes the cache policy and removes the Bearer check; confirm before T2.
- **Caveat copy:** use the approved wording from `dashboard-metrics.md`; if the
  user wants a shorter page, remove sections rather than changing definitions.
- **Data dictionary:** not included; if needed, open a separate ODD.

## Delivery

- One small reviewable slice: endpoint + tests + page + footer link.
- Do not push, open a PR, or deploy without explicit authorization.
- Update the index status and evidence after verification.

## Next step

EXP-02 (Mapas, order 01) precedes this ODD. After EXP-01, execute EXP-03
(Causas, order 03); its shared contract then enables EXP-04, EXP-05, and EXP-07.

## Progress

- **2026-10-23 — ODD created:** endpoint contract, page sections, caveats, tasks,
  and acceptance defined; implementation not started.
- **2026-10-23 — T1-T4 implemented and verified:** contract in
  `backend/docs/meta-api.md`; one subselect count query; `/api/meta` through the
  shared guard with `private, max-age=300`; six route tests (42/42 backend);
  `/metodologia` page plus footer link. Independent verification returned 0
  blockers; its two copy advisories were fixed and its two proposed regression
  tests added. Live checks: `73081|148252|130234` from the API and from SQL,
  `/api/dashboard` untouched, `/metodologia` served `200`. Status stays
  `in_progress` until the browser pass (footer reachability, focus, error/retry,
  360/768/1280 px).
