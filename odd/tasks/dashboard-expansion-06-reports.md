# EXP-06 — Informes: Preview, CSV, and Print

Brainstorm idea: #2 Informes
Execution order: 06
Risk: 3/5
Cost: 4/5
Depends on: EXP-00, EXP-02
Status: done

## Objective

Add an Informes page with a territory report preview, a server-generated
aggregate CSV download, and a browser print layout. Add the “Ficha territorial”
link from the Mapas table into the report.

## Current state

- EXP-00 provides routing and URL filters.
- EXP-02 provides the `/mapas` territory table and its zero-row contract.
- `GET /api/dashboard` already returns the territory list, KPIs, and filters.
- There is no CSV endpoint, report page, or print stylesheet.
- The user explicitly ruled out server-side PDF/Excel.
- No schema change is needed.

## Why

Analysts need to take the dashboard into a meeting or a written report. A
server-generated CSV avoids client-side serialization bugs and a browser print
view covers the narrative artifact. Both stay aggregate: no fact rows, no PII,
and no heavy report worker on the 1 GB / 1 vCPU service.

## Scope

1. Add `GET /api/dashboard/export.csv` returning the **territory report** for the
   current filter scope:
   `nivel, codigo_region, region, codigo_comuna, comuna, siniestros, fallecidos,
   participacion`.
2. National scope exports regions; a selected region exports its communes; a
   selected commune exports that one row. One row per returned territory,
   including zero-accident catalog territories.
3. CSV rules: UTF-8 with BOM, CRLF line endings, RFC 4180 quoting, Spanish
   headers, the API/catalog territory identifiers only (region roman number /
   commune identifier), no internal database IDs or PII.
4. Sanitize text cells that start with `=`, `+`, `-`, `@`, tab, or carriage
   return by prefixing `'`; numeric cells remain numeric.
5. Set `Content-Type: text/csv; charset=utf-8`, a safe filename such as
   `accidentes-2025-territorios.csv`, and `Cache-Control: no-store`; enforce
   Bearer before any query.
6. Reuse the dashboard filter schema and territory query; do not load fact rows
   into Node. Cap the export at the territory cardinality (≤346 rows) and
   ≤50 KB.
7. Add `/informes` with:
   - a report header (title, period, scope, source, generated date);
   - a KPI summary (siniestros, fallecidos, territories, leading territory);
   - a preview of the territory table (first rows, with a note that the CSV has
     all rows);
   - a “Descargar CSV” link that carries the current filters;
   - a “Imprimir” button using `window.print()`.
8. Add a print stylesheet: hide the app header/footer/nav/buttons/filters; white
   background, dark text, table borders, repeated table headers, no row splits,
   and a print-only title/source line.
9. Add a “Ficha territorial” link in `TerritoryTable` rows that navigates to
   `/informes` with the row’s region/commune filters; the report then shows that
   territory.
10. Update `/mapas` to expose the link without changing its sorting behavior.

## Out of scope

- Server-side PDF, Excel, or a headless browser.
- Raw siniestro/person/vehicle rows or a full data dump.
- Cause, vehicle, or person CSVs; this ODD exports territory aggregates only.
- A report builder, saved reports, scheduled emails, or sharing links.
- Charts in the report beyond the existing preview table.
- Schema changes or new dependencies for CSV generation.

## Constraints and rules

- The CSV is an aggregate territory report, not a raw export. It must reconcile
  with the Mapas table and `/api/dashboard` KPIs.
- `participacion` is the share of accidents in the current scope, one decimal,
  using a dot or comma consistently per RFC 4180; document the choice.
- Formula-injection sanitization applies to every text cell, including region
  and commune names. Prefix with a single quote; do not strip legitimate text.
- API/catalog territory identifiers are allowed; internal database IDs are not.
- A valid scope with zero accidents returns its territory rows with `0`; a scope
  with no territories at all returns the header row only with `200`, not an
  error.
- The export must not exceed 50 KB or 346 rows; if it would, reject with `400`
  and a clear message rather than truncating silently.
- Print must be usable in black and white and must not depend on hover or color
  alone.
- No secrets, tokens, or PII in logs, filenames, or error bodies.
- No server-side PDF/Excel, no new worker, no extra container.

