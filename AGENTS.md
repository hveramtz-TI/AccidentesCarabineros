# AGENTS.md

Road-safety (traffic accident) analysis for Carabineros de Chile: normalized 2025
crash Excel data in PostgreSQL (Neon), read-only Fastify aggregate API, React
dashboard.

## Layout — two independent packages, no workspace

No root `package.json`; install and run each app from its own directory.

- `backend/` — Fastify 5 + Prisma 6 (PostgreSQL/Neon) + Excel importer. ESM
  (`"type": "module"`, `moduleResolution: NodeNext`): **every relative import
  needs a `.js` extension**, even from `.ts` files.
- `frontend/` — Vite 8 + React 19 + TS 6 + Tailwind v4 + shadcn/radix.
- `odd/tasks/*.md` — ODD feature docs (`T#` tasks, `L#` log entries, commit
  evidence). Update the matching doc when you finish work; the index file owns
  execution order.
- Raw `*_2025(1).xlsx` at the repo root are gitignored inputs, not artifacts.
  Filenames contain spaces/parens — quote paths.

## Commands

Backend (`cd backend`):

- `npm test` — `node --import tsx --test`, 109 tests, **needs no database**
  (routes/services tested through `buildApp({ dashboardService, metaService,
  analysisService, authToken })` injection).
- The `test` script lists files explicitly (`src/import/*.test.ts` glob + the
  named route/service files, including `api-guard`, `meta`, and `analysis`
  tests). **A new test file outside that list silently does not run** — add it
  to the script.
- Single file: `node --import tsx --test src/services/dashboard-service.test.ts`
- `npm run build` — `tsc` → `dist/`
- `npm run dev` — tsx watch, loads `backend/.env` via `--env-file`
- `npm run db:migrate:dev` (create) / `db:migrate` (`migrate deploy`) /
  `db:generate` (client) / `db:check` (needs `backend/.env`)
- `npm run db:import` — runs **compiled** output from the repo root
  (`cd .. && node backend/dist/import/cli.js`), so `npm run build` must happen
  first, and `DATABASE_NEON_URL` must be in the environment. Flags:
  `--dir --catalog --report --reset --expect-siniestros/--expect-personas/--expect-vehiculos`.

Frontend (`cd frontend`):

- `npm run lint` — ESLint (flat config)
- `npm run build` — `tsc -b && vite build`; type errors fail the build, there is
  no separate typecheck script
- `npm run dev` / `npm run preview`
- **No frontend test runner exists.** Do not invent `npm test`.

Verification order per change: backend `npm test` → `npm run build`; frontend
`npm run lint` → `npm run build`. CI runs neither — GitHub Actions only manages
Neon PR branches (`.github/workflows/neon-pr-branches.yml`).

Full local stack: `docker compose up -d --build` (frontend `:3200`, API `:8080`,
Postgres has no host port), then `docker compose run --rm importer` (profile
`ops`, not started by `up`). `docker compose down -v` drops the DB volume.

## Data and API rules (verified, not guessed)

- 2025 only. Dates outside `2025-01-01..2025-12-31` are a `400` validation
  error, never an empty result. `communeId` matches `^[IVX]+-[0-9]+$` (e.g.
  `XIII-1`) and **wins over** `regionId`; region always resolves via
  `siniestro.comuna_id → comuna.region_id`, never through `zona`.
