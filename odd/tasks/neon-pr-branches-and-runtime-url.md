# Neon Runtime URL and Pull Request Branches

## Objective

Use `DATABASE_NEON_URL` for backend database connections, preserve the local Compose workflow, and create/delete normal Neon branches only for pull requests targeting GitHub `main`.

## Current state

- `backend/.env.example` had local changes from the user; implementation preserves the corrected `DATABASE_NEON_URL` key and removes the unrelated Neon project identifier from the backend runtime example.
- Prisma and the importer previously read `DATABASE_URL`; Compose supplied a local PostgreSQL URL to both the API and importer.
- The backend Docker image runs `prisma migrate deploy` before starting the API. Production deployment must continue to follow the separate deployment ODD, which moves migrations to a controlled one-off release step before Cloud Run rollout.
- There was no GitHub Actions workflow for Neon branches.
- The user confirmed that the Neon project is empty. Normal branches are therefore appropriate; they inherit the empty state of their parent. No live Neon project or branch was inspected during this work.

## Scope

1. Standardize the backend connection contract:
   - Prisma runtime and the importer use pooled `DATABASE_NEON_URL`.
   - Prisma Migrate uses direct, non-pooled `DIRECT_URL`.
   - Compose continues to use its local PostgreSQL service, supplying its local URL under both variables.
   - `backend/.env.example` documents placeholders only. `NEON_PROJECT_ID` and `NEON_API_KEY` belong in GitHub Actions variables/secrets, not the backend runtime environment.
2. Add `.github/workflows/neon-pr-branches.yml`:
   - Trigger only for PRs targeting `main`, on open, reopen, synchronize, and close.
   - Use stable branch name `preview/pr-<number>` so create/reuse and cleanup address the same branch.
   - Create/reuse with `neondatabase/create-branch-action@v6`; delete on close with `neondatabase/delete-branch-action@v3`.
   - Set a 14-day expiration. The branch action reuses an existing branch on subsequent synchronize events.
   - Skip fork-originated PRs because GitHub withholds repository secrets from their `pull_request` workflows. Do not use `pull_request_target`.
   - Do not expose or print connection-string outputs; this workflow only manages branch lifecycle and does not run migrations or tests.
3. Reconcile the Neon URL names in the existing production deployment task without authorizing any deployment or remote operation.

## Out of scope

- Creating or inspecting Neon resources manually, configuring GitHub repository variables/secrets, or running the workflow against Neon.
- Running migrations, importing data, or deploying to Cloud Run or Cloudflare Pages.
- Supporting fork-originated pull requests.
- Changing the production migration startup behavior; that remains a prerequisite in the production deployment ODD.

## Safety and decisions

- GitHub Actions requires repository variable `NEON_PROJECT_ID` and repository secret `NEON_API_KEY`; neither value is committed here.
- With no `parent_branch` specified, Neon creates preview branches from the project's primary branch. The remote project and branch identity were not verified.
- The 14-day TTL can expire a long-running PR branch before the PR closes. A later synchronize event can recreate it; close still attempts cleanup.
- Keep the user's ignored local `.env` private. Update its variable names locally as needed; do not copy values into this task or workflow.

## Tasks

- [x] T1 — Change Prisma, importer, and environment examples to `DATABASE_NEON_URL` and `DIRECT_URL`.
- [x] T2 — Preserve local Compose behavior using the same two variable names.
- [x] T3 — Add the PR-to-`main` Neon branch create/delete workflow.
- [x] T4 — Update the existing production deployment ODD's connection-variable references.
- [x] T5 — Validate Prisma, backend, Compose, and workflow configuration.
- [ ] T6 — Review the exact worktree diff and create one local conventional commit; do not push.

## Acceptance criteria

- Prisma runtime and importer require `DATABASE_NEON_URL`; migration commands use `DIRECT_URL`.
- Local Compose still migrates and serves from its own PostgreSQL service.
- Only PRs targeting `main` create/reuse a branch; closed PRs delete the corresponding branch.
- Branch names are stable per PR, expire after 14 days, and fork PRs do not receive or attempt to use Neon credentials.
- No real connection strings or API keys appear in Git, task documents, or workflow logs.
- No Neon API operation, workflow dispatch, push, or deployment is performed during local validation.

## Checks

- `cd backend && npx prisma validate`
- `cd backend && npm run db:generate`
- `cd backend && npm test`
- `cd backend && npm run build`
- `docker compose config`
- Validate the workflow with `actionlint` if available; otherwise inspect its YAML and GitHub Actions expressions.
- `git diff --check`

## Verification evidence

- `npx prisma validate` — passed with placeholder `DATABASE_NEON_URL` and `DIRECT_URL` values.
- `npm run db:generate` — passed with placeholder connection values; Prisma Client 6.19.3 generated.
- `npm test` — passed, 31 tests.
- `npm run build` — passed.
- `docker compose --env-file /dev/null config --quiet` — passed without reading local root environment values.
- Workflow YAML parsed successfully with the available Python YAML parser; `actionlint` is not installed.
- `git diff --check` — passed.

## Delivery

- Work unit: Neon runtime connection contract and PR branch lifecycle.
- Proposed commit: `feat(neon): wire runtime URL and PR branch lifecycle`.
- No push, pull request, manual Neon operation, or cloud deployment is authorized by this task.
