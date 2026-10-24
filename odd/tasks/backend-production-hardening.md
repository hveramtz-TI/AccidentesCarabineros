# Backend production hardening (Phase 2)

Objective: close the production-hardening gaps left after the Node 24.22.1 move, for the
Fly.io target. Workspace baseline: uncommitted Node bump on top of `fb0ece2`.
Test runner: `node --import tsx --test` (no database required).

## Specs

- **S1 — Trusted proxy. DEFERRED (2026-10-24, user chose Option 4).** Fastify 5.12.7
  treats numeric `trustProxy` as fail-closed (verified on 5.12.5: `trustProxy: 1` leaves
  `request.ip` as the socket address; `true` trusts the spoofable leftmost XFF). Do not
  add `trustProxy` or the rate limit until the trust design is decided.
- **S2 — Rate limit. DEFERRED with S1.** No `@fastify/rate-limit` dependency, no
  `rateLimitMax`/`rateLimitWindow` options, no 429 contract in this pass.
- **S3 — Timing-safe token compare.** Replace `header !== \`Bearer ${token}\`` with a
  SHA-256 + `crypto.timingSafeEqual` comparison in `api-guard.ts`, so different-length
  inputs do not throw and the comparison is constant-time. The `401` body stays
  `{ "error": { "code": "UNAUTHORIZED", "message": "missing or invalid bearer token" } }`.
- **S4 — No secret name in the misconfiguration body.** When `authToken` is null the
  `500` keeps code `AUTH_NOT_CONFIGURED` but the message must not contain
  `UUID_CONNECTION`; use `"authentication is not configured on the server"`.
