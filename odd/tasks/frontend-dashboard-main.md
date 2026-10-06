# Frontend Dashboard Main Slice

## Objective

Deliver the first main dashboard design for the AccidentesCarabineros frontend: public, aggregate-only, dark "Obsidian Telemetry" theme from `frontend/DESIGN.md`, built on shadcn/ui + Tailwind v4 + Recharts, fed by synthetic example JSON fixtures.

## Problem

Current app is the Vite demo (`App.tsx`, `index.css`); no shadcn/ui, no charts, no dashboard structure. User wants a primary design now and will refine later.

## Why

Establish the visual/structural foundation early so backend data can be wired later without redesigning components.

## Scope (this slice)

1. shadcn/ui init for Vite + Tailwind v4 (`@` alias, `components.json`, `lib/utils.ts`, theme tokens mapped to DESIGN.md: obsidian surfaces `#0A0B0D`/`#121316`, emerald `#00E599`, cyan `#00E3FD`, hazard amber `#FFB224`, incident crimson `#FF385C`; fonts Geist/Inter/JetBrains Mono with system fallbacks; dark-only).
2. Synthetic fixtures in `frontend/src/data/`: `dashboard-summary.example.json` (KPIs, generic-month trend series, severity distribution) and `territorial-ranking.example.json` (per-commune/region counts keyed by identifiers from `oversio-identifiers.json`). Clearly marked synthetic/demo; generic period labels (no real year claims).
3. Dashboard shell: collapsible left `Sidebar` with `SidebarTrigger` (mobile sheet), header with title + period/region/commune selects (client-side filtering of fixtures), main content area.
4. Visualizations via shadcn Charts (Recharts): KPI telemetry cards, monthly trend line chart, severity distribution bar chart, top-territories ranking (horizontal bar + accessible table fallback). Tooltips + legends visible; focus rings visible; no data meaning by color alone.
5. Replace Vite demo (`App.tsx`/`App.css`), fix `index.html` stylesheet reference, wire `Layout/Header/Footer` sensibly.

## Out of scope

Routing library, backend/API integration, real data, maps (MapLibre), auth, tests beyond build/lint (no runner configured).

## Constraints

- Tailwind v4 CSS-first: no `tailwind.config.js`.
- `tsconfig.app.json`: `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noUnusedLocals/Parameters` — no enums/namespaces, `import type` for types.
- `npm run build` = `tsc -b && vite build`; type errors fail build.
- Preserve committed `src/layout/` and `src/components/Hero/` intent; integrate, don't delete user work arbitrarily.
- Fixtures must not present values as official statistics.

## Tasks

- [x] T1 shadcn init + theme tokens + `@` alias + utils + deps (recharts, etc.)
- [x] T2 Data contract (`src/types/dashboard.ts`) + `dashboard-summary.example.json` + `territorial-ranking.example.json`
- [x] T3 Dashboard shell: Sidebar/Header/filters wired to fixture state
- [x] T4 Charts + KPI cards + ranking table, a11y (focus, legends, fallbacks)
- [x] T5 Verification: `npm install`, `npm run build`, `npm run lint`, dev smoke HTTP 200; record evidence (work-unit commit is parent-owned, see Next step)

## Acceptance criteria

- `npm run build` and `npm run lint` pass with 0 errors.
- `/` shows the dark dashboard with KPIs, trend chart, severity chart, territorial ranking, working period/region/commune filters over synthetic data.
- Keyboard focus visible; sidebar collapsible; layout responsive at 375/768/1024/1440 px.

## Checks

- `cd frontend && npm install`
- `cd frontend && npm run build`
- `cd frontend && npm run lint`
- dev smoke: `npm run dev` + `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` → 200

## Route

Delegated direct (writer trigger: 2+ non-trivial files). No test runner exists → test-first exception; functional checks are build/lint/smoke.

## Progress

