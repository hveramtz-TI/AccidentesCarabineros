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

Normalization criteria recovered from history/AGENTS.md (must stay producer/consumer aligned): `trim → uppercase → strip accents (NFKD) → remove dots`, then joins against `excel/{comunas,Causas,accdt}.json` lookups (those files are in old history only).

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
4. Prisma schema + migration implementing the MER (entities: `siniestro`, `persona`, `vehiculo`; catalogs: `region`, `comuna`, `zona`, `causa`, `tipo_siniestro`, `tipo_vehiculo`, `servicio_vehiculo`).
5. Excel import pipeline: read → normalize → validate → load into Postgres, idempotent, with a row-level error report and post-import count reconciliation.
6. Docker: backend multi-stage `Dockerfile` (non-root, healthcheck), static frontend serve, `compose.yaml` (postgres + backend + frontend), `.dockerignore`.

## Out of scope

- Replacing frontend fixtures with API calls; new dashboard routes/segments; auth/admin writes; actual Cloud Run/Pages/Neon deploys; GitHub Actions workflow files (documented in README as the agreed CI/CD target; wiring comes with the first deploy slice); geocoding `KM`/`PARTE`/`TRIBUNAL` semantics beyond preserving them.

## Assumptions (overridable by the user)

- **A1** Backend language: TypeScript (matches frontend tooling and Fastify's TS DX).
- **A2** ORM: Prisma (continues the prior recorded target-stack decision; Postgres provider fits Neon).
- **A3** Production Excel source: **still open** (GCS bucket vs upload endpoint — never answered). Not blocking this slice: the importer reads a configured local directory (Docker read-only mount), behind an interface that a later GCS adapter can implement.
- **A4** Canonical IDs: surrogate PKs internally; the source `ID` preserved as `source_id` (integer) with a unique constraint on siniestros.

## Tasks

- [x] T1 `README.md`: production stack, ASCII/mermaid flow, local quick-start with Docker, current-status notes (frontend is mockup; importer pending first run).
- [x] T2 Fastify bootstrap: `backend/` TS project (`src/server.ts`), `/health`, `start`/`dev`/`build` scripts, `backend/.gitignore` (root `.gitignore` already existed in HEAD; no changes needed there). Check: `npm run build`, boot on `PORT=8080`, `curl /health` → 200.
- [ ] T3 `backend/docs/MER.md`: ERD + mapping tables + cardinality/consistency rules. Check: structural readback; every source column mapped exactly once; counts match evidence above.
- [ ] T4 Prisma schema + migration for the MER; applied against local Postgres. Check: `prisma migrate dev` clean on a fresh volume; FK/catalog constraints present.
- [ ] T5 Import pipeline + CLI (`backend/src/import/`): column rename map, normalization (trim/upper/deaccent/dots; date/time/number coercion), catalog upserts, FK validation with orphan report, idempotent re-run. Check: loaded counts equal 73,081 / 148,252 / 130,234; zero FK violations; the 2 vehicle-less siniestros reported, not dropped.
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
- RDD on (default): each work-unit commit gets `gentle-ai review assess --committed-only --base-ref <last reviewed boundary>`; route by `review_due`/`review_due_reason`.

## Progress

- 2026-10-08: document created after exploration (headers, row counts, ID overlaps, history stack, container contract). User approved Fastify-only plan; asked for this ODD. No implementation started.
- 2026-10-08: user authorized T1+T2. Branch `feat/backend-production-stack` created from `development` (`15d8f73`).
- **T1 done 2026-10-08** (route: direct inline): `README.md` rewritten with the confirmed production stack (Pages/Cloud Run+Fastify-only/Neon/GitHub Actions/Cloudflare edge), mermaid flow, repo layout, local dev commands, honest status (frontend mock; T6 Docker pending). Work-unit commit `99a2799` (README + this plan doc; user-staged `frontend/Design/*.png` deliberately excluded).
- **T2 done 2026-10-08** (route: delegated direct, one writer — writer trigger fired): Fastify TS bootstrap. `backend/package.json` (ESM, `dev`=tsx watch, `build`=tsc, `start`=node dist/server.js), `backend/tsconfig.json` (strict NodeNext → `dist/`), `backend/src/app.ts` (`buildApp()` composition factory, `GET /health` → `{status:"ok"}`), `backend/src/server.ts` (`0.0.0.0` + injected `PORT` default 8080, SIGTERM/SIGINT graceful close), `backend/.gitignore`. Work-unit commit `0e0d83e` (6 files; committed with explicit pathspec after plain `git commit` twice swept the user-staged Design PNGs — those were reset and left staged, untouched).
  - Verification evidence (writer + parent spot check): `npm install` exit 0; `npm run build` exit 0 (no type errors); boot smoke `PORT=808x node dist/server.js` + `curl -sf /health` → `{"status":"ok"}` (writer 8081/8082, parent re-ran 8083); `ss -ltn` proves `0.0.0.0` bind; dev mode (tsx) also serves /health. Test-first exception honored (no runner; build+smoke are the functional proof).
  - Discovery: root `.gitignore` **already existed tracked in HEAD** (covers node_modules, dist, .env, the three datasets, carabineros png) — plan premise and `AGENTS.md` "no root .gitignore / fresh clone has no code" section are outdated; reconcile AGENTS.md in T7.
  - Follow-ups noted: empty legacy dirs `backend/{controller,db,Models,routes,services}/` (invisible to git, need manual cleanup decision); T4/T5 must register plugins in `buildApp()`, never in `server.ts`; T6 still needs `.dockerignore`.

## Next step

- T3 (`backend/docs/MER.md`) then T4/T5 (schema + import).

## Open decisions

- A3: production Excel source (GCS vs upload) — answer needed before the deploy slice, not before T5.
- Whether `/health` + importer are the only API surface for now (assumed yes; dashboard read endpoints belong to the next slice).
