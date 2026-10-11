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

- [x] T2 — Profile data and agree on indicator definitions
  - Review distributions, missing values, category cardinalities, date coverage, and territory coverage from the loaded database.
  - Evaluate candidates already represented in the dashboard: accident totals, monthly trends, fatalities/injuries/severity, and territory ranking.
  - Evaluate additional useful breakdowns supported by the files: cause/type/sector, person outcomes and demographics, and vehicle type/service.
  - For every approved indicator, record its definition, source columns/tables, aggregation grain, formula, supported filters, and caveats in `backend/docs/dashboard-metrics.md`.
  - Obtain user agreement on the metric definitions before finalizing API response fields.

- [x] T3 — Define the API contract
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

- T2 must finish with agreement on indicator definitions before T3's response contract is fixed. **DONE 2026-10-10: 4 KPIs approved (accidentes, fallecidos, lesiones totales, lesionados graves); `activeCases` replaced.**
- `activeCases` remains excluded unless the user approves a source-backed definition. **Resolved: replaced by Lesionados graves.**
- Any schema change or indicator requiring data absent from the 2025 files must be surfaced before implementation.

## Delivery

- Branch: `feat/backend-production-stack` (continues the prior production-stack branch; same unreviewed-by-RDD reality — switch globally off).
- Strategy: `ask-on-risk` (default). Running authored-change count from this ODD's work-unit commits ≈ 380 lines through T3 (`6363f0d` 106, `7a0fc7d` 2, `5fedf70` 109, `c843bc4` 16, `551a116` 147). The T4 implementation commit is forecast to cross the ~400-line slice budget (≈500–800 lines: service/controller/routes/types/tests + wiring). PR slicing/chain remains the user's call; no push/PR is implied by the work-unit commits on this feature branch.
- Work-unit pattern: one commit per task (code + docs), ODD evidence recorded in follow-up `docs(odd)` commits with explicit pathspecs (the `frontend/Design/*.png` staged files stay untouched).

## Next step

T4: implement the read API per the contract in `backend/docs/dashboard-api.md` §8 (routes/controllers/services/types under `backend/src/`). Route: delegated direct (writer trigger: 4+ non-trivial files). Test-first applies: add failing route/service tests against the contract baselines before implementing. Keep importer tests green.

## Progress

- **2026-10-10 — T1 complete (local Docker only):** the three fact tables were empty before import. `docker compose run --rm importer` completed with status `ok` in 30,449 ms; inserted 73,081 siniestros, 148,252 personas, and 130,234 vehiculos; skipped 0 rows and reported 0 errors. Catalog seeded 16 regions, 346 communes, and 5 aliases; the two valid siniestros without vehicles were source IDs `31355` and `50010`. Work-unit commit: `6363f0d`.
- **2026-10-10 — T1 re-verification (live):** importer re-run idempotent: `status: ok (31,163 ms)`, rows read/inserted 73,081 / 148,252 / 130,234, skipped 0, errors 0, the same two vehicle-less siniestros (31355, 50010). Independent SQL: orphans 0 / 0, `no_vehicle=2`, `fecha` 2025-01-01..2025-12-31, 340 communes with accidents, all 16 regions covered. `GET :8080/health` → `{"status":"ok"}`; frontend `:3200` → 200. Duplicate `id_fuente` = 0; 6 CHECK constraints verified live via `pg_constraint`.
- **2026-10-10 — T2 profiling evidence (live SQL, local Docker only; read-only explorer had no shell, so the parent executed its prepared batch inline):**
  - **Cross-grain reconciliation (exact):** accident-level sums equal person-level outcome counts — fallecidos 1,507; graves 7,060; menos_graves 3,392; leves 31,253; ilesos 105,040. Fatal personas by sexo: 1,172 M + 335 F = 1,507. No double-count risk: either grain may be used; person grain adds sexo/edad/calidad.
  - **Monthly:** accidents 5,458–6,791 (peak Mar 6,791; low Feb 5,458); fatalities 102–152/mo; injuries (grave+m_grave+leve) 41,705 total.
  - **Severity (MECE, accident grain):** fatal 1,339 (1.8%) / serious 6,018 / minor 21,757 / only_ilesos 43,967; "all-zero" bucket = 0.
  - **Hour (3h buckets):** peak 15–18h (13,498) and 18–21h (13,395); trough 00–03 (3,334). Exactly `00:00:00` rows: 234 (0.3%) — time-missing artifacts, keep but disclose.
  - **Territory:** XIII 20,293 (27.8%), VIII 8,196, V 7,231, VII 6,971, IX 5,588; top comunas: Temuco 2,079, Antofagasta 1,891, Concepción 1,843, Puente Alto 1,662. Per-commune range 1–2,079; 6 catalog communes have zero accidents.
  - **Causa:** top cause "conductor no atento" 32,999 (45.1%); ebriedad 5,444 (110 deaths); "velocidad no razonable" 2,540 accidents but 253 deaths — highest lethality; 7 of 70 causas have <10 accidents → 'other' tail.
  - **Tipo/sector:** colisión lateral 16.7%, colisión 14.6%, choque 12.3%; urbano 74.2% / rural 25.8%.
  - **Persona:** conductor 71.3%, se da a la fuga 13.1%, pasajero 10.7%, peatón 4.9%; masculino 70.5%, femenino 25.1%, se ignora 4.3%; edad NULL 23,918 (16.1%); age bands: 0–17: 5,255; 18–25: 15,942; 26–40: 45,651; 41–64: 46,236; 65+: 11,250.
  - **Vehículo:** 1.782 rows/siniestro avg (LEFT JOIN incl. the 2 zeros), max 18; automovil in 70.1% of accidents, camioneta 23.5%, jeep 14.6%, motocicleta 9.0%; servicio particular 85.7% of rows.
  - **Skip list (measured):** tribunal 502 values; calle_2 blank 37,772 (51.7%); km blank 36,369 (~49.8%); geocoding absent by scope.