## Tasks

- [x] T1 — Fix the CSV contract
  - Confirm the territory dataset, column order, Spanish headers, numeric
    format, and zero-row behavior with the user.
  - Document the endpoint, filename, caps, and sanitization in
    `backend/docs/reports-api.md`.
  - Decide whether `participacion` uses a dot or comma; keep it consistent.

- [x] T2 — Implement the CSV endpoint
  - Reuse the shared guard and dashboard filter schema.
  - Reuse the dashboard territory aggregate; expose a shared helper from the
    dashboard service if needed rather than duplicating the SQL.
  - Serialize with a small RFC 4180 helper: BOM, CRLF, quoting, escaping,
    formula-injection prefix.
  - Enforce the row and byte caps; return `400` before streaming if exceeded.
  - Set the content headers and `no-store`; `401` before any query.

- [x] T3 — Add backend tests
  - Header, BOM, CRLF, quoting, and numeric formatting.
  - Formula injection for `=`, `+`, `-`, `@`, tab, and CR.
  - Row count and totals reconcile with `/api/dashboard`.
  - A zero-accident territory returns a row with `0`; a no-territory scope
    returns header only; caps return `400`.
  - Auth, validation, content type, filename, and cache header.
  - No raw IDs or PII in the output.

- [x] T4 — Build `/informes`
  - Add the route and enable the Informes nav item.
  - Read URL filters, request `/api/dashboard`, and render header, KPI summary,
    and a capped preview table.
  - Add the CSV link with the same filters and a disabled state while loading.
  - Add the print button and a print-only report header.
  - Handle loading, error, empty scope, and retry.

- [x] T5 — Add print styles
  - Add `@media print` rules that hide chrome and controls, force readable
    colors, repeat table headers, and avoid row splits.
  - Ensure the report fits A4 portrait; landscape is not required.
  - Verify no clipped columns and no blank first page.

- [x] T6 — Add the Mapas ficha link
  - Add a “Ficha territorial” link per table row with region/commune params.
  - Keep sorting and keyboard behavior unchanged; the link must not trigger row
    sort.
  - Verify the report opens with the same territory and period.

- [x] T7 — Verify and update the index
  - Reconcile CSV rows, preview, Mapas table, and KPIs.
  - Open the CSV in a spreadsheet and confirm the BOM and columns.
  - Print to PDF from the browser and inspect page breaks.
  - Run backend tests/build and frontend lint/build.
  - Record evidence in the index.

## Acceptance criteria

- `/informes` shows a coherent territory report for the current filters.
- The CSV downloads with BOM, correct headers, CRLF, quoting, and sanitized text.
- CSV rows and totals reconcile with the Mapas table and KPIs.
- Zero-accident territories appear with `0`; a no-territory scope returns a
  header-only CSV.
- The export is capped and never streams fact rows or PII.
- Print hides chrome, repeats headers, and produces a readable A4 report.
- The Mapas “Ficha territorial” link opens the correct report scope.
- Backend tests/build and frontend lint/build pass.

## Checks

- `cd backend && npm test && npm run build`
- `cd frontend && npm run lint && npm run build`
- `curl -D -` the CSV with valid/invalid/missing Bearer; inspect headers.
- Spreadsheet import: BOM, columns, accents, numeric cells, zero rows.
- Reconcile CSV vs Mapas table vs `kpis.totalAccidents`.
- Print preview: A4 portrait, page breaks, repeated headers, black and white.
- `wc -c` and row count against the caps.

## User decision gates

- **Dataset scope:** territory aggregates only. If the user wants causes,
  vehicles, or persons in the CSV, open a follow-up ODD; do not silently widen
  this export.
- **Number format:** dot vs comma for `participacion`. Confirm before T2.
- **Print identity:** confirm whether the report needs the Carabineros logo or
  institutional header; adding an image is a separate asset decision.
- **Filename:** `accidentes-2025-territorios.csv` is the default. Confirm if a
  date-stamped filename is preferred.

## Delivery

- One backend endpoint + tests, one report page, print CSS, and the Mapas link.
- Do not push, open a PR, or deploy without explicit authorization.
- Update the index status and evidence after verification.

