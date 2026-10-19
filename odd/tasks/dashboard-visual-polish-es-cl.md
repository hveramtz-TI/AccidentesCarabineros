# Dashboard Visual Polish and Chilean Spanish

Objective: fix the header navigation alignment, make regional map hover values reliable and understandable, identify the official data source in the footer, and present the dashboard in Chilean Spanish.

Branch: `feat/interactive-geojson-map`; user explicitly authorized staying on this branch. Preserve the untracked screenshots `Captura de pantalla_20261019_145323.png` and `Captura de pantalla_20261019_160734.png`.
Delivery strategy: user-facing dashboard refinement; keep API and UI changes in reviewable work units, splitting the work if the implementation exceeds the established review-size limit.
Test runner: backend `npm test` and `npm run build`; frontend `npm run build` and `npm run lint`. The frontend has no configured test runner.

## Why

The dashboard is connected to Carabineros de Chile accident data, but its header navigation is not consistently right-aligned, the map tooltip can report “No data for this period,” and the footer still labels the data synthetic. Most visible interface copy is also in English. These issues reduce clarity and make the displayed source and data state misleading.

## Initial state before implementation (verified 2026-10-19)

- `frontend/src/layout/Header.tsx` applies `md:justify-center` after `sm:justify-end`, which centers the navigation at medium and larger breakpoints. The visible “coming soon” text is currently screen-reader-only.
- `frontend/src/layout/Footer.tsx` says “Synthetic example data — not official statistics,” although the dashboard reads the API-backed dataset. It also contains English product and scope copy.
- `frontend/src/components/dashboard/region-map.tsx` looks up rows by the region's Roman-number code. If no matching row exists, the tooltip says “No data for this period”; if a row exists with zero accidents, it correctly formats the value as zero.
- `backend/src/services/dashboard-service.ts` already returns `territories.all`. For a national region-scope query, `queryTerritories` aggregates every region and uses a `LEFT JOIN`, so regions with no accidents are returned with a count of zero.
- `frontend/src/App.tsx` uses the national query to supply map values even when a region or commune is selected. The current frontend and backend source therefore do not require a separate map endpoint.
- The prior map ODD records that a previously deployed backend did not yet return `territories.all`. A mismatch between the deployed backend and frontend remains a plausible cause and must be checked against the API actually used by the browser.
- Dashboard data is for 2025. The existing API source marker is `carabineros-2025-normalized`.

## Requirements

- **S1 — User request (verbatim):** “hagamos una nueva odd, estoy viendo algunos bugs visuales por ejemplo el header las opciones como Dashboard Maps(coming soon) Reports(coming soon) no estan alineadas a la derecha, al hacer hover sobre una region el map sale "no data for this period" hay que revisar si podemos hacer algo con esto, o crear un nuevo enpoint en el backend para consumir y que traiga un numero del total por region, tambien actualizar el footer que son datos oficiales publicados por Carabineros de Chile, ademas la web tiene que estar en español Chile o neutro.”
- **S2 — Reuse the existing API contract unless evidence disproves it.** Verify that the configured API returns `territories.all` with all 16 region rows and Roman-number codes matching the frontend map catalog. Do not add a new endpoint if this contract is present and usable. If the configured service is behind the repository implementation, document the version mismatch and use the existing endpoint contract; production deployment remains separately authorized.
- **S3 — Accurate map states.** Show a region's accident total on hover and keyboard focus, including an explicit zero. Distinguish an in-flight request, an API error or incompatible response, and a successfully loaded series with a missing region row. Never present a missing series as a zero count. Preserve the existing region-selection and filter behavior.
- **S4 — Header alignment and navigation.** Right-align navigation at desktop widths without causing overflow or compromising the compact/mobile layout. Use “Panel,” “Mapas” and “Informes” (or equivalent consistent Spanish labels); show “Próximamente” for disabled destinations in visible and accessible text.
- **S5 — Official source attribution.** Remove the synthetic-data disclaimer. State clearly that the dashboard presents aggregate 2025 accident data officially published by Carabineros de Chile, and that personal data are not displayed. Do not imply that Carabineros endorses this dashboard. Keep the existing institutional link unless source verification warrants a change.
- **S6 — Spanish locale.** Translate all user-facing frontend copy into clear, neutral Chilean Spanish, including navigation, filters, KPI and chart titles, legends, tooltips, empty/loading/error/retry states, and accessible names. Format counts and dates with the `es-CL` locale. Keep API keys, query parameters, identifiers, and database values/contracts unchanged.
- **S7 — Responsive and accessible behavior.** Keep keyboard focus visible, preserve Enter/Space map activation, provide useful text equivalents for map values and states, and avoid horizontal overflow at 375, 768, 1024, and 1440 px.

## Scope

1. Diagnose the browser-configured API response and the map series join; fix the existing flow and truthful loading/error/empty states.
2. Correct responsive header navigation alignment and translate its visible copy.
3. Update footer attribution and product copy.
4. Localize the complete user-facing dashboard and formatting without changing data semantics.
5. Verify with the existing backend/frontend checks and a focused browser smoke test.

