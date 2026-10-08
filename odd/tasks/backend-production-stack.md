# Backend Production Stack: Fastify + Excel Normalization + MER + Docker

## Objective

Stand up the production backend path for AccidentesCarabineros: document the agreed production stack in `README.md`, create a minimal Fastify service that satisfies the Cloud Run container contract, standardize the three root Excel datasets into a normalized PostgreSQL schema (Neon in production, `postgres:16` locally), document the MER, and provide a Docker Compose stack that proves the production-like flow locally. The frontend keeps its synthetic mock data this slice; no frontend rewiring.

## Problem

- The repo has no runnable backend: `backend/package.json` declares only `fastify ^5.12.5` — no `src/`, no scripts, no entrypoint.
- The three root Excel datasets are raw and inconsistent with the frontend contracts (`Siniestros_2025(1).xlsx`, `Personas_2025(1).xlsx`, `Vehiculos_2025(1).xlsx`); nothing ingests or normalizes them.
- There is no MER documentation and no README content describing the production architecture.
- Prior implementation (Express + Sequelize + MySQL, commit `5778e93`) is history only and conflicts with the confirmed target stack.

## Why

User confirmed the production stack (2026-10-08):

| Piece | Service |
| --- | --- |
| 🟧 Frontend hosting | Cloudflare Pages → React/Vite |
| 🟦 API | Google Cloud Run → **Fastify only** (explicitly no NestJS, no Express) |
| 🟩 Database | Neon → PostgreSQL |
| ⚫ CI/CD | GitHub Actions |
| 🟧 DNS/CDN/SSL | Cloudflare |

Docker is requested to test how the project would behave in production before deploying.

## Current evidence (explored 2026-10-08)