## Next step

After EXP-06, EXP-07 (Tendencias) is the remaining feature ODD. Any raw export or
server-side PDF requires a new, separate ODD.

## Progress

- **2026-10-23 — ODD created:** CSV contract, report page, print rules, Mapas
  link, caps, and acceptance defined; implementation not started.
- **2026-10-24 — L1 (kickoff, verbatim):** "okey puedes empezar con
  @odd/tasks/dashboard-expansion-06-reports.md". Branch
  `feat/dashboard-expansion-06-reports` from `main` (`d5dbca3`).
- **2026-10-24 — L2 (T1 contract fixed, gates resolved with the user):**
  - Columns exactly as in Scope §1, header row in Spanish, one row per
    territory of the dashboard aggregate (`territories.all` semantics:
    national scope = 16 regions; region scope = the region's catalog communes
    incl. zeros; commune scope = that one row), sorted accidents DESC then code
    ASC — same order as `/api/dashboard`.
  - `nivel` values: `Región` for region rows, `Comuna` for commune rows.
    National rows leave `codigo_comuna` and `comuna` empty; region/commune rows
    carry the selected region's roman identifier in `codigo_region` (region
    lookup for region scope; the `XIII-1` code prefix for commune scope).
  - **Number format (user chose comma, es-CL):** `siniestros`/`fallecidos` are
    plain integers without thousands separators; `participacion` has exactly
    one decimal with a comma (`45,2`), and because RFC 4180 separates fields
    with commas, the `participacion` cell is **always quoted** (`"45,2"`).
    Share denominator = total accidents of the current scope = sum of the
    exported rows' siniestros (reconciles with `kpis.accidents`); zero-total
    scopes emit `0,0`.
  - Text sanitization (formula injection) prefixes `'` to cells starting with
    `=`, `+`, `-`, `@`, tab, or CR, applied to every text cell including
    names; quoting rules then apply to the sanitized value.
  - Filename fixed: `accidentes-2025-territorios.csv` (no date stamp, user
    confirmed default). Print identity: no logo, institutional text header.
  - Caps: >346 rows or >50 KB serialized → `400` with the shared
    `VALIDATION_ERROR` body (field `export`, reason `too_large`), never
    truncated. A no-territory scope returns header-only with `200`.
  - Reuse: shared helper on the dashboard service over the existing
    `queryTerritories`/`resolveTerritory` SQL (no duplicated SQL, no fact rows
    in Node). Auth/CORS/`no-store` inherited from `applyApiGuard` on the
    dashboard plugin; success response overrides `Content-Type` to
    `text/csv; charset=utf-8` and keeps `Cache-Control: no-store`.
  - Frontend download must go through `fetch` + blob because the API requires
    the `Authorization: Bearer` header; a plain anchor would 401. "Descargar
    CSV" button carries the current URL filters to the endpoint and reuses the
    fixed filename.
- **2026-10-24 — Route declaration:** T2/T3 delegated (backend writer,
  parallel unit a) and T4/T5/T6 delegated (frontend writer, parallel unit b);
  disjoint edit surfaces, parent owns git and the seam check (T7).
- **2026-10-24 — L4 (delegation abandoned, user override, verbatim):**
  "mejor hazlo por 1 no hagas por orquestador si no por build". Both delegated
  writers died in the runtime (one empty result, one `Task cancelled` after
  provider validation errors); the frontend writer had already left partial
  files on disk. From this point the PARENT implements directly — the ODD stays
  tracked, but no writer/verifier subagents are launched for this slice. The
  crashed frontend diff was fully re-reviewed file by file, completed where
  needed, and is treated as parent-owned work (single-authorship review).
