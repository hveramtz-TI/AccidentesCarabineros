# SEO — Indexability and Organic Growth

Feature document locator: `odd/tasks/seo-indexability-and-growth.md`
Branch: confirm the working branch before implementation; do not deploy, push, or
open a PR without explicit authorization.
Delivery strategy: `ask-on-risk`; Phase 1 is one reviewable slice, Phases 2 and 3
are separate slices.
Test runner: frontend `npm run lint` and `npm run build`; there is no frontend
test runner.
Risk: 3/5. Cost: 4/5. Depends on: live production deployment. Status: Phase 1
implemented and verified locally; deploy, HTTPS enforcement, and GSC pending
authorization.

## Objective

Make the public dashboard discoverable, indexable, and competitive for Chilean
road-safety queries in three phases: (1) indexability foundations, (2) content
and trust, (3) programmatic growth. Phase 1 is the recommended first execution
slice; Phases 2 and 3 require separate approval.

## Current state

- Public URL: `https://accidentescarabineros.hveramtz-inf.workers.dev/`.
- Frontend: React 19 + Vite 8 SPA served by Cloudflare Workers static assets
  (`frontend/wrangler.jsonc`, `not_found_handling: "single-page-application"`).
- API: Fastify + Prisma + Neon, publicly reachable at
  `https://backend-dawn-meadowland-5739.fly.dev` with the public Bearer barrier
  (`VITE_UUID_CONNECTION`, extractable from the bundle by design).
- Dataset: 73,081 siniestros / 148,252 personas / 130,234 vehículos, 2025 only.
- No `.agents/product-marketing.md`, no Search Console verification, and no
  analytics tag in the repository.
- Deployment note: the live bundle points to Fly.io (`backend-dawn-meadowland-5739`,
  region `gru`), while `AGENTS.md` describes Cloud Run. Confirm the intended
  target before changing `VITE_API_BASE_URL` or `CORS_ALLOWED_ORIGINS`.

### Live audit evidence (2026-10-24, read-only)

Confirmed working:

- `GET /api/meta`, `/api/dashboard`, and `/api/analysis` return `200` with the
  public token (1 KB / 7.9 KB / 23.7 KB).
- CORS preflight from the HTTPS Workers origin returns `204` with the correct
  `Access-Control-Allow-Origin`; the rendered fetch can reach the API.
- HTTPS is served by Cloudflare (`cf-cache-status: HIT`).
- `/health` remains public; the Bearer barrier is not user authentication.

Confirmed blockers:

| Finding | Live evidence | Impact |
|---|---|---|
| `robots.txt` and `sitemap.xml` serve the SPA shell | Both return `200`, `text/html`, 646 B, same body as `/` | Google cannot parse the sitemap or robots.txt |
| Soft 404 | `/no-existe` returns `200`, `text/html`, 646 B | Junk URLs are indexable; crawl budget wasted |
| HTTP not redirected | `http://` returns `200` with the same body and no HSTS; the API rejects that origin (`OPTIONS` `404`, no CORS) | Duplicate HTTP URL and a broken dashboard over HTTP |
| No meta description, canonical, OG, or JSON-LD | Live HTML only has `<title>`, favicon, viewport, color-scheme | Weak CTR and relevance signals |
| Case/slash variants | `/MAPAS` and `/mapas/` return `200` | Duplicate URLs |
| `/analisis` returns `200` | Client-side `<Navigate replace>` | Soft redirect instead of `301` |
| Hashed assets not cached long-term | `/assets/index-*.js` returns `cache-control: public, max-age=0, must-revalidate` | Slower repeat visits |
| Render-blocking Google Fonts | Live CSS keeps `@import url("https://fonts.googleapis.com/...")` | LCP and third-party RTT |
| No frontend security headers | Live response lacks HSTS, `X-Content-Type-Options`, `Referrer-Policy` (the API has them) | Trust and security hygiene |
| No indexation signal | `site:` and DuckDuckGo searches returned no results | No organic traffic yet; confirm in GSC |

Not a blocker:

- CORS is correctly configured for the HTTPS origin; the code-only audit
  overestimated this risk.
- Hreflang does not apply (single `es-CL` locale).
- There is no JSON-LD in the source and no CMS/plugin that injects it, so the
  schema absence is real.
- `VITE_UUID_CONNECTION` is public by design; it is a request barrier, not a
  secret.

## Why

The product and content foundation is solid (methodology page, es-CL copy,
responsive shell, clean URLs), but the SEO layer is effectively absent. The site
is not indexed, the sitemap and robots.txt are unparseable, every unknown path
returns `200`, and the initial HTML contains no descriptive content. Fixing the
foundations before requesting indexing is cheaper than repairing a bad index
later.

