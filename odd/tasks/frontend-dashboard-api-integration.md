# Frontend Dashboard API Integration (Local First)

## Objective

Replace the local dashboard's synthetic fixture data with the verified `GET /api/dashboard` response, using the user's approved basic Bearer-token barrier. Validate the browser-to-API flow locally before changing any Cloudflare Pages or Google Cloud Run configuration.

## Current state

- The Fastify API `GET /api/dashboard` is implemented and verified against local PostgreSQL; contract: `backend/docs/dashboard-api.md`, metric source of truth: `backend/docs/dashboard-metrics.md`.
- The local Compose API is at `http://localhost:8080`; the frontend container is served at `http://localhost:3200`. Vite development uses `http://localhost:5173`.
- `frontend/src/App.tsx` still derives `DashboardData` from synthetic fixtures through `frontend/src/lib/data.ts`.
- The frontend has no API client, data-fetching dependency, or test runner. Its checks are `npm run build` and `npm run lint`; do not invent `npm test`.
- The current frontend Docker image builds static Vite assets. Vite `VITE_*` values are embedded in those assets; the root and frontend ignore files exclude local `.env*` files, and Docker excludes them too.
- The user accepts that `VITE_UUID_CONNECTION` is visible to browser users. This is a lightweight request barrier, not authentication or a confidential secret.
- At plan creation, the checkout is `development`, two local commits ahead of `origin/development`; the preceding API work was merged by PR #7. No push or PR is part of this ODD.

## Why

The API now returns verified 2025 accident data, while the deployed and local dashboard still uses synthetic values. The user wants to connect the frontend and backend locally first, then configure the same token-based request contract for Cloudflare and GCP later.

## Scope

1. Configure local frontend/backend values for `VITE_API_BASE_URL`, `VITE_UUID_CONNECTION`, and backend `UUID_CONNECTION` without committing local values.
2. Require `Authorization: Bearer <UUID_CONNECTION>` on `GET /api/dashboard`, rejecting missing or incorrect tokens before the controller calls the analytics service or Prisma.
3. Connect the existing dashboard to the API; adapt filters, four KPIs, charts, territory ranking, and loading/error/empty states.
4. Configure a narrow local CORS allowlist and exercise the full browser flow against the running Compose API.
5. Document the future production variable mapping: Cloudflare Pages `VITE_*` values are public build inputs; Cloud Run receives `UUID_CONNECTION` from Secret Manager. Do not apply remote settings or deploy in this ODD.

## Out of scope

- Cloudflare Pages build/deployment changes, Cloud Run deployment, Neon changes, or any other remote operation.
- Rate limiting, reverse-proxy/BFF architecture, Cloud Run IAM authentication, user login, or any claim that the static Bearer token is secret.
- Adding charts for API sections not currently shown (causes, sectors, time, vehicles, people), redesigning the page, implementing the map, or geocoding.
- Importing another dataset, changing the database schema, or changing approved KPI/metric definitions.

## Security and environment rules

- Backend runtime variable: `UUID_CONNECTION`. Frontend build variable: `VITE_UUID_CONNECTION`. The values must match **within** each environment; use a different value for development and production.
- Local development values live only in ignored files/environment. Compose passes values at runtime/build time; never hard-code a token into source, Dockerfile, documentation, or logs.
- For production, the same variable names are used, but `VITE_UUID_CONNECTION` is intentionally public because Vite embeds it in the static bundle. The user explicitly accepts this limitation. Do not describe this scheme as user authentication or as a defense against token extraction/replay.
- Fastify checks the Bearer token before database-backed handling. `GET /health` stays unauthenticated for the container health check.
- CORS must allow only the required local browser origins (`http://localhost:3200` and `http://localhost:5173`); the `OPTIONS` preflight must complete before Bearer validation. Confirm the exact production origin before a separate deployment task; the Pages/`workers.dev` host was not finalized here.
- The token check rejects requests without the header and protects database work, but every request still reaches the backend process. This basic token alone does not guarantee reduced Cloud Run invocation cost.

## Tasks

- [x] T1 — Add the backend Bearer guard and local CORS
  - Read `UUID_CONNECTION` from backend runtime configuration; fail clearly on protected API calls if it is unset.
  - Validate `Authorization: Bearer <token>` on `/api/dashboard` before invoking the service; return `401` for missing/invalid tokens and do not query Prisma.
  - Keep `/health` public. Permit local `OPTIONS` preflight, the `Authorization` header, and only the two documented local origins.
  - Add backend `node:test` coverage for missing, invalid, valid tokens, health behavior, CORS origins/preflight, and service-not-called-on-rejection.

- [x] T2 — Add the frontend API client and filter mapping
  - Add a typed client for `GET /api/dashboard`, using `VITE_API_BASE_URL` and `VITE_UUID_CONNECTION` and sending the Bearer header.
  - Map `all/q1/q2/q3/q4` to 2025 date ranges; map the selected Roman region to its numeric catalog `number`; send `communeId` when a commune is selected (the API derives its region).
  - Use a small `fetch` hook with request cancellation and explicit loading/error/data states; no new server-state dependency for this single dashboard endpoint.
  - Never fall back to synthetic fixtures when the request fails.

