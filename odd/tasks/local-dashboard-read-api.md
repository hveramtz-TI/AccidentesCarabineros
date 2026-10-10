# Local Data Load and Dashboard Read API

## Objective

Load the 2025 Excel datasets into the local Docker PostgreSQL database, agree on defensible dashboard indicators from the real data, and implement a tested, read-only Fastify API for those indicators. Keep the frontend on its current synthetic fixtures during this slice.

## Current state

- The local Docker Compose stack is running: PostgreSQL, Fastify backend, and the static frontend are healthy.
- The local database `accidentes` has the single Prisma migration applied; `prisma migrate status` reports the schema is up to date.
- `docker compose run --rm importer` already imports the three root Excel files, checks expected row totals, and emits an import summary. It is idempotent for the current 2025 files.
- All three source workbooks are present in the repository root. The existing Docker importer mounts them read-only.
- The backend currently exposes only `GET /health`; `buildApp()` is its route composition point.
- The frontend dashboard still derives its figures from synthetic fixtures. Frontend-to-API wiring is explicitly deferred.

## Why

The user wants to prove the full data-to-API path locally before connecting the dashboard or deploying to Neon. The indicators must be agreed from the actual source data, rather than inferred from synthetic fixture labels.

## Scope

1. Verify the current local row counts and load the Excel workbooks into the Docker database if they are absent or incomplete.
2. Profile the imported data and agree on indicator definitions, filters, and known limitations.
3. Define the read API contract around the agreed dashboard use cases.
4. Implement and test Fastify services, controllers, and routes against the local PostgreSQL database.

## Out of scope

- Replacing or wiring the frontend synthetic fixtures to the API.
- Running migrations, imports, or queries against Neon; deploying to Neon, Cloud Run, or Cloudflare.
- Authentication, authorization, write/admin endpoints, or generic CRUD for every table.
- Adding geocoding or map geometry. The current data model has no accident coordinates.
- Adding new source datasets or multi-year support.

## Constraints and data rules

- Keep the canonical territory catalog at `frontend/src/data/oversio-identifiers.json`; resolve region through `siniestro.comuna_id → comuna.region_id`. `ZONA` is a separate source dimension, not a region identifier.
- Reconcile current workbook row counts to 73,081 siniestros, 148,252 personas, and 130,234 vehiculos. The two siniestros without vehicle rows are valid and must be retained.
- Do not double-count injuries or fatalities when combining accident-level count columns with person-level outcomes. Each indicator needs an explicit source, grain, and formula.
- The current `activeCases` KPI is synthetic (derived using a 6.6% factor). Do not present it as a real API metric until the user defines a source-backed meaning and calculation.
- Use parameterized database queries and validate all API query parameters. Keep aggregations in the database rather than loading all fact rows into application memory.
- Prefer the existing Prisma schema. If profiling shows a required schema change, document and approve it before creating a migration; apply and verify that migration locally first.

## Tasks

- [x] T1 — Establish local data state and import
  - Query the local Compose database for current fact-table counts before importing.
  - If required, run `docker compose run --rm importer` (without `--reset`) against the local Compose database.
  - Save the importer summary and reconcile inserted counts, skipped rows, lookup/catalog counts, foreign-key integrity, and vehicle-less accidents.

- [ ] T2 — Profile data and agree on indicator definitions
  - Review distributions, missing values, category cardinalities, date coverage, and territory coverage from the loaded database.
  - Evaluate candidates already represented in the dashboard: accident totals, monthly trends, fatalities/injuries/severity, and territory ranking.
  - Evaluate additional useful breakdowns supported by the files: cause/type/sector, person outcomes and demographics, and vehicle type/service.
  - For every approved indicator, record its definition, source columns/tables, aggregation grain, formula, supported filters, and caveats in `backend/docs/dashboard-metrics.md`.
  - Obtain user agreement on the metric definitions before finalizing API response fields.

- [ ] T3 — Define the API contract
  - Define validated period and territory filters consistent with the approved metrics and the current single-year (2025) dataset.
  - Start with dashboard read use cases, not table-shaped CRUD. Candidate contract: one aggregate dashboard endpoint returning only the approved summary, trend, severity, and territory results.
  - Decide whether region/commune selectors need API endpoints or can continue using the versioned canonical catalog; do not add endpoints without a consumer.
  - Document request parameters, response types, ordering, empty-result behavior, and validation errors before implementation.

- [ ] T4 — Implement the read API
  - Add focused analytics services for approved queries, controller handlers for validation/HTTP mapping, and Fastify route plugins.
  - Register route plugins from `buildApp()`; keep `server.ts` responsible only for starting and stopping the server.
  - Use Prisma operations where they express the required aggregation clearly; use parameterized SQL only for queries that need it.
  - Return aggregates and canonical labels/IDs required by the contract; never expose synthetic fixture values as official data.

- [ ] T5 — Verify locally
  - Add service and route tests for approved formulas, period/region/commune filters, invalid parameters, and empty scopes. Keep the existing importer tests.
  - Ensure the backend test command includes the new API tests without dropping the importer tests.
  - Run backend tests and build; smoke the new endpoints against the running local Compose database.
  - Reconcile API results with independent SQL aggregates for representative national, regional, commune, and period filters.

## Acceptance criteria

- Local import counts match 73,081 / 148,252 / 130,234 with zero importer errors, zero orphaned person/vehicle rows, and both vehicle-less siniestros retained.
- Approved indicator definitions are recorded and traceable to source columns and aggregation rules; ambiguous or synthetic indicators are excluded until resolved.
- Read endpoints implement only the approved contract, validate filters, and return database-derived aggregates.
- Service/route tests, backend build, local endpoint smoke checks, and independent SQL reconciliations pass.
- `GET /health` remains healthy; no frontend or production database is changed in this slice.

## Checks

- `docker compose run --rm importer`
- Run SQL count and relationship-integrity checks against the local Compose PostgreSQL service.
- `cd backend && npm test`
- `cd backend && npm run build`
- Exercise the documented API requests against `http://localhost:8080` and compare returned aggregates with SQL.

## User decision gates

- T2 must finish with agreement on indicator definitions before T3's response contract is fixed.
- `activeCases` remains excluded unless the user approves a source-backed definition.
- Any schema change or indicator requiring data absent from the 2025 files must be surfaced before implementation.

## Next step

Continue with T2: profile the loaded data and agree on indicator definitions before locking the API contract.

## Progress

- **2026-10-10 — T1 complete (local Docker only):** the three fact tables were empty before import. `docker compose run --rm importer` completed with status `ok` in 30,449 ms; inserted 73,081 siniestros, 148,252 personas, and 130,234 vehiculos; skipped 0 rows and reported 0 errors. Catalog seeded 16 regions, 346 communes, and 5 aliases; the two valid siniestros without vehicles were source IDs `31355` and `50010`. Work-unit commit: `6363f0d`.
- **Independent SQL verification:** local totals match 73,081 / 148,252 / 130,234; orphan personas = 0; orphan vehiculos = 0; siniestros without vehicles = 2. No Neon or production database was accessed.
- **Next:** T2 data profiling and user agreement on indicators. Keep `activeCases` excluded unless a source-backed definition is approved.
