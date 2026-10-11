# Production Deployment: Neon, Cloud Run, and Cloudflare Pages

## Objective

Deploy the verified dashboard stack to production: provision/validate the selected Neon PostgreSQL target, migrate and load the approved 2025 data, deploy the Fastify API to Cloud Run, and publish the Vite frontend to Cloudflare Pages. Complete a production browser-to-API smoke without exposing credentials or changing unrelated services.

## Current state

- Local integration is implemented in the current repository: commits `2a31ece` (backend Bearer/CORS) and `99947cd` (frontend API integration and local env wiring). At plan creation, `development` is clean and aligned with `origin/development`; verify the deployable source/ref again before execution.
- The local Compose flow was verified against PostgreSQL with the national KPI baseline `73,081 / 1,507 / 41,705 / 7,060` and expected import counts `73,081 / 148,252 / 130,234` for accidents, people, and vehicles.
- Backend is Fastify + Prisma `6.19.3`, PostgreSQL provider (`backend/prisma/schema.prisma`), with `db:migrate` and `db:import` scripts in `backend/package.json`.
- The backend image is built from the repository root (`backend/Dockerfile`) and currently runs `prisma migrate deploy` on every container start before serving. Cloud Run can start multiple instances; this startup coupling must be removed before production deployment and migrations must run as a deliberate one-off release step.
- The importer requires `DATABASE_NEON_URL`, reads the source workbooks and canonical catalog, and supports expected row-count assertions. Do not use `--reset` against an existing production branch without explicit authorization.
- `Neon.md` records candidate Neon project `crimson-sunset-13986365`, branch `production`, and a Neon CLI/MCP onboarding sequence. Verify both identities with Neon before any write. The Neon MCP tools were not exposed in the authoring runtime; enable/link them before the first Neon action. Use the Neon CLI only if separately authorized as the fallback.
- Cloud Run project/region/service/Artifact Registry identifiers, Cloudflare Pages project/production domain, and the exact final CORS origin have not been confirmed in this plan.
- Production variables must be distinct from local development values. The frontend `VITE_UUID_CONNECTION` is public and extractable from the static bundle; it is a request barrier, not user authentication.

## Why

The local browser-to-API flow and data contract are verified, but no production database, API service, frontend deployment, or production secrets have been configured. This ODD turns the documented Neon → Cloud Run → Cloudflare Pages handoff into a gated, verifiable deployment sequence.

## Scope

1. Verify access and exact target identities for Neon, GCP, and Cloudflare; record the production Pages origin before configuring backend CORS.
2. Inspect and protect the Neon production branch; rehearse the migration/import process on an authorized staging branch when available.
3. Separate schema migration from Cloud Run instance startup; use pooled runtime connectivity and direct connectivity for Prisma migration/import operations when supported by the selected Neon endpoints.
4. Apply the existing Prisma migrations and import only the approved 2025 datasets, with expected-count and KPI validation.
5. Build/publish the backend image, run migrations as a single release action, configure Cloud Run secrets/runtime/CORS, and deploy the API.
6. Configure Cloudflare Pages build values and deploy the frontend against the Cloud Run URL.
7. Verify auth, health, CORS, filters, baseline metrics, browser rendering, logs, and rollback readiness.

## Out of scope

- Changing the approved schema, dataset, importer normalization, dashboard API contract, KPI definitions, or frontend design.
- Enabling login, Cloud Run IAM authentication for browser requests, a BFF/proxy, rate limiting, or representing the static Bearer value as a confidential secret.
- Changing domains, DNS, billing, organization policies, or unrelated Cloudflare/GCP/Neon resources.
- Destructive database reset, deleting Neon branches/projects, promoting/replacing a branch, or overwriting data without a separate explicit user decision.
- Push, pull request, merge, or release promotion unless explicitly authorized under ordinary repository policy.

## Remote authorization and safety gates

