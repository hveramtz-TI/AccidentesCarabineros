# Neon connection check for the Fastify backend

## Objective

Use the backend's existing Prisma/PostgreSQL stack with Neon credentials supplied through the ignored backend `.env`, and provide a safe command that verifies connectivity with `SELECT 1`.

## Why

The Neon database has been loaded, but the Fastify backend still needs a reusable connection module and an explicit connectivity check. The Prisma schema already reads `DATABASE_NEON_URL`; credentials must remain in environment configuration and never be copied into source.

## Scope

- Reuse Prisma rather than adding a second PostgreSQL driver.
- Export a shared Prisma client and a read-only `SELECT 1` verification function from `backend/src/db/conection.ts` (retain the existing filename).
- Wire the dashboard repository to the shared client and keep its existing shutdown lifecycle.
- Add a backend script to load `.env` for local development and run the database check without printing the connection string.
- Execute the real check against the user-authorized Neon destination, plus backend tests and build.

## Constraints

- Read `DATABASE_NEON_URL` as defined by `backend/prisma/schema.prisma`; do not rename or duplicate the credential.
- Preserve `backend/.env` as ignored local state; do not read values into chat, task artifacts, logs, or commits.
- Only issue the read-only `SELECT 1` connectivity query; do not modify the Neon database.
- Keep the existing Prisma schema, migrations, and production-injected environment behavior unchanged.
- No existing deterministic test specifically covers live credentials/connectivity. Test-first RED is not applicable to that external integration; use the explicit database-check command as functional proof and run the existing deterministic backend suite.

## Tasks

- [x] T1 — Share the Prisma connection and add a safe Neon smoke check
  - Export the shared Prisma client and a typed `SELECT 1` check from `backend/src/db/conection.ts`.
  - Use the shared client in the dashboard repository without breaking route shutdown/disconnect behavior.
  - Add a `db:check` script that loads the backend `.env`, runs the query, reports success/failure without disclosing the URL, and disconnects cleanly.
  - Keep the existing pre-created, untracked connection file; do not overwrite or expose local `.env` values.
  - Run `npm test`, `npm run build`, and `npm run db:check` from `backend/`.

## Acceptance criteria

- `DATABASE_NEON_URL` remains the single Prisma runtime connection variable and is sourced from the ignored backend `.env` for local checks.
- Fastify's analytics repository and the connectivity check share the same Prisma client.
- `npm run db:check` executes `SELECT 1` and exits successfully against Neon, or reports a sanitized actionable failure.
- Backend tests and TypeScript build pass.
- No credential is present in tracked changes, console output, or this task document.

## Verification

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd backend && npm run db:check`
- `git diff --check`

## Delivery

- Route: delegated direct implementation (existing Fastify/Prisma flow was inspected; changes touch the connection module, dashboard service, and package scripts).
- Trigger evidence: multiple non-trivial files require modification; read-preparation is delegated with the write.
- Forecast: under 400 authored changed lines; one work-unit commit on `feat/neon-fastify-connection-check`.
- Delivery strategy: `ask-on-risk` (default); no PR or push is authorized.

## Progress

- T1: complete — Fastify's local `dev` command now loads `.env`; the dashboard repository and smoke check share one Prisma client.
- Verification evidence: `npm test` passed (31/31); `npm run build` passed; `npm run db:check` succeeded with `SELECT 1` (worker run and parent spot check); `git diff --check` passed.
- Assessment: RDD is off; read-only risk assessment classified the candidate as medium / under budget. The writer's self-verification passed.
- Commit identity: `7256f5a` — `feat(backend): add Neon Prisma connection check`.
- Next step: no implementation follow-up; run `npm run dev` from `backend/` when starting the local API.