## Scope

### Phase 1 — Indexability foundations (P0/P1)

1. Add `frontend/public/robots.txt` with an absolute `Sitemap:` URL.
2. Add `frontend/public/sitemap.xml` with the six canonical routes and
   `lastmod` (generated at build when routes change).
3. Configure `frontend/wrangler.jsonc` with `not_found_handling: "404-page"`
   and `html_handling: "drop-trailing-slash"`; generate `dist/404.html`.
4. Add `frontend/public/_redirects` with `/analisis /analisis/causas 301` and
   any approved case/trailing-slash normalization. Do not add a catch-all
   `/* /index.html 200` rule (Workers rejects it with `100324`).
5. Force HTTPS at the Cloudflare zone level ("Always Use HTTPS") or with an
   approved redirect rule; HTTP currently serves the app and the API rejects its
   origin.
6. Add `frontend/public/_headers` with HSTS, `X-Content-Type-Options: nosniff`,
   `Referrer-Policy`, and immutable caching for `/assets/*`.
7. Create `frontend/src/data/route-meta.json` (or `.ts`) as the single source of
   truth for per-route title, description, canonical, and OG/Twitter fields.
8. Add `frontend/scripts/seo-build.mjs` and update the build script to
   `tsc -b && vite build && node scripts/seo-build.mjs`. It must emit
   `dist/<route>.html` with unique head tags and static H1/intro copy,
   `dist/404.html`, and `dist/sitemap.xml`.
9. Add `usePageMeta` for client-side navigation (title, description, canonical,
   OG) and `noindex` on filtered views as reinforcement. The static HTML remains
   the primary signal.
10. Fix headings: brand `<h1>` in `Header.tsx` and `HamburgerMenu.tsx` becomes a
    `<p>`; add page H1s to the Panel and Mapas; keep exactly one H1 on Análisis,
    Metodología, and 404.
11. Give each Análisis tab a unique title/description/canonical instead of the
    shared `pageTitle("Análisis")`.
12. Verify with `npm run lint`, `npm run build`, `curl` checks, GSC URL
    Inspection, and Rich Results Test.

### Phase 2 — Content and trust (P2)

13. Add static explanatory copy to the Panel and Mapas: what the dataset shows,
    key figures, definitions, FAQ, and internal links to Análisis/Metodología.
14. Add `/acerca` plus privacy and contact pages, linked from the footer.
15. Add JSON-LD in the static HTML: `Dataset`, `Organization`, `WebSite`, and
    `BreadcrumbList` on Análisis.
16. Remove the Google Fonts `@import`; self-host Inter/JetBrains or keep only
    Geist; preload the primary woff2; keep `font-display: swap`.
17. Lazy-load recharts and the map to reduce the main chunk (currently 944 KB
    raw / 297 KB gzip); measure with PageSpeed Insights.
18. Add a 1200×630 OG image.

### Phase 3 — Programmatic growth (P3)

19. Add `/estadisticas/:region/:comuna` pages with unique title, H1, description,
    static key figures, canonical, sitemap entries, and internal links. Index
    only `period=all`; keep arbitrary filter combinations non-indexable.
20. Add Search Console and analytics; monitor indexation, CTR, and positions
    8–20.

## Out of scope

- Backend API, schema, metric, or dataset changes; no new endpoint is required
  for any phase.
- Changing the approved 2025 data, normalization, or caveats.
- Migrating the app to an SSR framework; the build-time prerender is the chosen
  low-risk path.
- Custom domain, DNS, billing, or Cloudflare account changes beyond the approved
  HTTPS/headers/redirect settings.
- Deploy, push, PR, or remote configuration without explicit user authorization.
- Translation or multi-locale support; the product is `es-CL` only.
- Author pages or personal data beyond what the user explicitly approves.

## Constraints and rules

- Frontend-only change surface; no backend contract changes.
- Frontend checks are `npm run lint` and `npm run build`; there is no frontend
  test runner. Do not invent `npm test`.
- UI copy is Chilean Spanish (`es-CL`); code, comments, docs, and commit messages
  are English.
- Tailwind v4 is CSS-first; do not add `tailwind.config.js`.
- Workers static assets: use `_redirects`, `_headers`, `html_handling`, and
  `not_found_handling`; never add the catch-all SPA redirect.
- Canonical strategy: clean routes self-canonical; filtered views canonicalize
  to the clean path and are reinforced with `noindex`; programmatic pages own
  their canonical.
- The static prerender must not break hydration: React may replace the static
  `<h1>`/intro inside `#root` on mount.
- Do not print the public Bearer token in docs, logs, or evidence. It is public
  in the bundle, but it does not belong in task files.
