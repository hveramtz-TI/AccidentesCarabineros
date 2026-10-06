# Dockerized Production-Like Runtime

Feature document locator: `odd/tasks/dockerized-runtime.md`

## Objective

Define and provide a reproducible local production-like runtime for the public, aggregate-only AccidentesCarabineros dashboard: React/Vite static frontend, Fastify API, and PostgreSQL, orchestrated with Docker Compose.

## Problem and why

The current checkout has only a Vite starter frontend and a Fastify dependency with no backend entrypoint. It has no Dockerfiles, Compose configuration, or `.dockerignore`; the root `.gitignore` is empty. The app cannot currently be run end-to-end or exercised behind a production-style HTTP boundary.

## Confirmed product and architecture constraints

- Public dashboard; no login or authentication.
- Dashboard presents aggregate statistics only; no individual accident pages.
- Frontend: React + Vite. Backend: Fastify. Database: PostgreSQL.
- Do not inspect, import, package, or expose the untracked Excel files or person-level data. Public endpoints must not return identifying person/vehicle records.
- Keep frontend, backend, and database as separate services. Publish only the frontend/reverse-proxy port to the host; keep API and database on the Compose network.
- Do not deploy remotely, publish images, or delete named volumes.

## Scope

- Add a minimal Fastify API with liveness and PostgreSQL-backed readiness checks.
- Add a production frontend image that builds Vite assets and serves them through Nginx, proxying `/api/` to Fastify.
- Add a backend runtime image and a root Compose stack for frontend, API, and PostgreSQL, with health checks and persistent database storage.
- Add root/backend/frontend ignore rules and a safe local environment example; never commit secrets or dataset/build artifacts.
- Update README.md and AGENTS.md with the confirmed product boundary, local Compose workflow, and verified commands.
- Add focused backend tests without adding a third-party test framework if Node's built-in test runner is sufficient.

## Out of scope

- Building the dashboard UI beyond the current Vite starter shell.
- Database schema/migrations, importing real spreadsheets, seed data, or analytics endpoints.
- Public person-level or vehicle-level records, authentication, and production hosting/deployment.
- Changing the chosen Vite/Fastify/PostgreSQL stack.

## Task checklist

- [ ] **DR-01 — Run the selected stack in production-like containers.** Implement the minimal Fastify/PostgreSQL health path, production frontend/backend images, Compose orchestration, ignore/env files, documentation, and focused verification together as one deliverable.

## Authorized scope and route

- Branch: `feat/dockerized-runtime` (created from `main` before implementation).
- Route: delegated direct; one bounded writer because the task changes multiple non-trivial files and requires source/config research.
- Estimated authored diff: approximately 300 lines, excluding generated assets and lockfile churn. Delivery strategy: `ask-on-risk` (default); request a chain strategy only if forecast or actual authored changes exceed the established review budget.
- Preserve all existing untracked user data and scaffold files outside the specific authorized edit surfaces supplied to the writer.
- TDD: strict TDD is disabled and the current backend has no test command. Use a focused deterministic test with Node's built-in runner if it fits; otherwise record the concrete reason and verify via Compose health/readiness plus HTTP smoke checks.

## Acceptance criteria and checks

- `docker compose config` validates without embedding a committed secret or requiring edits to Compose.
- `npm run build --prefix frontend`, `npm run lint --prefix frontend`, and the backend focused test pass.
- The Compose stack reaches healthy status; frontend serves the Vite build and `/api/` reaches Fastify through the proxy.
- Liveness returns success independently; readiness reports database availability and fails when PostgreSQL is unavailable.
- PostgreSQL data persists in a named volume. No Excel files, `node_modules`, `.env`, or credentials enter either image or Git.
- Stop the stack without deleting the named volume; no remote deployment, image push, or data import occurs.

## Progress and evidence

- [x] Product boundaries and selected stack confirmed with the user.
- [x] Current checkout mapped; Docker artifacts are absent and the root `.gitignore` is empty.
- [x] Feature branch created before implementation.
- [ ] DR-01 implementation, checks, and work-unit commit pending.
- Next step: delegate DR-01 implementation, then reconcile the feature file and Engram mirror with observed checks and commit identity.