- [x] T3 — Adapt the current dashboard to real response data
  - Replace `activeCases` with `seriousInjuries` for KPI 4; source sparklines from real `monthlyTrend` values.
  - Adapt ISO `YYYY-MM` months and API severity `{label, accidents}` to the chart view types; show `onlyIlesos` as the approved “Uninjured only” bucket.
  - Remove synthetic/demo banners and synthetic fixture warnings; render loading, API error/retry, and API-provided `emptyScope` states.
  - Make territory ranking generic for `scope: region|commune`, displaying `name`, `code`, `accidents`, and `fatalities`. **Remove the current per-territory Injuries column**: the approved API contract does not provide that value. Do not infer or fabricate it.
  - Preserve the current layout, filters, and map placeholder. Leave other API sections unused in this slice.

- [x] T4 — Wire local environment and Compose build
  - Pass `VITE_API_BASE_URL` and `VITE_UUID_CONNECTION` as frontend Docker build arguments; pass `UUID_CONNECTION` to the backend container at runtime from ignored local configuration.
  - Support local Vite development with the same API URL/token values; do not expose backend-only environment variables through `import.meta.env`.
  - Document safe placeholder variable names and the future Cloudflare/GCP variable mapping; never write actual values into Git.

- [x] T5 — Verify the local browser-to-API flow
  - Run backend `npm test` and `npm run build`; run frontend `npm run build` and `npm run lint`.
  - Rebuild and start local Compose without removing the Postgres volume or rerunning the importer.
  - Verify valid-token success, missing/invalid-token `401`, public `/health`, local CORS/preflight, national/quarter/region/commune filters, an empty commune, loading/error states, and no synthetic fallback.
  - Compare the four national KPI values with the already verified API/database baseline (73,081 / 1,507 / 41,705 / 7,060).
  - Frontend verification is build/lint plus a manual local browser smoke; no frontend test runner is configured.

## Acceptance criteria

- The local frontend renders database-backed results from `GET /api/dashboard` and the approved four KPIs.
- Changing period, region, or commune causes the correct API query and updates charts/ranking with real response values.
- Missing/invalid Bearer tokens receive `401` before analytics/Prisma work; valid requests succeed; health checks stay public.
- CORS accepts only required local origins and handles preflight.
- Loading, failed API, and empty-scope responses are explicit; no synthetic figures are displayed as fallback.
- Backend tests/build, frontend build/lint, and the local browser smoke pass. No production service or remote environment is changed.

## Checks

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm run build`
- `cd frontend && npm run lint`
- `docker compose up -d --build` (preserve the existing Postgres volume; do not run the importer)
- Browser smoke at `http://localhost:3200` and API/health checks at `http://localhost:8080`.

## User decision gates

- **Resolved:** use the basic Bearer token even though `VITE_UUID_CONNECTION` is visible and replayable from the built frontend bundle.
- **Resolved:** remove the Injuries column from the territory ranking because the approved API does not supply injuries per territory.
- Production host/origin and remote variable configuration remain deferred; confirm them before any Cloudflare/GCP operation.

## Production handoff (documentation only)

| Service | Variable | Use |
|---|---|---|
| Cloudflare Pages build | `VITE_API_BASE_URL` | Public Cloud Run API URL |
| Cloudflare Pages build | `VITE_UUID_CONNECTION` | Public Bearer value embedded in frontend assets (accepted limitation) |
| GCP Cloud Run | `UUID_CONNECTION` | Expected Bearer value, configured from Secret Manager |

The Cloudflare and GCP values must match within production; development uses a separate value. No remote variables are configured in this ODD. Confirm the exact deployed frontend origin before adding it to the backend CORS allowlist.

## Delivery

- Start implementation from the current development baseline in a dedicated feature branch; do not push or open a PR without explicit authorization.
- Use the user's latest selected `stacked-to-main` delivery strategy for any future PR slicing. Keep tests and the documentation with the behavior they verify; use explicit pathspecs because the repository contains intentionally committed user Design assets.
- Forecast: backend auth/CORS tests plus frontend API/data/UI/Compose wiring are likely to exceed one 400-line review slice. Proposed work units are T1 (backend guard/CORS/tests) and T2–T4 (frontend client/adaptation/local config), then T5 verification; inspect actual diff sizes and split only at coherent boundaries.

## Next step

T1–T5 completed and verified locally (2026-10-11): backend guard/CORS tests green (31 pass), frontend build/lint green, Compose rebuilt with the local token, browser-flow curl smoke matched the national baseline (73,081 / 1,507 / 41,705 / 7,060). Changes are uncommitted on `development` pending user review; production Cloudflare/GCP configuration remains deferred.