- **S5 — Security headers.** Every response (200, 401) carries
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and
  `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- **S6 — Dependency security.** `fastify` resolved to `>=5.12.7` (`^5.12.7`), then
  `npm audit fix` (never `--force`). No new audit findings; the accepted residual set is
  the `prisma` CLI advisory (not HTTP-reachable) and `uuid` via `exceljs` (importer-only).
- **S7 — Migrations off the request path.** `backend/Dockerfile` runtime CMD becomes
  `["node", "dist/server.js"]`; Fly runs migrations via
  `[deploy] release_command = "./node_modules/.bin/prisma migrate deploy"`; local
  `compose.yaml` backend overrides `command:` with the existing migrate-then-serve shell.
  `prisma` moves from `devDependencies` to `dependencies` (the release command needs the
  CLI), and the build stage runs `npm prune --omit=dev` after `npm run build` so the
  runtime ships production dependencies only while keeping the generated client.
- **S8 — Fly lifecycle.** `fly.toml` root gets `kill_signal = "SIGTERM"` and
  `kill_timeout = 30`; the health-check comment/grace no longer claims migrations run in
  the container CMD.
- **S9 — Documentation.** `backend/docs/dashboard-api.md` documents the security headers
  (§6) in Spanish like the rest of that file. The `429` body stays undocumented while
  S1/S2 are deferred.

## Tasks

- **T1** — S3–S6 (guard, headers, hardening tests, dependency bumps; S1/S2 deferred). Route: delegated writer. **Status: done; commit: `d5dbca3` (on `main`).**
- **T2** — S7–S9 (Dockerfile, compose, fly.toml, API doc) + ODD log evidence. Route: delegated writer (same unit; the files are interdependent). **Status: done; commit: `d5dbca3` (on `main`).**

## Log

- **L1 (2026-10-24, verbatim):** "arranca con la fase 2, te recomiendo hacer delegacion para no aumentar de mas el contexto de la sesion"
- **L2 (2026-10-24, baseline):** Node 24.22.1 bump is implemented in the worktree but not committed. Session findings: `api-guard.ts:90` leaks the env-var name; `api-guard.ts:94` uses `!==`; `app.ts` has no `trustProxy`, rate limit, or security headers; `fly.toml` has no lifecycle overrides; the runtime image ships devDependencies and runs `migrate deploy` on every boot.
- **L3 (2026-10-24, trust-proxy decision, verbatim user answer):** "Option 4" — "Defer S1/S2 and implement S3–S9 only now; keep the rate limit out until the trust design is decided." Evidence backing the deferral: Fastify 5.12.5 returned `{"ip":"127.0.0.1"}` for `trustProxy: 1` with `X-Forwarded-For: 1.2.3.4, 203.0.113.10`; `trustProxy: true` returned the spoofable leftmost `1.2.3.4`; `(address, hop) => hop === 0` and IP/CIDR strings returned `203.0.113.10`. No code was changed before this decision.
- **L4 (2026-10-24, implementation evidence):** S3–S9 done; S1/S2 deferred per L3. RED: `node --import tsx --test src/routes/hardening.test.ts` → 1/3 pass (missing headers, leaked `UUID_CONNECTION`); `node --import tsx --test src/routes/api-guard.test.ts` → 4/5 pass (old message). GREEN: 3/3 and 5/5 after the `onSend` hook and timing-safe guard. `npm test` → 74 tests, 74 pass, 0 fail. `npm run build` → exit 0. `docker compose config -q` → exit 0. `npm ls fastify @fastify/rate-limit` → fastify 5.12.7; rate-limit absent. `npm audit fix` → 8 → 5 vulnerabilities (2 moderate, 3 high: prisma/deepmerge-ts and exceljs/uuid, the accepted residual set); `npm audit --omit=dev` → same 5. Commit: `d5dbca3` (pushed to `main`; the L7 engines/`.node-version` bump landed in the same commit).
- **L5 (2026-10-24, native review interrupted + inline review):** RDD native review was consented (granted) and START froze the workspace candidate (lineage `review-e054b62c5f411ada`, 4 lenses risk/resilience/readability/reliability). The four provider reviewer tasks were cancelled by the runtime's model-provider usage limit (`Task cancelled`), so no lens captures were admitted and the candidate was **not** acknowledged; no PASS was fabricated. The parent ran the four-lens review inline instead: findings — (1) AGENTS.md:132-136 still claimed migrate-then-serve was the image CMD after S7 moved it; **fixed** in this pass. (2) HSTS is sent on plain-HTTP localhost responses (test/browser-ignored; Fly enforces HTTPS). (3) `engines.node >=24.11` matches the verified local v24.22.1 but would block older-toolchain `npm install` if CI ever installs backend deps (no deploy/CI workflows exist today). Inline re-verification: `npm test` → 74/74 pass; `npm run build` → exit 0.
- **L6 (2026-10-24, user skipped RDD for this candidate):** with the provider limit still blocking the four lens captures, the user asked to skip the native review. The open transaction was released cleanly with `gentle-ai review abandon` (reason `operator_disposition`, actor `hgvm`, authority revision `sha256:db1b587e…`, record `committed`; L3 quarantine at `.git/gentle-ai/review-transactions/quarantine/review-e054b62c5f411ada-2321052074`), and plain `review status` now reports `clean` with no entries. Global RDD mode was left ON (default); delivery stays under ordinary repository policy.
- **L7 (2026-10-24, Node security floor alignment, user-approved):** after auditing every CVE in the 2026-10-21 security release against both packages — backend runs Node only in the pinned `node:24.22.1-slim` images and local v24.22.1, frontend production is static assets (nginx/workerd, no Node runtime), and neither codebase calls `dns.resolve*`, client `node:tls`, `node:zlib`, snapshots/SEA, or `--permission` — the only gap was the declared floor. Bumped `backend/package.json` `engines.node` from `>=24.11` to `>=24.22.1` (the old floor admitted unpatched 24.11–24.22.0 builds), synced `package-lock.json` `packages[""].engines` via `npm install --package-lock-only`, added `backend/.node-version` (`24.22.1`, mirroring the frontend pin that version managers actually honor), and recorded the one-contract convention in `AGENTS.md` (bump image pin + engines floor + both `.node-version` files together). Evidence: `npm test` → 74/74 pass; `npm run build` → exit 0.