- This document authorizes planning only. **It does not authorize remote reads, remote writes, file transfer, cloud resource creation, deployment, or secret changes.** Before any remote action, obtain explicit authorization for the destination, operation, and credential/session to use; delegation cannot expand that authorization.
- Verify the exact Neon project and branch through Neon MCP. `Neon.md` is a candidate target, not proof of current remote state. Stop if project/branch identity is ambiguous or the production branch contains unexpected schema/data.
- Prefer Neon MCP for Neon resource inspection/branch management and bounded SQL verification. Use this repository's Prisma CLI for Prisma migrations and its importer for Excel ingestion; MCP SQL is not a substitute for the application's importer/normalization pipeline.
- `neon deploy` applies declarative `neon.ts` configuration; it does not deploy the Fastify application, apply Prisma migrations, or import the source workbooks. Do not run it unless a reviewed task explicitly requires a Neon Config change.
- Do not send production database URLs, Bearer values, service-account credentials, or source data through chat, Git, command output, build logs, or public artifacts. Use Secret Manager and ephemeral process environments. Do not reuse the local development token.
- Confirm that a publicly invokable Cloud Run service is acceptable for the static browser client. The current frontend cannot attach a Cloud Run IAM identity; the public Bearer value remains extractable/replayable and does not prevent invocation cost. This is distinct from accepting token visibility and requires explicit production confirmation.
- Confirm explicit authorization to transfer the local 2025 workbooks to the selected Neon production target before importing them.
- Preserve an identifiable pre-change Neon recovery point before production writes. Never run importer `--reset` by default. If the target already contains data or migration history that is not explained by the deployment, stop and ask before proceeding.
- Keep the previous Cloud Run revision and Pages deployment available until smoke checks pass. Database rollback is not automatic; use the recovery point and a human-approved recovery decision.

## Architecture / implementation constraints

- The Prisma datasource uses `DATABASE_NEON_URL` for runtime traffic and `DIRECT_URL` for Prisma Migrate. Verify the selected Neon runtime and direct endpoints before wiring them, and pass each only to the appropriate process. The one-shot importer uses `DATABASE_NEON_URL` through the existing Prisma client contract.
- Remove `prisma migrate deploy` from the default Cloud Run container startup so autoscaled instances do not all attempt release migrations. Keep local Compose behavior explicit (e.g. a Compose command override) and run production migrations once, before routing traffic, using a dedicated one-off Cloud Run Job or an equivalently controlled release runner.
- Use the image built from the repository root with the canonical catalog included. The Cloud Run service must bind `0.0.0.0` and honor injected `PORT`.
- Production secret values: pooled `DATABASE_NEON_URL` for API runtime, direct `DIRECT_URL` for the migration process, and a newly generated `UUID_CONNECTION`. Cloud Run CORS configuration is a non-secret exact-origin value. Cloudflare Pages build inputs are `VITE_API_BASE_URL` and `VITE_UUID_CONNECTION`; the latter is intentionally public.
- CORS allowlist must contain the exact production Pages origin only (plus any separately justified origin explicitly approved); do not guess a `pages.dev` or custom-domain host.

## Tasks

- [ ] P0 — Confirm deployment targets, source ref, and authorizations
  - Record the intended deployable Git ref/commit and ensure it includes the local API integration.
  - Confirm Neon project/branch, GCP project/region/service and Artifact Registry destination, Cloudflare Pages project/production branch, and the final browser origin.
  - Obtain explicit remote authorization for Neon inspection/writes, data transfer, GCP resource/secret/image/service operations, Cloudflare build-variable/deployment operations, and public Cloud Run invocation.
  - Record which credential/session is authorized for each destination without copying its secret into this task file.
  - Route: direct, parent-owned decision gate; no remote access before it is satisfied.