## Out of scope

- Adding a second endpoint, changing the database schema, or changing metric definitions unless S2 verification proves the current API contract cannot supply the map series.
- Adding authentication, dependencies, a localization framework, or unrelated visual redesign.
- Deploying to or changing production services, secrets, CORS, or environment configuration. Any production rollout requires separate authorization.
- Altering the source data, inferring values, or presenting missing/error states as valid zero counts.

## Tasks

- [x] **T1 — Verify and repair regional map data states (S2, S3)**
  - Compared the API response used by the frontend with the repository contract. Live probe of the configured Fly API (`VITE_API_BASE_URL` in `frontend/.env`, Bearer barrier, token never printed): HTTP 200, `kpis.accidents` = 73,081, `meta.synthetic` = false, but `territories` keys were `scope,items,outsideTopCount,outsideAccidents,zeroAccidentCount` — **`all` absent**. The deployed Fly backend predates commit `1ee379d`, which added the additive series. This is the direct cause of “No data for this period” on every region hover: the frontend receives no series.
  - Trace of the national map query confirmed the conflation: `series` stayed null on a successful-but-old response while `loading` became false, so the tooltip fell through to the “no data” branch.
  - Fix without a new endpoint (S2): a `RegionSeriesState` (`loading | ready | error | missing-series`) is derived in `App.tsx` from the query that feeds the series and threaded `DashboardView → ContainerMapFilter → RegionMap`. Tooltip, `aria-label`, fill and legend now distinguish loading, request failure, an API that does not deliver `territories.all`, a loaded zero (explicit count), and a genuinely absent region row.
  - Route: inline. Risk: none (presentation + state threading; API contract unchanged; `map-first` behaviors preserved). Evidence: `npm run build` exit 0, `npm run lint` exit 0; live-API keys as above. Commit: `20e6ce8`. RDD: medium, review not due (`under_budget`); the parent then reviewed the accumulated range and acknowledged it approved (L6). Deploying the updated backend to Fly remains a human decision (L4).

- [x] **T2 — Fix and localize the header (S4, S6, S7)**
  - Removed the medium-breakpoint centering override. The user’s mobile screenshot reproduced uneven wrapping, with Informes alone on a second row. At widths below `sm`, navigation now uses three equal columns with vertically stacked icon, label, and “Próximamente”; from `sm` up it returns to a right-aligned horizontal row.
  - Localized the product title/subtitle, primary-navigation accessible name, and labels to Spanish; “Próximamente” is now visible on disabled Mapas and Informes actions.
  - Frontend test-first exception: no frontend test runner is configured. Evidence: `npm run build` exit 0 (existing >500 kB chunk warning), `npm run lint` exit 0, and local Firefox screenshot at 375 px confirmed balanced three-column layout without horizontal overflow. Full 768/1024/1440 check remains in T5.
  - Route: inline. Risk: none (internal header/layout presentation; no API or shared public contract changed). Commits: `ef4565d`, `25ea7c7`. RDD: medium, review not due (`under_budget`).

- [x] **T3 — Replace footer disclaimer with verified attribution (S5, S6)**
  - Removed the synthetic-example warning and localized footer headings, product description, and version label.
  - Added Spanish attribution to official 2025 Carabineros de Chile source data, clarified that the dashboard presents aggregate figures without personal data, and stated that this visualization does not imply institutional backing.
  - Preserved the existing institutional link. Frontend test-first exception: no frontend test runner is configured. Evidence: `npm run build` exit 0 (existing >500 kB chunk warning) and `npm run lint` exit 0; browser content check remains in T5.
  - Route: inline. Risk: none (footer copy/presentation only; API and shared contracts unchanged). Commit: `4e4b12e`. RDD: medium, review not due (`under_budget`).

- [x] **T4 — Localize dashboard content and formatting (S6, S7)**
  - Localized filter labels/options, KPI labels and accessible names, chart titles/descriptions/legends/tables, map and chart tooltip number formatting, loading/error/empty/skeleton copy, and the document title. `frontend/index.html` now declares `lang="es-CL"`.
  - Added frontend-only translations for API severity keys and the “National (2025)” scope label. Replaced English month labels with Spanish abbreviations and formatted visible numeric values using `es-CL`; query parameters, response values and wire contract are unchanged.
  - Static UI-copy scan found no remaining targeted English labels (remaining matches are identifiers/comments). Frontend test-first exception: no frontend test runner is configured. Evidence: `npm run build` exit 0 (existing >500 kB chunk warning), `npm run lint` exit 0. Browser/keyboard/responsive smoke remains T5.
  - Route: inline. Risk: none (requested presentation/localization; no data/API contract change). Commit: `b20dbd0`. RDD: medium, review not due (`under_budget`).

- [ ] **T5 — Verify the complete experience (S2–S7)**
  - Run backend tests/build and frontend build/lint.
  - Smoke-test the map against the configured API and compare representative region totals with `territories.all`; cover selected and unselected filters, a zero, loading, and failure/incompatible response.
  - Check right alignment, Spanish copy, source attribution, keyboard operation, and layout at 375, 768, 1024, and 1440 px.
  - Record any API/deployment mismatch without exposing Bearer values or other credentials in logs or documentation.