- Planned after user confirmed generic-period synthetic fixtures and `oversio-identifiers.json` as canonical territorial catalog. Implementation started 2026-10-06.
- **T1 done 2026-10-06**: shadcn CLI v4 init non-interactive (`npx shadcn@latest init -b radix -p nova -y` — `-p` is required or it prompts for preset), then `add button card input label select separator sheet sidebar chart table tabs tooltip`. `@` alias wired in `vite.config.ts` (path.resolve) + `tsconfig*.json` (`paths` **without** `baseUrl` — TS 6 fails with TS5101). `src/index.css` re-themed after the CLI overwrote it: DESIGN.md Obsidian Telemetry dark-only tokens mirrored in `:root` and `.dark` (background #0A0B0D, card #121316, popover #18191B, primary #00E599/#003822, secondary #00E3FD, accent #FFB224, destructive #FF385C, border rgba(255,255,255,0.08), ring emerald, chart-1..5 emerald/cyan/amber/crimson/icy-mint, `--radius: 0.5rem`, DESIGN radius scale). Fonts: Geist local via `@fontsource-variable/geist` (preset dep); Inter + JetBrains Mono via Google Fonts `@import` — **must be the first CSS line** or the bundler invalidates its position; fallback stacks make offline degrade safe. Sidebar widths set to 240px/64px per DESIGN.md. `index.html` fixed: dead `/src/style.css` link removed, `lang="es" class="dark"`, title "Accident Traffic Dashboard". `src/App.css` deleted.
- **T2 done 2026-10-06**: `src/types/dashboard.ts` (synthetic markers, generic `Jan`..`Dec` keys, no year claims, catalog/filter/data types). `dashboard-summary.example.json` + `territorial-ranking.example.json` (`source: "example-synthetic"`, `synthetic: true`; 24 rows keyed by real catalog identifiers: XIII-9 La Florida, VII-1 Talca, X-20 Osorno, XIV-1 Valdivia, XVI-10 Chillán…). Invariants asserted at generation: per row `fatal+serious+minor+property == accidents`, `fatal == fatalities`, `serious+minor == injuries`; KPIs equal monthlyTrend column sums; severity buckets sum to `kpis.accidents`. `src/lib/data.ts` is the single join point (catalog names/identifiers + filter derivation with largest-remainder month spread); `src/data/README.md` documents coverage and the "not official statistics" rule.
- **T3 done 2026-10-06**: `App.tsx` → shell: collapsible `Sidebar` (icon rail, Dashboard active, Maps/Reports disabled with sr-only "coming soon") + `TooltipProvider`, `Header` (SidebarTrigger + brand + period/region/commune `Select` filters, region cascades and resets commune), `main` + slim `Footer`. Committed `src/layout/*` kept and adapted (Layout now composes Sidebar+Header+main+Footer; Header takes a `toolbar` slot). Filters are `useState`/`useMemo` client-side only.
- **T4 done 2026-10-06**: 4 KPI telemetry cards (mono uppercase micro-label + tabular display metric + sparkline flush to card bottom); monthly trend multi-series line chart (distinct colors **plus** dash/dot patterns and legend, tooltip); severity bar chart with direct value labels on bars and category labels on axis; top-10 territories horizontal bar chart with named bars + `Table` accessible fallback (rank/region/commune/identifier/counts) via `Tabs`. All charts in `ChartContainer` with theme-token configs; regions wrapped with `role="img"` + aria-labels; `prefers-reduced-motion` disables Recharts animations and global transitions; empty scope shows an amber notice instead of silent zeros.
- **T5 done 2026-10-06** (post hook-fix re-run): `npm install` → ok (audit notices only). `npm run lint` → **0 errors, 0 warnings** (exit 0). `npm run build` → tsc -b clean, vite `✓ built` (2588 modules). Dev smoke with fresh server (`vite --port 5199 --strictPort`): `/`, `src/App.tsx`, `src/components/ui/sidebar.tsx`, `src/hooks/use-mobile.ts`, `src/lib/data.ts` (JSON imports resolved) and all dashboard charts → 200. `vite preview --port 5200` → `/`, hashed JS/CSS 200; theme tokens present in built CSS.
  - Port-conflict note: the literal check `http://localhost:5173/` is occupied by a stale dev server started 14:21 (before this task, PID 17165, outside this session) whose cached resolver 500s on new files; restart/close that process to smoke 5173 itself. New HTML was verified served on clean ports.
  - Lint path taken: registry ui files exported non-components (react-refresh) → localized `buttonVariants`/`tabsListVariants`/`useSidebar` exports inside `src/components/ui/**` (no consumers). Remaining `react-hooks/set-state-in-effect` error in CLI-generated `src/hooks/use-mobile.ts` (outside allowed surfaces) → user authorized option A: rewritten with lazy `useState` initializer; effect only subscribes matchMedia (same behavior).
  - Follow-up (not this slice): single JS chunk is 802 kB (≈245 kB gzip), mostly recharts → route-level code splitting when routing lands.

## Next step

- Parent: commit this slice as one work unit — `feat(frontend): main dashboard design with shadcn and charts` (stage `frontend/` + this doc; frontend/ is untracked so verify no `node_modules`/`dist` enter the index; datasets stay out).
- Follow-ups: recharts chunk-splitting with routing; wire real backend into `src/lib/data.ts` (isolated join point); Maps/Reports nav; user dev server on 5173 needs a restart.