- [ ] P1 — Inspect Neon and prepare a safe rehearsal/recovery point
  - Enable/link Neon MCP following `Neon.md`, then verify the candidate project and `production` branch identity and current state through Neon MCP.
  - Inspect PostgreSQL version, schema/migration history, table/data presence, compute/endpoint connection options, and whether the existing branch is safe to receive this dataset.
  - Create or identify an authorized staging/rehearsal branch and a pre-change recovery point before production writes; do not promote/replace branches automatically.
  - If Neon MCP is unavailable, stop before remote mutations and ask whether to use the documented Neon CLI fallback.
  - Route: bounded remote inspection/branch operations, only after P0 authorization; parent records redacted evidence.

- [ ] P2 — Make migration execution safe for Cloud Run
  - Change the default backend container command to start the API without applying migrations; configure local Compose to retain its verified migration-before-serve behavior explicitly.
  - Use pooled `DATABASE_NEON_URL` for runtime traffic and direct `DIRECT_URL` for Prisma migrations; preserve the local PostgreSQL workflow and do not expose `DIRECT_URL` to frontend builds.
  - Establish a one-off migration release command/job using the same built backend image and verify it completes before service traffic is shifted.
  - Add/adjust checks for Prisma schema validation, client generation, backend build/tests, and the Compose image/command behavior.
  - Test-first policy: use a deterministic regression check for the startup/migration command boundary if feasible; otherwise document the configuration-only exception and verify the image/job commands directly.
  - Route: delegated direct writer for the multi-file Docker/Compose/Prisma change; exact edit surfaces to be derived before launch. Estimated source/config diff: under 150 authored lines; reassess actual diff.

- [ ] P3 — Rehearse and load the Neon database safely
  - On the authorized staging branch, run pending Prisma migrations using the direct connection and inspect the resulting schema.
  - Verify the local source workbooks and canonical catalog are available and unchanged; import through the repository CLI, not ad hoc SQL.
  - Use expected row counts `73081 / 148252 / 130234`; do not pass `--reset`. If existing data, duplicates, or unexpected migration history prevent a safe idempotent import, stop and request a decision.
  - Query and record redacted evidence for national KPI values `73081 / 1507 / 41705 / 7060`, key table counts, and the API's empty-scope behavior.
  - Route: authorized bounded commands against staging, with a fresh execution worker if needed; no production import until rehearsal and explicit production-write authorization pass.

- [ ] P4 — Apply the production database release
  - Re-verify the exact production project/branch immediately before mutation and establish the approved recovery point.
  - Apply the reviewed migrations once, then import the approved source data without reset; capture the serialized import report without exposing paths or connection strings.
  - Verify all expected row counts and KPI baselines directly against the production API/database; do not deploy the frontend against an unverified dataset.
  - Stop on any mismatch, unexpected existing data, timeout, or ambiguous mutation outcome; do not blindly retry an import.
  - Route: one explicitly authorized production write action, parent-monitored and evidence-recorded.

- [ ] P5 — Deploy the API to Cloud Run
  - Build and publish the backend image from repository-root context to the confirmed Artifact Registry repository, using the approved source ref.
  - Configure Secret Manager references for runtime database connectivity and the new production `UUID_CONNECTION`; configure exact `CORS_ALLOWED_ORIGINS` with the confirmed Pages origin.
  - Run the migration job once before deploying/serving the new API revision. Deploy the service with `PORT` handling, health check, resource/scale settings, and the explicitly approved public invocation model.
  - Smoke the tagged/new revision before shifting production traffic where feasible; confirm `/health`, valid/invalid Bearer outcomes, database-backed KPI baseline, and CORS headers.
  - Route: bounded GCP deployment actions under exact P0 authorization; preserve the previous revision and do not change unrelated project settings.

- [ ] P6 — Configure and deploy Cloudflare Pages
  - Confirm the selected Pages project, production branch, root directory `frontend/`, and build command `npm run build`.
  - Set public build inputs `VITE_API_BASE_URL=<Cloud Run URL>` and `VITE_UUID_CONNECTION=<same production Bearer value>` through the authorized Pages configuration; never copy the token into source or task documents.
  - Build/deploy only after the API smoke passes; preserve the prior successful Pages deployment for rollback.
  - Route: bounded Cloudflare configuration/deployment under exact P0 authorization.