- **Route:** T1 re-verify + T2 profiling inline (single bounded bash batch after the explorer's blocked return; no writes to app code).
- **2026-10-10 — T2 gate cleared, T2 complete:** user required exactly 4 KPIs. `activeCases` rejected (synthetic); **Lesionados graves** (`SUM(lesionados_graves)`, national 7.060, monthly series available) approved as the 4th KPI after comparing trade-offs vs "siniestros con fuga". All other proposed indicators approved as-is. Formulas, national baselines, MECE severity buckets (incl. `only_ilesos` replacing synthetic "Property damage"), cross-grain reconciliation table (Δ=0 on all five outcomes), caveats (234 zero-hour artifacts, 16.1% NULL edad, ZONA≠region, 6 zero-accident communes) and the measured skip list are recorded in `backend/docs/dashboard-metrics.md` (written in Spanish per the docs-folder convention of `MER.md`). That document is now the single source of truth for T3/T4; the API may not define indicators outside it. Metrics-doc commit: `5fedf70`; ODD evidence commit: `c843bc4`.
- **2026-10-10 — T3 complete (route: direct inline, single contract doc, no unresolved research):** fixed `backend/docs/dashboard-api.md` — one aggregate `GET /api/dashboard` (all approved sections in one pass; no section-split endpoints without a consumer), validated query params (`from`/`to` ISO within 2025, `regionId` 1..16, `communeId` with cascade precedence), full 200 response shape with metric→field traceability table (K1–K4, SER/SEV/TRR/CAU/TIP/SEC/HOU/VEI/PER), error contract (400 VALIDATION_ERROR with field details; 500 INTERNAL without DB leakage), ordering/stability rules (top-N desc + code tiebreak; dense guaranteed arrays for months/severity/hour/age), empty-scope semantics (`emptyScope: true` with zeros — never national substitution), mandatory caveats riding in responses (midnight artifacts, non-additive vehicle shares, unknown age/sex bands), `Cache-Control: no-store`, no BigInt exposure, and the T4 file map (routes/controllers/services/types, plugin registered from `buildApp()`, parameterized `$queryRaw` only for month/hour bucketing). Decision per ODD rule: NO territory-selector endpoint — frontend keeps the versioned canonical catalog; CORS deferred to the wiring slice. Response fields are locked to the `dashboard-metrics.md` bases for T5 reconciliation.
