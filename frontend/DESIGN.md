---
name: Obsidian Telemetry
colors:
  background: '#0A0B0D'
  surface: '#121316'
  surface-raised: '#18191B'
  on-surface: '#E4F1EB'
  on-surface-muted: 'rgba(228, 241, 235, 0.6)'
  outline: 'rgba(255, 255, 255, 0.08)'
  outline-strong: 'rgba(255, 255, 255, 0.12)'
  primary: '#00E599'
  on-primary: '#003822'
  secondary: '#00E3FD'
  on-secondary: '#00363D'
  warning: '#FFB224'
  destructive: '#FF385C'
  on-destructive: '#28000A'
  ring: '#00E599'
  chart-1: '#00E599'
  chart-2: '#00B87D'
  chart-3: '#5B9683'
  chart-4: '#8B9793'
  chart-5: '#C3CCC9'
  map-bin-1: '#1C2F2A'
  map-bin-2: '#24463C'
  map-bin-3: '#2F6A56'
  map-zero: '#14151A'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 56px
    fontWeight: '600'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-sm:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  md: 0.25rem
  lg: 0.5rem
  xl: 0.75rem
  2xl: 1rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1.25rem
  margin-lg: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

# Design System: Obsidian Telemetry

**Project ID:** local — synthesized from the `frontend/` implementation and design assets; no Stitch project is bound to this workspace.

## 1. Visual Theme & Atmosphere

Obsidian Telemetry is a **sober, instrument-grade analytics environment** for reading road-safety data published by Carabineros de Chile. It serves analysts and operational readers who compare accident indicators across periods, regions, and communes, so the interface behaves like a calibrated dashboard rather than a marketing surface: dark, quiet, dense with meaning, and free of decorative noise.

The mood is **operational clarity under low light**. A near-black obsidian canvas recedes behind floating glass panels, hairline borders, and a faint dot-grid plane. Color is a signal, never an ornament: emerald marks what is active, selected, or healthy; amber marks caution; crimson marks failure or destruction. Most of the screen is neutral so a single emerald value can carry attention without competing with itself.

The aesthetic fuses **technical high-contrast minimalism** with **tactical glassmorphism**. Surfaces are translucent and stratified instead of heavily shadowed. Typography is compact and squared-off, with monospaced numerals that hold their position while data refreshes. The result should feel institutional and trustworthy — public-service software with the precision of an operations console, not a consumer app.

Spanish (`es-CL`) is the interface language, including number formatting and dates. Copy is plain, factual, and discloses data scope; it never dramatizes casualties.

## 2. Color Palette & Roles

### Foundations