- [ ] P7 — Verify end-to-end behavior and close the release
  - From the deployed Pages origin, verify preflight and API CORS, valid token → `200`, missing/invalid token → `401`, public `/health`, and no CORS access from an unapproved origin.
  - Browser-check national, quarter, region, commune, empty commune, loading/error/retry behavior, and absence of synthetic fixture fallback.
  - Confirm national KPIs `73081 / 1507 / 41705 / 7060`; compare the API response to the verified production database baseline.
  - Review Cloud Run and Pages logs for startup/migration failures and confirm no secrets or tokens were logged. Record deployed revision IDs and URLs, not credentials.
  - Keep rollback available until checks pass; rollback service traffic/Pages deployment only with the authorized release procedure. Do not attempt an automatic destructive database rollback.
  - Route: independent, read-only verification after deployment; report every failed, skipped, or unavailable check.

## Acceptance criteria

- Neon project/branch identities are verified; a recovery point exists; production schema and import counts are correct without resetting existing data.
- Prisma migrations run once as a release action, not at every Cloud Run instance startup; local Compose remains operational.
- Cloud Run serves the verified database-backed API using Secret Manager-backed runtime values, exact-origin CORS, and the explicitly approved public browser access model.
- Cloudflare Pages builds against the deployed Cloud Run API with matching production Bearer value; public token visibility is documented and accepted.
- End-to-end browser and HTTP smoke checks pass, including filters, empty state, KPI baseline, auth, health, and CORS.
- Previous Cloud Run and Pages revisions remain available through acceptance; no unrelated remote resources changed.
- No secret, connection string, or raw production credential is committed or printed in logs.

## Checks

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd backend && npx prisma validate`
- `cd backend && npm run db:generate`
- `docker compose build backend` and local Compose health/migration smoke (preserve the existing Postgres volume).
- Neon staging migration, importer expected-count checks, and SQL/API baseline checks, only after explicit authorization.
- Cloud Run revision smoke: `/health`, authenticated API, rejected API requests, and CORS from the exact Pages origin.
- Cloudflare Pages build plus browser smoke from its deployed production origin.

## User decision gates

- **Candidate target recorded, not verified:** Neon project `crimson-sunset-13986365`, branch `production` (`Neon.md`). Confirm it is the intended production target through Neon MCP.
- Confirm whether the browser-facing Cloud Run service may be publicly invokable with the already-approved, extractable Bearer barrier. This is not Cloud Run IAM authentication.
- Confirm the exact Cloudflare Pages production origin before setting backend CORS.
- Confirm that the source workbook data may be transferred to the named Neon production branch and that the production database may be populated.
- Confirm GCP project, region, service name, Artifact Registry repository, Cloudflare Pages project, and authorized credential/session before remote execution.
- Any pre-existing data or schema on Neon production is an unresolved stop condition; no reset or overwrite is pre-approved.

## Delivery

- Start implementation from the verified current source ref on a dedicated feature branch; no push, PR, merge, or production release without explicit user authorization.
- The user's latest selected delivery strategy is `stacked-to-main`; inspect actual authored diff and retain coherent review slices if the code/config work reaches the existing slice budget.
- Source-mutating normalization must precede candidate freeze/review. Any required native review follows the user-owned RDD switch; never enable/disable RDD automatically.
- Estimated source/config changes are small (<150 authored lines, generated artifacts excluded); remote operations produce no Git commits. Re-estimate after P2 design is confirmed.
- Every implementation work unit must keep relevant checks/docs with the change, close with its authorized Conventional Commit on the feature branch, and record the commit identity here. Push/PR remains a separate human decision.

## Next step

Review this plan, then authorize P0 targets and remote-operation scope. No Neon, GCP, Cloudflare, data-transfer, or repository source mutations were performed while creating this ODD.
