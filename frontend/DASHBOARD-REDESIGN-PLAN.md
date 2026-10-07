# Map-First Dashboard Redesign Plan

**Status:** For user review. This document proposes the layout; it does not authorize or start implementation.

Reshape the road-safety dashboard around a prominent map workspace, visible filters, and four core indicators. Preserve the existing charts below the first-view dashboard and keep the current dark telemetry design system.

## Product and audience

- **Product:** Aggregate road-safety analytics dashboard for Carabineros de Chile.
- **Audience:** Analysts and operational readers comparing accident indicators by period and territory.
- **Primary job:** Set a period, region, or commune; scan the four key indicators; inspect larger trend and severity charts below.

## Design tokens

| Token | Value | Role |
| --- | --- | --- |
| Obsidian canvas | `#0A0B0D` | Page background |
| Carbon surface | `#121316` | Header, panels, and KPI surfaces |
| Raised surface | `#18191B` | Secondary controls and inset areas |
| Icy text | `#E4F1EB` | Main text on dark surfaces |
| Signal emerald | `#00E599` | Active navigation and focus/selection accents |
| Map canvas | `#FFFFFF` | Deliberately light, empty map placeholder |

Keep existing chart accents—cyan `#00E3FD`, amber `#FFB224`, and crimson `#FF385C`—for their current data/status roles. Do not introduce new gradients or a second decorative palette.

## Typography

- **Geist:** section headings and dashboard identity.
- **Inter:** filter labels, controls, and explanatory copy.
- **JetBrains Mono:** telemetry labels and numeric readouts, following existing components.
- Keep headings sentence case and left-aligned. Keep KPI labels and values left-aligned; anchor disabled zoom controls at the canvas's upper-left edge.

## Layout concept

### Desktop: 1024px and wider

The floating header remains at the top. Move filters out of the header and into the right-hand dashboard panel. Give the map workspace about 45% of the main row and the filter/KPI panel about 55%.

```text
┌──────────────── Floating horizontal header ────────────────┐
│                                                             │
│  ┌──────────── Map placeholder ─────────┐ ┌── Filters ─────┐│
│  │                                       │ │ Period / Region││
│  │  [−] [+]                              │ │ / Commune      ││
│  │  Blank white canvas                  │ ├────────┬───────┤│
│  │                                       │ │ KPI 1  │ KPI 2 ││
│  │                                       │ ├────────┼───────┤│
│  │                                       │ │ KPI 3  │ KPI 4 ││
│  └───────────────────────────────────────┘ └────────┴───────┘│
├────────────────── Charts section ────────────────────────────┤
│  Trend chart                         Severity chart           │
│  Territory ranking (full width)                               │
└─────────────────────────────────────────────────────────────┘
```

### Mobile and tablet: below 1024px

Stack the map workspace, filters, and KPI group. Use a two-column KPI grid when there is enough width, then one column on narrow screens. Keep the charts in a single column until there is room for a readable side-by-side layout.

```text
┌──────── Floating header ────────┐
├──────── Map placeholder ────────┤
│ [−] [+]       Blank white area  │
├──────── Filters ────────────────┤
├──── KPI 1 ────┬──── KPI 2 ─────┤
├──── KPI 3 ────┴──── KPI 4 ─────┤
├──────── Trend chart ────────────┤
├──────── Severity chart ────────┤
├──────── Territory ranking ─────┤
└─────────────────────────────────┘
```

## Interaction and content

- Keep the existing Period, Region, and Commune filters functional and preserve their current cascading behavior.
- Show the existing KPI set: Accidents, Fatalities, Injuries, and Active cases.
- Reserve the left workspace for a future Chile vector map. In this phase it is a plain white canvas: no GeoJSON, map library, silhouette, metrics, or click behavior.
- Show `+` and `−` zoom controls as disabled, clearly non-functional affordances. Give each an accessible name and a minimum 44×44px target; do not imply that zoom is available.
- Keep the existing trend, severity, and territory-ranking charts below the first-view layout. Preserve their data calculations and synthetic-data disclosures.
- Do not add Export buttons until their output and behavior are defined.

## Implementation outline

1. Keep `App.tsx` as the owner of filter state and derived dashboard data; pass filter values and change handlers to the dashboard view.
2. Keep the floating horizontal navigation in `Header.tsx`; remove its filter-toolbar responsibility.
3. Restructure `dashboard-view.tsx` into the map/filter/KPI first-view row and a separate charts section.
4. Add a small `map-placeholder.tsx` component so the reserved white canvas and disabled zoom controls can later be replaced without changing dashboard composition.
5. Reuse `DashboardFiltersBar`, `KpiCards`, and the existing chart components. Avoid changes to fixture calculations or adding map dependencies/data in this phase.

Expected touchpoints: `frontend/src/App.tsx`, `frontend/src/layout/Header.tsx`, `frontend/src/layout/Layout.tsx`, `frontend/src/components/dashboard/dashboard-view.tsx`, and a new `frontend/src/components/dashboard/map-placeholder.tsx`. `frontend/src/components/dashboard/dashboard-filters.tsx` may need only layout adjustments if the existing widths do not fit the right panel.

## Review against the brief

- The dark dashboard and neon signal color could look like a generic telemetry template on their own. They remain because `frontend/DESIGN.md` explicitly defines that system; the design’s distinctive focal point is the intentionally empty white map workspace, not extra glow or decoration.
- The empty map is deliberate, not missing data. Keep its blank state visually clean and avoid fake geography or sample values.
- Existing territorial fixture coverage is partial and synthetic. Do not imply that the reserved map represents complete regional accident statistics.
- The mockup includes Export controls, but no export action or format was requested. Exclude inert export buttons.

## Acceptance and verification

- The header remains floating and consistent with the existing dark palette and font system.
- Desktop shows the map placeholder on the left and filters plus four KPIs on the right; smaller screens stack these regions without horizontal scrolling or clipped filter labels.
- The map canvas is white and empty; zoom controls are visibly disabled and have accessible names.
- Filters and existing charts retain their current behavior and synthetic-data labeling.
- `npm run build` and `npm run lint` pass. No test runner is currently configured.
- Browser-based visual verification is excluded until separately requested.

## Next step

Review and approve or revise this plan before implementation begins.