- No remote operation, deploy, or production configuration change without
  explicit authorization.

## Tasks

### Phase 1 — Indexability

- [x] T1 — Add `public/robots.txt` with `Allow: /` and an absolute sitemap URL.
- [x] T2 — Sitemap emitted at build from `route-meta.json` instead of a
      committed `public/sitemap.xml`, so routes cannot drift. It covers the six
      planned URLs plus the two live routes added on this branch (`/informes`,
      `/analisis/tendencias`).
- [x] T3 — Configure `wrangler.jsonc` (`404-page` + `drop-trailing-slash`) and
      generate `dist/404.html`; verified `/no-existe` returns `404`, `/mapas/`
      redirects `307` to `/mapas`, and valid routes return `200`.
- [ ] T4 — `_redirects` added for `/analisis` and `/MAPAS`; trailing slashes are
      handled by `html_handling`. **HTTPS enforcement deferred (2026-10-24,
      user decision):** `*.workers.dev` is not a zone the project controls, so
      the redirect will be enabled with "Always Use HTTPS" once a custom domain
      is attached.
- [x] T5 — Add `_headers` for HSTS, nosniff, referrer policy, and immutable
      `/assets/*` caching.
- [x] T6 — Create `route-meta` and `usePageMeta`; cover every live route and the
      filtered-view canonical/noindex rule.
- [x] T7 — Add `seo-build.mjs` and the postbuild script; emit per-route HTML,
      `404.html`, and `sitemap.xml`.
- [x] T8 — Fix H1 ownership in `Header.tsx`, `HamburgerMenu.tsx`,
      `DashboardView`, `MapsPage`, `AnalysisLayout`, `MethodologyPage`, and
      `NotFoundPage`.
- [x] T9 — Replace the shared Análisis title with per-tab metadata (title,
      description, canonical, H1, and intro).
- [ ] T10 — Verify the deployed result: `robots.txt` (`text/plain`), `sitemap.xml`
      (XML), 404 status, HTTPS redirect, canonical, OG, and one H1 per page;
      submit the sitemap in GSC and request indexing once.

### Phase 2 — Content and trust

- [ ] T11 — Add static copy, key figures, FAQ, and internal links to Panel/Mapas.
- [ ] T12 — Add `/acerca`, privacy, and contact; link them from the footer.
- [ ] T13 — Add JSON-LD and validate with Rich Results Test.
- [ ] T14 — Self-host fonts, preload, and remove the Google Fonts `@import`.
- [ ] T15 — Lazy-load charts/map and record PSI mobile/desktop results.
- [ ] T16 — Add the OG image and verify social previews.

### Phase 3 — Growth

- [ ] T17 — Add indexable region/commune pages with unique content, canonical,
      sitemap entries, and internal links.
- [ ] T18 — Add GSC/analytics and a monthly indexation/CTR review.

## Acceptance criteria

Phase 1:

- [x] `/robots.txt` returns `200 text/plain` and references the sitemap.
- [x] `/sitemap.xml` returns `200 application/xml` with eight canonical URLs
      (the six planned plus `/informes` and `/analisis/tendencias`).
- [x] `/no-existe` returns `404`; valid routes return `200`.
- [ ] `http://` returns `301` to `https://`.
- [x] Every route has a unique title, description, canonical, and OG/Twitter
      tags in the initial HTML.
- [x] Every route has exactly one H1 aligned with its title.
- [x] Hashed assets return `Cache-Control: public, max-age=31536000, immutable`.
- [x] `npm run lint` and `npm run build` pass.
- [ ] GSC accepts the sitemap and URL Inspection shows the pages as indexable.

Phase 2:

- [ ] Panel/Mapas have meaningful static copy and internal links.
- [ ] `/acerca`, privacy, and contact are published and linked.
- [ ] JSON-LD validates with zero errors in Rich Results Test.
- [ ] Fonts are self-hosted and no render-blocking third-party font request
      remains.
- [ ] PSI results are recorded before and after the performance changes.
- [ ] OG image renders correctly in at least one social preview.

Phase 3:

- [ ] Region/commune pages are indexed, self-canonical, and linked from the map
      and table.
- [ ] The sitemap includes only indexable, canonical pages.
- [ ] GSC shows impressions/clicks and the indexation report is clean.

## Checks

- `cd frontend && npm run lint && npm run build`
- Inspect `frontend/dist/**/*.html`, `robots.txt`, `sitemap.xml`, `404.html`,
  `_redirects`, and `_headers`.