- **Obsidian Canvas (#0A0B0D):** The page plane and deepest layer. Maps, charts, and the dot-grid overlay sit directly on it. It is the reference against which every raised surface reads as elevated.
- **Carbon Surface (#121316):** The standard panel and card fill, rendered at 85% opacity with a 16px backdrop blur. Used for the floating header, KPI tiles, filter groups, and chart cards.
- **Raised Surface (#18191B):** The next stratum for popovers, menus, secondary controls, inset areas, and tooltip boxes. Frequently used at 95% opacity when it floats above content.
- **Icy Text (#E4F1EB):** Primary reading color on dark surfaces. A cool mint-white that avoids the harshness of pure white across long analytical sessions.
- **Muted Icy Text (rgba(228, 241, 235, 0.6)):** Secondary copy, labels, captions, axis ticks, and metadata. Never used for the single most important value in a view.
- **Hairline Outline (rgba(255, 255, 255, 0.08)):** Structural separators and panel edges. A second, slightly stronger input outline (rgba(255, 255, 255, 0.12)) defines interactive fields.
- **Deep Emerald Ink (#003822):** Text and icons placed on a solid emerald fill. It preserves contrast without introducing a second hue.

### Signal Accents

- **Signal Emerald (#00E599):** The signature accent and the only primary action color. Applied to active navigation, selected regions, focus rings, primary buttons, loaded-series indicators, and the top choropleth bin. A hover halo (`0 0 16px rgba(0, 229, 153, 0.4)`) is the system's one atmospheric glow.
- **Electric Cyan (#00E3FD):** A secondary accent reserved for informational emphasis and complementary data roles. It never competes with emerald for the primary action.
- **Hazard Amber (#FFB224):** Warnings, thresholds, and attention states. Usually expressed as amber text on a 12% amber wash rather than a saturated fill.
- **Incident Crimson (#FF385C):** Destructive actions, critical states, and failure messaging. Like amber, it appears as tinted text and borders on dark surfaces, not as a large crimson block.

### Data Visualization Ramp

- **Emerald (#00E599), Green (#00B87D), Teal-Gray (#5B9683), Gray (#8B9793), Light Gray (#C3CCC9):** A deliberately **monochrome gray-to-emerald ramp**. Series are distinguished by lightness plus labels, legends, and line styles — never by hue alone. This keeps the dashboard readable for color-vision deficiencies and prevents a rainbow-chart look.
- **Severity logic:** Harm cools toward gray as it increases. Fatal outcomes use gray, serious injuries teal-gray, minor injuries green, and uninjured-only outcomes emerald. Category names are always labeled, so color is reinforcement, not the message.

### Territory Choropleth

- **Bins (#1C2F2A → #24463C → #2F6A56 → #00B87D → #00E599):** Quantile steps of the same gray-to-emerald family, tuned to stay legible on the obsidian plane.
- **No-Accident Territory (#14151A):** A loaded zero, visually quieter than the lowest positive bin.
- **No-Data Territory (transparent with a dashed outline):** A failed join or unavailable series. It must never be confused with zero; dashed strokes carry that distinction.

### Contrast Strategy

Primary values use full Icy Text; supporting labels drop to 60% opacity; placeholders and disabled navigation drop further. Borders stay at or below 12% white so structure is felt before it is seen. No gradients are used as decoration, and no second accent palette is introduced.

## 3. Typography Rules

- **Geist for headings and identity.** Dashboard title, section headings, card titles, and institutional labels use the variable Geist family with tight negative tracking (`-0.02em`). The geometry is compact and contemporary, which keeps dense analytical screens from feeling soft or editorial. Section headings are sentence case, left-aligned, and sized around 18px semibold.
- **Inter for reading and controls.** Body copy, filter labels, navigation, descriptive text, and footer disclosures use Inter. It is chosen for rendering fidelity at 12–16px and for staying calm when set in multi-column metadata.
- **JetBrains Mono for telemetry.** Every metric label, metric value, select value, chart description, map tooltip, version string, and tabular figure uses JetBrains Mono. Tabular numerals are mandatory on all monospace text so live data refreshes do not shift layout.
- **Micro-label cadence.** The `metric-label` style is 10px, 500 weight, 14px line height, `0.08em` tracking, uppercase, and muted. It behaves like a silkscreen label on hardware: small, tracked, and unmistakably a label rather than content.
- **Metric readouts.** KPI values are monospaced, tabular, semibold, and set around 30px with tight tracking. They are the loudest typographic element in a card and should remain the only element at that weight in their immediate area.
- **Chart typography.** Axis ticks sit at 10–11px, chart descriptions at 12px monospace muted, and value labels directly on bars at 10px monospace. Chart titles stay in Geist at 16px medium.
- **Hierarchy rule.** Weight and family — not color — create hierarchy. Accent color is reserved for state, selection, and data encoding.

## 4. Component Stylings

### Buttons

- **Primary:** Solid Signal Emerald with Deep Emerald Ink text. Corners are softly squared (8px). Hover raises brightness and adds the emerald atmospheric halo; press applies a `0.98` scale. Primary buttons are rare and always the single most consequential action in their region.
- **Secondary and outline:** Transparent or raised-surface fill with a 1px hairline border and Icy Text. Hover moves the surface one step lighter rather than changing hue.
- **Ghost:** No border or fill until hover, when it receives the raised surface. Used for tertiary navigation and icon actions.
- **Destructive:** Crimson text on a low-opacity crimson wash with a crimson-tinted border. It reads as a warning, not as a filled red button.
- **Sizing:** Compact data controls sit at 32–36px height; navigation items and map zoom controls maintain a minimum 44×44px target. Disabled controls stay visible but drop to 50% opacity and lose pointer events.

### Cards and Containers

- **Glass card:** Carbon Surface at 85% opacity, 16px backdrop blur, 1px edge at 6–8% white, and an 8px corner radius. Cards carry **no drop shadow**; elevation comes from translucency and the hairline edge.
- **KPI tiles:** Four tiles in a 2×2 desktop grid. Each opens with a tracked monospace micro-label, then a large tabular value, then a sparkline that sits flush against the card's bottom edge with no padding. Loading uses a pulsing muted block at the value's exact height, so nothing shifts when data arrives.
- **Chart cards:** Geist title, monospace muted scope description, and a fixed-height chart body (around 256px). Titles and body heights are mirrored by skeletons during loading.
- **Section framing:** Major dashboard regions are separated by a single hairline rule (`border-border/70`) plus generous vertical padding, not by nested boxes.

### Inputs and Forms

- **Selects:** 36px height, 8px radius, near-black obsidian fill, 1px input outline, and monospace 12px value text. The label above is a `metric-label` micro-label, never a floating placeholder.
- **Focus:** Focus replaces the browser outline with a crisp emerald border plus an internal ambient glow (`0 0 0 1px #00E599, 0 0 12px rgba(0, 229, 153, 0.2)`).
- **Cascade behavior:** Filters read Period → Region → Commune. Changing the region resets the commune; selecting a region on the map applies the same cascade, so both entry points stay consistent.
- **Disabled and invalid:** Disabled fields drop to 50% opacity; invalid fields shift their border and ring to crimson.

### Status Chips

- **Shape:** Pill-shaped, 20px tall, `2px 8px` padding, 10px uppercase monospace with `0.08em` tracking.
- **Healthy:** Emerald text on an 8% emerald wash with a 20% emerald border.
- **Warning:** Amber text on an 8% amber wash with a 20% amber border.
- **Critical:** Crimson text on an 8% crimson wash with a 20% crimson border.
- Chips describe state, never volume; they are not used as decorative tags.

### Header and Navigation

- **Floating glass header:** Sticky at the top, inset from the viewport edges by 16px on small screens and 40px from the `md` breakpoint. It is a glass card, not a full-bleed bar, so the dot-grid canvas remains visible around it.
- **Brand lockup:** The Carabineros mark paired with the collaboration mark, followed by the Geist title “Siniestros viales de Chile” and the micro-label “Análisis de siniestros viales”.
- **Navigation:** Compact items with 16px Lucide icons and 14px Inter labels. The active item uses a 10% emerald wash with emerald text; unavailable items are visibly disabled and carry the suffix “(Próximamente)” instead of behaving like dead links.
- **Mobile:** The header simplifies to a centered brand mark and a hamburger sheet. The 64px collapsed / 240px expanded rail dimensions are retained only for the secondary sidebar primitive, not for the primary header.

### Interactive Map

- **Canvas:** Transparent by design; region fills are painted directly on the obsidian plane. Regions are separated by 1px white strokes.
- **States:** Hover raises brightness; selection thickens the stroke to 2.5px emerald and lifts brightness; unselected regions dim to 32% while a filter is active; no-data regions use a `4 3` dashed outline and remain non-interactive.
- **Tooltip:** Raised surface at 95% opacity with an emerald-tinted border, monospace value text in emerald, and a soft directional shadow (`0 8px 20px rgba(0, 0, 0, 0.8)`) — the only pronounced shadow in the system.
- **Zoom:** Plus and minus controls sit on the raised surface with a hairline border, switch the border to emerald on hover, keep a 44×44px target, and carry accessible names. Map animation and transitions are removed when reduced motion is requested.

### Charts, Tables, and Tabs

- **Line charts:** 2px strokes; solid emerald for accidents, dashed teal-gray for injuries, dashed green for serious injuries, and gray with small dots for fatalities. Horizontal-only dashed grid lines, no vertical grid, no tick marks.
- **Bar charts:** 2px top corner radius, severity-cooled fills, and monospace value labels above each bar.
- **Tables:** Fixed-height analytical rows, hairline bottom dividers, muted hover wash, and key columns (IDs, dates, counts) in monospace.
- **Tabs:** Compact segmented control in a muted trough; the selected tab settles onto a darker inset fill, switches to full-strength text, and gains a hairline border.

### Footer

- **Institutional surface:** Carbon Surface at 75% opacity above a top hairline border. Three zones: institutional resources, data provenance and scope, and the Government of Chile mark with the collaboration lockup.
- **Disclosure tone:** The footer states the official source, the 2025 period, that figures are aggregate, and that the visualization does not imply institutional endorsement. These statements are part of the design contract, not optional copy.
- **Utility strip:** A final hairline-separated row carries the project name and a monospace “Versión 0.1” marker.

## 5. Layout Principles

- **Application shell:** A full-height column — sticky floating header, flexible dot-grid main area, institutional footer. The shell never scrolls horizontally; panels absorb width changes instead.
- **Content rhythm:** Page padding is 16px on small screens and 40px from the `md` breakpoint. Grid gaps are 16px. Internal card padding is 12–16px, and all spacing follows a 4px/8px cadence. Density is intentional: analytical cards should keep their primary readout above the fold.
- **Desktop workspace (1024px and wider):** The first view is a two-pane dashboard row. The Chile map occupies the left half, pinned to roughly the viewport height with 40px outer gutters. The right half stacks a filter card above a 2×2 KPI grid. This 50/50 split is the signature composition.
- **Analytical section:** Below the first view, charts use a 7-column grid — trend chart across 4 columns, severity distribution across 3 — followed by a full-width territory ranking. Section headings and hairline rules introduce each region.
- **Mobile and tablet (below 1024px):** Everything stacks: a 60vh map block, the filter card, one-column KPIs that become two columns at `sm`, then single-column charts. The map remains first because territory is the primary mental model.
- **Width strategy:** Content is fluid rather than fixed. The footer caps its inner grid at 1600px; dashboard panels do not, so ultra-wide screens gain analysis space instead of empty margins. Prefer `w-full` over viewport units to avoid scrollbar-induced overflow.
- **Elevation order:** Canvas → glass cards → raised overlays. Never introduce a fourth visual layer; deeper nesting is expressed with hairlines and spacing, not with more shadows.
- **Motion:** Motion is functional only — chart entry, hover brightness, and surface transitions. All animation, transitions, and smooth scrolling collapse to near-zero duration under `prefers-reduced-motion`.
- **Accessibility:** Focus is always visible through the emerald ring. Color never carries meaning alone: series use line style plus legend, map bins use labels plus tooltip values, and severity uses labeled categories. Interactive targets respect 44px where the control is a primary touch affordance.