Source headers (row 1 of each workbook's single sheet):

- `Siniestros_2025(1).xlsx` — sheet `Siniestros Ene. a Dic. 2025`, 73,081 data rows:
  `ID, FECHA, MES, HORA, ZONA, COMUNA, TIPO, CAUSA, SECTOR, FALLECIDO, GRAVE, M_GRAVE, LEVE, ILESO, CALLE_1, CALLE_2, KM, PARTE, TRIBUNAL`
- `Personas_2025(1).xlsx` — sheet `Personas Ene. a Dic. 2025`, 148,252 data rows:
  `ID, FECHA, MES, HORA, COMUNA, ZONA, CALIDAD, SEXO, EDAD, RESULTADO`
- `Vehiculos_2025(1).xlsx` — sheet `Vehículos Ene. a Dic. 2025`, 130,234 data rows:
  `ID, FECHA, MES, HORA, COMUNA, ZONA, TIPO, SERVICIO`

Key/relationship facts measured directly from column A:

- `ID` is unique in Siniestros (0 duplicates) and repeats in Personas (max 95 rows/ID) and Vehículos (max 18 rows/ID) → **Siniestro 1:N Persona** and **Siniestro 1:N Vehículo**.
- ID overlap: Siniestros↔Personas = 73,081 (full); Siniestros↔Vehículos = 73,079 → **2 siniestros have no vehicle rows**. Personas↔Vehículos = 73,079.
- All IDs non-empty in the three files.

Approved canonical-data rule: `frontend/src/data/oversio-identifiers.json` is the authoritative region/commune catalog. Generate the same matching key on source and catalog names: trim → Unicode NFKD → strip combining marks → uppercase → retain only ASCII letters/digits. Store readable catalog names separately; map non-orthographic spelling variants through explicit commune aliases, never fuzzy matching.

Constraints and context:

- Cloud Run container contract: listen on `0.0.0.0` and the injected `PORT` (default 8080).
- ~~No root `.gitignore`~~ — disproved at T2: root `.gitignore` is tracked in HEAD and already covers node_modules/dist/.env/datasets; only `backend/.gitignore` was needed (done).
- Datasets (~22 MB total) must never be baked into Docker images or committed casually; mounted read-only for local import.
- Frontend single join point for future wiring: `frontend/src/lib/data.ts`; contracts in `frontend/src/types/dashboard.ts`.
- `git` branch context: work happens on a feature branch; `main` is the default. `frontend/Design/*.png` are staged user files — **do not include them in slice commits**; stage explicit paths only.
- No test runner exists in `backend/` → test-first exception; closure checks are build, runtime smoke, and import-count assertions.

## Scope (this slice)

1. `README.md` with the production architecture, flow diagram, component table, and local Docker usage.
2. Minimal Fastify backend (TypeScript): `$PORT` on `0.0.0.0`, `/health`, CORS-ready shell, npm scripts, `.gitignore` for backend + repo root.
3. MER documentation `backend/docs/MER.md`: Mermaid ERD, canonical tables/columns/types, cardinalities with the measured row facts, and the full Excel→canonical column mapping.
4. Prisma schema + migration implementing the MER (entities: `siniestro`, `persona`, `vehiculo`; catalogs: `region`, `comuna`, `comuna_alias`, `zona`, `causa`, `tipo_siniestro`, `sector`, `calidad_persona`, `sexo`, `resultado_persona`, `tipo_vehiculo`, `servicio_vehiculo`).
5. Excel import pipeline: read → normalize → explicit alias resolution → validate → load into Postgres, idempotent, with a row-level error report and post-import count reconciliation.
6. Docker: backend multi-stage `Dockerfile` (non-root, healthcheck), static frontend serve, `compose.yaml` (postgres + backend + frontend), `.dockerignore`.

## Out of scope

- Replacing frontend fixtures with API calls; new dashboard routes/segments; auth/admin writes; actual Cloud Run/Pages/Neon deploys; GitHub Actions workflow files (documented in README as the agreed CI/CD target; wiring comes with the first deploy slice); geocoding `KM`/`PARTE`/`TRIBUNAL` semantics beyond preserving them.

## Assumptions (overridable by the user)

- **A1** Backend language: TypeScript (matches frontend tooling and Fastify's TS DX).
- **A2** ORM: Prisma (continues the prior recorded target-stack decision; Postgres provider fits Neon).
- **A3** Production Excel source: **still open** (GCS bucket vs upload endpoint — never answered). Not blocking this slice: the importer reads a configured local directory (Docker read-only mount), behind an interface that a later GCS adapter can implement.
- **A4** Canonical IDs: surrogate PKs internally; the source `ID` preserved as `id_fuente` (integer). It is unique in the current 2025 file; if multiple periods are retained together, scope uniqueness by source period/import batch.

## Tasks

- [x] T1 `README.md`: production stack, ASCII/mermaid flow, local quick-start with Docker, current-status notes (frontend is mockup; importer pending first run).
- [x] T2 Fastify bootstrap: `backend/` TS project (`src/server.ts`), `/health`, `start`/`dev`/`build` scripts, `backend/.gitignore` (root `.gitignore` already existed in HEAD; no changes needed there). Check: `npm run build`, boot on `PORT=8080`, `curl /health` → 200.
- [x] T3 `backend/docs/MER.md` + canonical territory mapping: ERD, full Excel mapping, normalization/aliases, constraints and 3NF notes. Check: every source column covered; all 340 source commune labels resolve; 346 catalog commune keys/IDs unique.
- [x] T4 Prisma schema + migration for the MER; applied against local Postgres. Check: `prisma migrate dev` clean on a fresh volume; FK/catalog constraints present.
- [x] T5 Import pipeline + CLI (`backend/src/import/`): column rename map, normalization (trim/NFKD/uppercase/ASCII alphanumeric key; explicit aliases; date/time/number coercion), catalog upserts, FK validation with orphan report, idempotent re-run. Check: loaded counts equal 73,081 / 148,252 / 130,234; zero FK violations; the 2 vehicle-less siniestros reported, not dropped.
- [ ] T6 Docker: backend + frontend images, `compose.yaml`, `.dockerignore`, dataset mount `./data` read-only, healthchecks. Check: `docker compose up` → frontend 200, backend `/health` 200, migration applied, import run from inside the container against compose Postgres.
- [ ] T7 Closure: reconcile docs with observed reality (README commands actually work), record evidence + commit SHAs here.

## Acceptance criteria

- Fresh `docker compose up --build` serves the frontend shell and API `/health` locally; Postgres holds the normalized datasets with reconciled counts; an error report path exists for invalid/orphan rows.
- `README.md` describes the five confirmed production pieces and how this repo maps to them.
- `backend/docs/MER.md` fully specifies tables, columns, types, keys, cardinalities, and the Excel→canonical mapping, consistent with the Prisma schema (T4) that implements it.
- No Excel files or `node_modules` enter images or commits.

## Checks (runners)

- `cd backend && npm install && npm run build && npm run lint` (lint only if configured; do not invent one).
- `PORT=8080 node dist/server.js` (or `npm start`) + `curl -fs localhost:8080/health`.
- `npx prisma migrate dev` + `npx prisma validate` (T4).
- `node dist/import/cli.js --dir ../ --report out/report.json` then SQL count assertions (T5).
- `docker compose config -q`, `docker compose up --build -d`, curl checks, `docker compose down -v` (T6).

## Route

- T1: direct inline (single docs file, no research left unresolved).
- T2–T6: delegated direct — writer trigger fires (multiple non-trivial files per task); one bounded writer per task, sequential; readback of each returned file by parent.
- Preparation reads that feed T3/T5 are delegated with the writer, not accumulated in the parent.
- Test-first exception noted (no runner); T5 adds count-reconciliation assertions in its own CLI exit code as functional proof.

## Delivery

- Branch: `feat/backend-production-stack` (created at T2 first source write).
- Work-unit commits: one per completed task; stage explicit paths only; exclude staged `frontend/Design/*.png`.
- Strategy: `ask-on-risk` (default). Forecast authored lines ≈ 600–900 (backend TS + schema + import + Docker + docs) → exceeds the ~400 slice budget: slice boundaries planned at T1(docs) / T2(bootstrap) / T3(MER) / T4+T5(data) / T6(docker); PR-chain choice will be asked once before the first commit past budget if the user wants PRs.
- RDD reality check (updated at T4): the user-owned switch is **off (decided by global)**. Per the delegated-verification gate, T4's writer diff was assessed with `gentle-ai review assess`; it returned `risk: high`, reason `unassessable` (new untracked files), so writer self-verification **plus one independent read-only verifier** (`gentle-ai-verify`) was required. That verifier returned `verified`. No RDD review lifecycle/consent was started, per the disabled switch.
- Commit trap learned: a plain `git commit` commits the whole index, which swept the user-staged `frontend/Design/*.png` twice. All slice commits use an explicit pathspec. Consider asking the user to unstage those PNGs or commit them separately.

## Progress

- 2026-10-08: document created after exploration (headers, row counts, ID overlaps, history stack, container contract). User approved Fastify-only plan; asked for this ODD. No implementation started.
- 2026-10-08: user authorized T1+T2. Branch `feat/backend-production-stack` created from `development` (`15d8f73`).
- **T1 done 2026-10-08** (route: direct inline): `README.md` rewritten with the confirmed production stack (Pages/Cloud Run+Fastify-only/Neon/GitHub Actions/Cloudflare edge), mermaid flow, repo layout, local dev commands, honest status (frontend mock; T6 Docker pending). Work-unit commit `99a2799` (README + this plan doc; user-staged `frontend/Design/*.png` deliberately excluded).
  - Verification evidence (writer + parent spot check): `npm install` exit 0; `npm run build` exit 0 (no type errors); boot smoke `PORT=808x node dist/server.js` + `curl -sf /health` → `{"status":"ok"}` (writer 8081/8082, parent re-ran 8083); `ss -ltn` proves `0.0.0.0` bind; dev mode (tsx) also serves /health. Test-first exception honored (no runner; build+smoke are the functional proof).
  - Discovery: root `.gitignore` **already existed tracked in HEAD** (covers node_modules, dist, .env, the three datasets, carabineros png) — plan premise and `AGENTS.md` "no root .gitignore / fresh clone has no code" section are outdated; reconcile AGENTS.md in T7.
  - Follow-ups noted: empty legacy dirs `backend/{controller,db,Models,routes,services}/` (invisible to git, need manual cleanup decision); T4/T5 must register plugins in `buildApp()`, never in `server.ts`; T6 still needs `.dockerignore`.
- **T3 done 2026-10-08** (route: direct inline): added `backend/docs/MER.md` with the proposed PostgreSQL ERD, complete 37-column source map, source data profile, 3NF rationale, key/FK/index/delete constraints, and import validation rules. Updated `oversio-identifiers.json` as the sole canonical territory source by adding the four approved Región Metropolitana communes: El Monte (`XIII-49`), Isla de Maipo (`XIII-50`), Padre Hurtado (`XIII-51`), Peñaflor (`XIII-52`). Explicit alias map covers the five remaining spelling variants; punctuation/spacing/accent variants normalize directly. `python -m json.tool` and catalog validation passed: 16 regions, 346 communes, unique IDs/normalized names, 340 distinct Excel commune names resolved; all 37 source headers appear in the MER. `frontend/npm run build` passed (existing Vite config/chunk-size warnings only). Work-unit commit `5f8b57e`.
- **T4 done 2026-10-08** (route: delegated direct, one writer — writer trigger fired): Prisma 6.19.3 schema + initial migration implementing the T3 MER. `backend/prisma/schema.prisma` (15 models; camelCase fields mapped to snake_case columns; SmallInt region PK, text comuna PK, Date fecha, Time(6) hora, nullable SmallInt edad, BigInt PKs, RESTRICT on catalogs, CASCADE on `persona`/`vehiculo` → `siniestro`, `@@index` on all 14 FKs + `siniestro.fecha`); `backend/prisma/migrations/20261008183323_init/migration.sql` (generated DDL + 6 hand-appended CHECK constraints, since Prisma cannot express CHECKs in schema); `backend/.env.example` placeholder only; `db:generate`/`db:migrate`/`db:migrate:dev` scripts. Work-unit commit `3ea7d69` (6 files; explicit pathspec; user PNGs still staged and untouched).
  - Verification (writer + parent + independent): `prisma validate` valid; `npm run build` exit 0; migration applied on a fresh `postgres:16-alpine` (writer: 15 tables, 6 CHECKs, 14 FKs = 12 RESTRICT + 2 CASCADE, 44 indexes; parent spot check re-ran `migrate deploy` on a second fresh container → `All migrations have been successfully applied`, 16 public tables, 6 CHECKs, 2 CASCADE/12 RESTRICT); re-applied from scratch cleanly. Test-first exception (no runner).
  - Independent verifier (`gentle-ai-verify`, read-only) verdict: **verified** — no blocking/major/minor findings; 15 tables/14 unique indexes/15 indexes/12+2 FKs/6 CHECKs all match; schema↔migration column sets identical. Residual risks recorded (not contradictions): 11 `@db.Text` uniquely-indexed columns (fine for short keys); cross-table uniqueness between `comuna.nombre_estandarizado` and `comuna_alias.nombre_estandarizado_alias` is import-time validation only (MER §2); `id_fuente` uniqueness is global for the current single-period load.
  - Decisions/gotchas for T5: Prisma pinned to exactly `6.19.3` because Prisma 7 removed `datasource url = env(...)` from the schema (needs `prisma.config.ts` + adapter, outside the allowed surfaces) and the npm `latest` tags were internally inconsistent (RC CLI vs v7 client). BigInt columns (`siniestro_id`/`persona_id`/`vehiculo_id`/`id_fuente`) return JS `bigint` → serialize explicitly (the frontend later needs it too). CHECK constraints live only in `migration.sql`; Prisma will not recreate them — keep them with future schema evolution.
  - Boot-CI note for T6/T7: the readiness race seen during spot checks — Docker's published port accepts TCP before Postgres finishes initdb, so `pg_isready` via the unix socket is not enough; healthchecks must probe TCP (`pg_isready -h 127.0.0.1`) to avoid `P1001` flakiness.
- **T5 done 2026-10-08** (route: delegated direct, one writer; independent verifier required because `review assess` returned high/unassessable): Excel import pipeline + CLI in `backend/src/import/` (13 modules: cli, import, catalog, cell, datetime, normalize, aliases, commune, workbook, report + 4 test files). Work-unit commit `ac9e0d6` (16 files; ~1550 authored lines excluding the generated lock diff; explicit pathspec; user PNGs untouched).
  - Key decisions: `exceljs ^4.4.0` streaming WorkbookReader (formula/richText cell unwrap — child `MES` cells are formulas); Excel epoch 1899-12-30 with **all date/time arithmetic in UTC** (`@db.Date`/`@db.Time(6)`, verified round-trip `00:05:00`); idempotency = delete-by-imported-`id_fuente` scope (CASCADE clears children) + batched `createMany` (2k/5k/5k, id-map via chunked `findMany` ≤15k); catalogs/lookups upserted by PK / `nombre_estandarizado`; aliases seeded into `comuna_alias`; canonical-key wins over alias; unknown labels are row errors, never fuzzy; BigInt-safe report replacer; `--expect-*` mismatch and row errors → exit 1.
  - Verification: test-first RED observed (3 fail, modules missing) → GREEN 14/14. Parent full re-verification: clean `rm -rf dist && build`, `npm run test`, fresh container 55437 → `migrate deploy` + import #1 (73081/148252/130234, errors 0, exit 0), idempotency #2 unchanged, `--reset` unchanged, SQL: orphans 0, region 16/comuna 346/alias 5, lookups 16/15/70/2/4/3/5/38/22, edad null 23918, XI-1=313 (COYHAIQUE alias), VIII-33=13 (ALTO BIO-BIO normalizer), round-trip id 5660 matches workbook; vehicle-less ids 31355, 50010 reported. Import ≈30s.
  - Verification-driven corrections: (1) writer had modified `backend/.env.example` out of scope (added misspelled `CONECTIONKEY=`) — parent reverted to HEAD before commit; (2) verifier found `cellToInteger` accepted whitespace-only cells as `0` — parent added `cell.test.ts` (RED on `"   "` → fix `cell.ts` → GREEN 18/18) and re-ran e2e import (still exact counts, exit 0).
  - Independent verifier (`gentle-ai-verify`, read-only): verdict **verified** on all 10 checklist items; independently re-implemented the normalizer in Python over the real catalog JSON (no collisions; alias targets exist; ALTO BIO-BIO/O"HIGGINS resolve without aliases); lockfile additions proven to be only exceljs's transitive closure. Accepted minors/follow-ups: delete scope covers parsed ids only (stale rows could survive a *degraded* re-run of changed data — design note for multi-year); `tsc` also emits `*.test.js` into `dist/` (harmless); BigInt coercion via `Number` would lose precision above 2^53 (ids are 5 digits; note for future batches); MES-mismatch/child-validation have no unit tests yet.
  - T6 needs: image must `COPY` the catalog JSON and datasets are runtime-mounted (both git-ignored); `db:import` expects repo-root cwd; `DATABASE_URL` required; importer safe to re-run on deploy.

## Next step

- T6 (Docker: backend + frontend images, compose with Postgres, dataset mount, healthchecks), then T7 closure.

## Open decisions

- A3: production Excel source (GCS vs upload) — answer needed before the deploy slice, not before T5.
- Whether `/health` + importer are the only API surface for now (assumed yes; dashboard read endpoints belong to the next slice).