- **2026-10-24 — L5 (T2/T3 backend evidence):** parent-implemented
  test-first. `src/routes/export-csv.test.ts` written first; RED observed
  (404). Implementation: `lib/csv.ts` (BOM/CRLF/RFC 4180 serializer,
  formula-injection prefix, 346/50 KB limit errors),
  `controllers/export-csv-controller.ts` (row mapping, share via the exported
  single-source `percent()`, JSON error bodies), route registered inside the
  dashboard plugin so `applyApiGuard`/`baseFilterSchema`/error mapping apply
  unchanged; service gained `getTerritoryReport` reusing `resolveTerritory` +
  `queryTerritories` + a new `loadTerritoryReport` (region `numeroRomano`/
  `nombreNormal` lookup), and the territory comparator was extracted to
  `byTerritoryRank` shared with `getDashboard` (same ordering source). Every
  existing `DashboardService` fake gained the method (build caught one more
  fake in `analysis.test.ts`, whose reachability test now also asserts
  `/api/dashboard/export.csv` does not shadow `/api/dashboard`).
  `npm test` → 86/86 pass (74 before + 10 export + 2 service).
  `npm run build` → exit 0. `backend/docs/reports-api.md` documents the full
  contract (Spanish, matching `dashboard-api.md`) + a cross-link in that file's
  §1. New test file added to the explicit `test` script.
- **2026-10-24 — L6 (T4/T5/T6 frontend evidence):** `/informes` lazy route +
  nav enabled (the Layout now carries `location.search` into both `/analisis`
  and `/informes`); `use-reports-page.ts` keeps the URL-as-filter-store rule
  through the existing `useDashboardQuery` (no second data layer); presentational
  `components/reports/*` (header, KPI summary with explicit empty-scope card,
  preview table over `territories.items` with the all-rows CSV note, actions
  with classified Spanish download failures); CSV download via `fetch` + blob
  + object URL with the fixed filename (`csv-download.ts`), because the
  endpoint is Bearer-protected. `index.css` `@media print` flips the CSS-first
  tokens to ink-on-paper once, hides header/footer/nav/glass/dot-grid and the
  real filter markup (`form[aria-label="Filtros del panel"]`,
  `section[aria-label="Filtros del análisis"]` — the parent corrected the
  worker's dead `form[...]` selector for the analysis section), repeats table
  headers, avoids row splits, and `print:min-h-0` on the shell prevents a
  blank sheet. `TerritoryTable` adds a non-sortable "Ficha" column linking to
  `/informes` through `filtersToSearchParams` (never hand-built query strings,
  period preserved, `stopPropagation` without `preventDefault` so keyboard and
  sorting stay intact). `npm run lint` → 0 errors; `npm run build` → exit 0.
- **2026-10-24 — L7 (T7 live reconciliation, executed):** rebuilt
  `docker compose up -d --build`; with `Bearer`: `200`,
  `text/csv; charset=utf-8`, `attachment; filename="accidentes-2025-territorios.csv"`,
  `no-store`, `nosniff`; bytes start `ef bb bf`, every line CRLF-terminated.
  National: 16 rows, sums exactly `73,081` siniestros / `1,507` fallecidos
  against SQL and `/api/dashboard` KPIs; XIII row `20293,350,"27,8"`.
  Region XIII: 52 rows = 52 catalog communes, sums `20293/350`; top rows
  identical to SQL (Puente Alto `1662,8,"8,2"`, San Bernardo `1491,15,"7,3"`).
  Commune XIII-1: single row `502,4,"100,0"`. Zero-accident commune I-2
  (Camiña): `0,0,"0,0"` — zero stays distinguishable. Missing/bad Bearer →
  `401`; `regionId=17` → `400` `regionId is invalid`; `from=2024` → `400`
  `from must be within 2025`; all with the shared JSON bodies. Scratch CSVs
  kept under `/tmp/opencode/exp06/` (outside the repo, not committed).
  Remaining for the user: open the CSV in a spreadsheet and print-preview
  `/informes` (A4, repeated headers, hidden chrome) in the browser.
- **2026-10-24 — L8 (user browser pass + commits, slice closed):** the user
  tested `/informes` in the browser — CSV download/import, print view, and the
  `/mapas` "Ver ficha" link — and approved closing T7 ("Listo lo probe,
  cerramos T7"). Committed on `feat/dashboard-expansion-06-reports` after
  explicit permission: `f6d46ff` (docs: production-hardening phase-2 record)
  and `7d6fa2f` (feat: CSV export + `/informes`, 27 files). No push.
  Process note kept in the record: the two parallel writers failed in the
  runtime and the user ordered a direct build; the surviving frontend diff was
  re-reviewed file by file by the parent before accepting it.