## Acceptance criteria

- The map tooltip and accessible label show the correct region name and total, including zero, when the series is available.
- Loading, API failure/incompatibility, and missing-region data are distinct states; no unavailable data is represented as zero.
- The navigation is right-aligned at desktop widths and remains usable at mobile widths; upcoming destinations are visibly and accessibly identified.
- All user-facing dashboard copy is clear Spanish, with `es-CL` formatting for displayed dates and counts.
- The footer accurately attributes the official 2025 source data to Carabineros de Chile, describes the aggregate nature of the dashboard, and contains no synthetic-data disclaimer or implied endorsement.
- Backend tests/build, frontend build/lint, and the focused responsive/browser smoke pass.
- No production service or remote environment is changed as part of this task.

## Checks

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm run build`
- `cd frontend && npm run lint`
- Manual browser smoke at the configured local frontend/API, with the required existing authorization configuration; never print the Bearer value.

## User decision gates

- **Resolved for planning:** use the existing `GET /api/dashboard` territory series; no new endpoint is justified by the current repository implementation.
- **Resolved for copy:** use clear, neutral Chilean Spanish (`es-CL`).
- Implementation branch creation and any production deployment remain separate actions requiring authorization.

## Next step

Proceed to T5 verification on the existing `feat/interactive-geojson-map` branch. Do not create another branch or deploy to Fly without separate authorization.

## Log

- **L1** (2026-10-19, user, verbatim): “hagamos una nueva odd, estoy viendo algunos bugs visuales por ejemplo el header las opciones como Dashboard Maps(coming soon) Reports(coming soon) no estan alineadas a la derecha, al hacer hover sobre una region el map sale "no data for this period" hay que revisar si podemos hacer algo con esto, o crear un nuevo enpoint en el backend para consumir y que traiga un numero del total por region, tambien actualizar el footer que son datos oficiales publicados por Carabineros de Chile, ademas la web tiene que estar en español Chile o neutro.”
- **L2** (2026-10-19, user): “Genera la odd” → this document created. “okey empezemos, quedate en esta rama” → implementation authorized on `feat/interactive-geojson-map` (no new branch).
- **L3** (2026-10-19, T1 evidence): live probe of the configured Fly API returned 200 with `territories.all` **absent** — the deployed backend predates `1ee379d`. That is the confirmed cause of the “no data” tooltip on every region. Fixed client-side per S2 with the explicit `RegionSeriesState`; no new endpoint. The map shows real totals once the Fly backend is redeployed from this branch (or `VITE_API_BASE_URL` points at a local/dev backend that includes T2 of the map ODD).
- **L4** Open for T5/deploy: redeploying Fly is a separate human decision; until then the honest live state is `missing-series` (“La API no entrega datos”), not an error.
- **L5** Route: Writer trigger not fired (sequential dependent units, no parallel disjoint writes) → all tasks inline with per-work-unit commits on `feat/interactive-geojson-map`. RDD: global on (read before first commit).
- **L6** (2026-10-19, T1 native review): The accumulated candidate was medium (22 paths, 1,078 lines), received explicit user consent, two lenses, and approved acknowledgement. No blockers; two advisory-only findings: (a) a transient failure of the separate national map query has no in-context retry; (b) a pre-existing geometry comment describes a tooltip-anchor fallback not implemented by the component. These findings did not reopen the frozen candidate and were not expanded into scope. T1 assessment itself was medium / `review_due=false` (`under_budget`).
- **L7** (2026-10-19, T2): Fixed right alignment and translated header labels; build and lint pass. Commit `ef4565d`; RDD assessment: medium / `review_due=false` (`under_budget`). Visual/browser confirmation is deferred to T5.
- **L8** (2026-10-19, T3): Footer now attributes the official 2025 Carabineros source, describes aggregation/no personal data, and avoids implying institutional backing; the synthetic-data warning is removed. Commit `4e4b12e`; frontend build/lint pass; RDD assessment: medium / `review_due=false` (`under_budget`).
- **L9** (2026-10-19, T4): Localized dashboard filters, KPIs, charts, map-adjacent feedback, tooltips/number formatting, skeletons, status messages, accessible labels, and document title to neutral Chilean Spanish. `lang="es-CL"`; visible numbers use `es-CL`; severity/scope labels are mapped client-side without changing the API. Build/lint pass; the targeted static-copy scan found no remaining matching English UI strings. Commit `b20dbd0`; RDD assessment: medium / `review_due=false` (`under_budget`). Browser/keyboard/responsive QA remains T5.
- **L10** (2026-10-19, user, verbatim): “yo lo veo alineado en desktop, pero lo veo roto en mobile”. Reopened T2. The supplied screenshot showed two nav items on the first row and Informes alone below. Replaced mobile wrapping with a balanced three-column grid; Firefox screenshot at 375 px confirms all three destinations align without overflow. Commits: `25ea7c7` mobile correction; build/lint pass; RDD medium/under_budget.