- Metric formulas, national baselines, and mandatory caveats live in
  `backend/docs/dashboard-metrics.md` (approved). The API may not introduce an
  indicator absent from that doc, and no number ships without its caveat. HTTP
  surface is fixed by `backend/docs/dashboard-api.md`, `meta-api.md`,
  `analysis-api.md`, and `reports-api.md`: `GET /api/dashboard` (one pass,
  every section), `GET /api/dashboard/export.csv` (aggregate territory CSV —
  BOM+CRLF RFC 4180, es-CL comma `participacion` always quoted, formula-
  injection `'` prefix, ≤346 rows / ≤50 KB with `400 export/to_large`,
  header-only `200` for empty scopes; the plugin's shared guard covers it),
  `GET /api/meta` (dataset summary; row counts come from one subselect query,
  never hard-coded in the frontend), and `GET /api/analysis` — one endpoint
  extended **additively by section** (`causes`, then `vehicles`, then
  `persons`); later sections never rename or remove earlier ones, and tabs add
  no per-section endpoint. `GET /api/compare` (`compare-api.md`) compares 1–4
  catalog identifiers (`codes=XIII,XV`) at the level the filters imply —
  national→regions, region→its communes, commune→`400 not_supported` (the UI
  hides it); shares divide by the whole-scope total, never the selection.
- Analysis invariants (verified cell-by-cell against SQL, `analysis-api.md`
  §4): `causes.rows` always holds all 70 catalog causes including zeros, ordered
  accidents DESC then name, cumulative share computed client-side (Pareto line
  sits at row 10 nationally); vehicle `byType` is derived from the type ×
  severity MECE matrix (`COUNT(DISTINCT siniestro_id)` semantics, shares may
  sum over 100% by design, no cumulative); `persons` marginals (`rows`,
  `bySex`, `byAge`, `unknownAge`, `unknownSex`) derive from the sex × age and
  role × outcome matrices at **person grain** (XIII-1: 1,065 persons over 502
  siniestros); `byAge` is dense (six bands incl. zeros) while matrix cells drop
  zeros; unknown sex is catalog row 3 `SE IGNORA` (never a NULL), 23,918 unknown
  ages; `SE DA A LA FUGA` is a real fourth role; `resultado_persona` is
  person-level, distinct from siniestro severity (PER-2 documents the mapping).
- Fixed vocabularies to reuse, not redefine (`backend/src/services/dashboard-service.ts`):
  severity keys `fatal | serious | minor | onlyIlesos`; `AGE_BANDS` = `0-17`,
  `18-25`, `26-40`, `41-64`, `65+`, `unknown`; 3-hour buckets starting `0,3,…,21`.
  234 siniestros have an exact `00:00:00` time — they stay in the 00–03 bucket
  with a disclosure (`midnightArtifactCount`), never reassigned.
- Vehicle-type and cause shares are **non-additive / top-10**: one siniestro can
  involve several vehicle types, so type shares may exceed 100%; person rows are
  a different grain from siniestros and must never share an axis.
- Row counts the importer asserts: 73,081 siniestros / 148,252 personas /
  130,234 vehículos. `territories.all` includes the 6 catalog communes with zero
  accidents — zero must stay distinguishable from missing.
- `territories.all` grain changes with scope: national scope lists the 16
  **regions** (none zero, so the 6 zero communes only surface once their region
  is selected), a region scope lists all its catalog communes including zeros,
  and a commune scope returns that single row. `territories.items` is top-10 of
  **nonzero** rows only; `zeroAccidentCount` counts catalog comunas with zero in
  the active filter, not rows missing from `all`.
- `frontend/src/data/oversio-identifiers.json` is the canonical territory
  catalog (16 regions / ~350 communes). The backend Dockerfile copies it into the
  image at `/app/catalog/` — that is why the backend image builds from the
  **repo root** context: `docker build -f backend/Dockerfile .`. Keep this file
  and the importer catalog in sync; never duplicate it.
- Import normalization is `normalizeLabel()` in `backend/src/import/normalize.ts`:
  trim → NFKD → strip combining marks → uppercase → keep `[A-Z0-9]`. Apply the
  same function to source and catalog labels or ID joins break; commune name
  variants resolve through the `comuna_alias` table.

## Auth, CORS, migrations

- `Authorization: Bearer $UUID_CONNECTION` is a request barrier, **not** user
  authentication: `VITE_UUID_CONNECTION` is compiled into the public bundle and
  dev/prod must use different values. Backend fails closed — an unset
  `UUID_CONNECTION` returns `500 AUTH_NOT_CONFIGURED`. The check runs in
  `preValidation`, before schema validation, controller, and Prisma. `/health`
  stays public.
- CORS is a hand-rolled `onRequest` hook in `backend/src/app.ts` (allowlist from
  `CORS_ALLOWED_ORIGINS`, defaults `http://localhost:3200,http://localhost:5173`).
  Preflight `OPTIONS` answers 204 before auth, and the error handler keeps CORS
  headers so browsers can read `400/401/500`. Do not add `@fastify/cors`. The
  production allowlist must include the deployed frontend origin
  (`*.workers.dev` subdomain or its custom domain).
- Env files are three different things: root `.env` = compose interpolation;
  `backend/.env` = `npm run dev`/`db:check`; `frontend/.env.local` = Vite dev.
  All ignored. Never commit token values; `backend/src/database/.env` (old
  MySQL creds) is still reachable in history (`9bdba01`, `5778e93`) — do not
  recreate that file.
- Prisma uses a **single** `DATABASE_NEON_URL` with no `DIRECT_URL`, so it must
  be the Neon **direct (non-pooled)** endpoint. The image CMD is serve-only
  (`node dist/server.js`): Fly migrates via the `fly.toml`
  `[deploy] release_command`, and local compose keeps migrate-then-serve through
  the backend service `command:` override — which is why the compose health
  check still needs a long grace period on first boot. Base image is
  `node:24.22.1-slim`, not alpine — Prisma engines need glibc. The Node security
  floor is one contract: when the base image moves to a patched release, bump
  the `backend/package.json` `engines.node` floor and both `backend/` and
  `frontend/` `.node-version` pins in the same change.
- `buildApp()` is the only composition point; `server.ts` is the only place that
  calls `listen`. Bind `0.0.0.0` + injected `PORT`.

## Frontend quirks

- **Tailwind v4 is CSS-first**: `@tailwindcss/vite` plugin +
  `@import "tailwindcss";` in `src/index.css`. There is no `tailwind.config.js`;
  do not create one unless deliberately switching modes. shadcn is configured
  through `frontend/components.json` (`radix-nova`, `cn` aliases under `@/`).
- **React Compiler** runs via the `reactCompilerPreset()` Babel preset
  (`@rolldown/plugin-babel` in `vite.config.ts`) — it affects dev/build cost.
- TS flags that fail the build (`tsconfig.app.json`): `erasableSyntaxOnly` (no
  `enum`, `namespace`, or constructor parameter properties),
  `verbatimModuleSyntax` (type-only imports must be `import type`),
  `noUnusedLocals` / `noUnusedParameters`, `allowImportingTsExtensions`.
- **Routing is `react-router` v7** (`BrowserRouter` + `Routes` in `src/App.tsx`).
  `src/pages/*-page.tsx` are routed pages (`/` = Panel, `/mapas` = map +
  `TerritoryTable`, `/metodologia` = footer-only methodology, `/informes` =
  territory report with CSV download + `window.print` (its filters come from
  the URL like every page; the download must use `fetch`+blob because the
  endpoint is Bearer-protected — a plain anchor would 401), `/analisis` =
  redirect to `/analisis/causas`; all four tabs `causas`/`vehiculos`/`personas`/`tendencias`
  are live), `src/routes/route-error-boundary.tsx` and
  `src/routes/route-fallback.tsx` keep one broken or lazy page from blanking the
  shell (both live in `src/layout/Layout.tsx`, so a new section is one `<Route>`
  plus one nav flag), and `Layout.tsx` owns the nav table (all four sections —
  Panel, Mapas, Análisis, Informes — are enabled; nav links into `/analisis`
  and `/informes` carry the active `location.search`).
  `src/routes/analysis-layout.tsx` owns the **single** `useAnalysisQuery` and
  shares data through the router outlet context — tab pages are presentational
  and never fetch; tab links carry `location.search` so URL filters survive
  navigation. Panel keeps the base document title; other pages call
  `usePageEffects(pageTitle("…"))`. Dashboard
  filters live in the URL (`period`, `region`, `commune`), parsed and serialized
  by `src/lib/filters-url.ts` and read through `src/hooks/use-url-filters.ts` —
  never add a separate filter store. `src/hooks/use-dashboard-workspace.ts` owns
  the "one filtered query + one quiet national query for the map" rule; do not
  re-derive it per page.
- GeoJSON map: `d3-geo` `geoPath` requires **clockwise outer rings** (spherical
  right-hand rule). `mapshaper -o format=geojson` rewrites rings to RFC 7946
  CCW, which inverts every polygon (each `geoArea` ≈ 99.99% of the sphere) and
  breaks clicks. Validate any map asset with per-feature `geoArea` and
  `geoPath().bounds()`, never by projecting raw vertices. Join key is
  `properties.iso` ↔ region `abbreviation` (16/16), not numeric `codregion`;
  the projection fits mainland only (offshore islands would collapse the scale).
- Chart colors are the `--chart-1..5` and `--map-bin-*` tokens in
  `frontend/src/index.css` — change the palette there, not per component.

## Conventions

- UI copy, labels, and formatting are Chilean Spanish (`es-CL`); code, comments,
  docs, and commit messages are English. Conventional Commit messages, no AI
  attribution trailers.
- SOLID/KISS: one responsibility per component, small focused functions, props
  and types at boundaries, extend by adding rather than editing unrelated code;
  no premature abstraction.
- Tailwind style: short flat utility strings on the element they control,
  standard spacing scale, mobile-first (`sm:`/`md:`/`lg:` prefixes), prefer
  `w-full` over `w-screen` (`html` uses `scrollbar-gutter: stable`). Avoid
  arbitrary values, arbitrary child selectors, parent-driven overrides,
  `!important`.
- `.atl/skill-registry.md` is auto-generated by `gentle-ai skill-registry
  refresh`; never hand-edit it.

## Deployment notes

- Production targets are Cloud Run (API) + Cloudflare Workers static assets
  (SPA, Worker `accidentescarabineros`) + Neon (DB); production deploy is still
  an open ODD item (`odd/tasks/production-deployment-neon-cloud-run-pages.md`,
  whose Pages target predates the current Workers deployment). The frontend
  deploy config is `frontend/wrangler.jsonc` (`assets.directory: ./dist`,
  `not_found_handling: single-page-application`). Do not add `_redirects`:
  `/* /index.html 200` loops under Workers Assets and the API rejects it
  (`100324`). A `fly.toml` also exists
  (`backend-dawn-meadowland-5739`, 1 GB / 1 shared vCPU) from an earlier
  trial — confirm the target before touching deploy config, and never deploy,
  push, open a PR, or run remote operations without explicit user authorization.
- The API container and Neon branch previews assume 1 GB / 1 shared vCPU: keep
  aggregation in SQL and never load fact rows into Node.