- `curl -sS -D - -o /dev/null` for `/`, `/mapas`, `/analisis/causas`,
  `/metodologia`, `/no-existe`, `/robots.txt`, `/sitemap.xml`, `/MAPAS`,
  `/mapas/`, and `http://`.
- `curl -sS -X OPTIONS` against the API with the production origin to confirm
  CORS remains unchanged.
- GSC: sitemap submission, URL Inspection, and coverage report.
- Rich Results Test for `Dataset`/`Organization`/`WebSite`/`BreadcrumbList`.
- PageSpeed Insights mobile and desktop for the Panel and Mapas.
- No backend checks are required unless a backend change is explicitly approved.

## User decision gates

- **Prerender strategy:** build-time static HTML per route (recommended) versus
  a Worker that rewrites the head per request. The build-time path avoids new
  runtime code and extra invocations.
- **Filtered-view indexing:** canonical-only versus canonical plus `noindex`
  versus promoting selected region/commune combinations to indexable pages.
- **HTTPS enforcement:** **decided 2026-10-24 — defer** until a custom domain is
  attached; then use Cloudflare "Always Use HTTPS" on that zone. It is not
  actionable on `*.workers.dev`.
- **Programmatic pages:** approve Phase 3 before creating any region/commune
  route; the URL shape and indexable combinations need a decision.
- **Analytics/GSC:** choose the property, vendor, and data-retention rules before
  adding tags.
- **About/author content:** confirm whether the publisher/author identity should
  be public before adding `/acerca` and `Person` schema.
- **Deployment target:** confirm Fly.io versus Cloud Run before changing the API
  base URL or CORS origin.

## Delivery

- Phase 1 is one reviewable slice: config, build script, route metadata, and
  heading fixes. Keep the static HTML generation and the metadata source in the
  same commit so the head cannot drift.
- Phase 2 and Phase 3 are separate slices with their own evidence.
- Do not push, open a PR, deploy, or change remote settings without explicit
  authorization.
- Record commit identities and live verification results in `Progress`.
- If the change exceeds roughly 400 authored lines, split it into sub-ODDs
  without renumbering the phases.

## Next step

Approve Phase 1 and confirm the prerender strategy and HTTPS enforcement. Then
implement T1–T10, verify the deployed output, and request indexing in GSC. Phase 2
starts only after Phase 1 is accepted.

## Progress

- **2026-10-24 — ODD created:** live audit documented; no code, config, or remote
  changes were made. Phase 1 is ready for approval.
- **2026-10-24 — Phase 1 implemented locally (uncommitted, not deployed):**
  - Added `src/data/route-meta.json` as the single source for title,
    description, canonical, OG/Twitter, H1, and intro; replaced
    `use-page-effects.ts` with `use-page-meta.ts`, which also keeps the existing
    scroll/focus behaviour and applies `noindex` on filtered views.
  - Added `scripts/seo-build.mjs` + postbuild step; it prerenders one HTML file
    per route, `404.html`, and `sitemap.xml` from `route-meta.json`.
  - Added `public/robots.txt`, `public/_redirects` (`/analisis`, `/MAPAS`) and
    `public/_headers` (HSTS, nosniff, referrer policy, immutable `/assets/*`).
  - `wrangler.jsonc`: `not_found_handling: "404-page"`,
    `html_handling: "drop-trailing-slash"`.
  - H1 ownership fixed: brand `<h1>` → `<p>` in header/mobile menu; Panel and
    Mapas gained a page H1; Análisis keeps one H1 that now follows the active
    tab; Methodology, 404, and Informes keep theirs.
  - Checks: `npm run lint` and `npm run build` pass. Build reports
    `prerendered 8 routes, 8 indexable URLs`.
  - Verified in local Workers runtime (`wrangler dev`, no deploy):
    `/robots.txt` `200 text/plain`, `/sitemap.xml` `200 application/xml`,
    `/no-existe` `404`, `/mapas/` `307` → `/mapas`, `/MAPAS` `301` → `/mapas`,
    `/analisis` `301` → `/analisis/causas`, valid routes `200`, hashed assets
    `Cache-Control: public, max-age=31536000, immutable`, and HSTS/nosniff/
    referrer policy present.
  - HTML assertions: 8 pages with unique titles, one H1 each, canonical plus
    description and OG/Twitter; `404.html` is `noindex` and has no canonical.
  - Deviations: the sitemap is build-generated instead of committed under
    `public/` (single source of truth); the route set is eight because
    `/informes` and `/analisis/tendencias` are live on this branch.
  - Commit: `a857c82` (`feat(frontend): add SEO indexability foundations`).
    Not pushed and not deployed. HTTPS enforcement is deferred by user decision
    until a custom domain exists; deployed verification (T10) and GSC submission
    remain pending.
