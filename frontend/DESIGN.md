---
name: Obsidian Telemetry Engine
colors:
  surface: '#121316'
  surface-dim: '#121316'
  surface-bright: '#38393c'
  surface-container-lowest: '#0d0e11'
  surface-container-low: '#1b1b1f'
  surface-container: '#1f1f23'
  surface-container-high: '#292a2d'
  surface-container-highest: '#343538'
  on-surface: '#e3e2e6'
  on-surface-variant: '#bacbbe'
  inverse-surface: '#e3e2e6'
  inverse-on-surface: '#2f3034'
  outline: '#849589'
  outline-variant: '#3b4a41'
  surface-tint: '#00e297'
  primary: '#6dffba'
  on-primary: '#003822'
  primary-container: '#00e599'
  on-primary-container: '#00613e'
  inverse-primary: '#006c46'
  secondary: '#bdf4ff'
  on-secondary: '#00363d'
  secondary-container: '#00e3fd'
  on-secondary-container: '#00616d'
  tertiary: '#dbe8e2'
  on-tertiary: '#27332f'
  tertiary-container: '#bfccc6'
  on-tertiary-container: '#4b5752'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#4dffb2'
  primary-fixed-dim: '#00e297'
  on-primary-fixed: '#002112'
  on-primary-fixed-variant: '#005234'
  secondary-fixed: '#9cf0ff'
  secondary-fixed-dim: '#00daf3'
  on-secondary-fixed: '#001f24'
  on-secondary-fixed-variant: '#004f58'
  tertiary-fixed: '#d8e5e0'
  tertiary-fixed-dim: '#bdc9c4'
  on-tertiary-fixed: '#131e1a'
  on-tertiary-fixed-variant: '#3d4945'
  background: '#121316'
  on-background: '#e3e2e6'
  surface-variant: '#343538'
  surface-base: '#0A0B0D'
  surface-subtle: '#18191B'
  hazard-amber: '#FFB224'
  incident-crimson: '#FF385C'
  border-glow: '#00E59933'
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
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
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
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
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
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.02em
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
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
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

## Brand & Style

This design system targets infrastructure engineers, distributed systems operators, and data intelligence architects managing mission-critical cloud pipelines and high-throughput real-time telemetry. The platform evokes absolute technical precision, mission readiness, and zero-latency operational clarity. The interface treats raw data as high-fidelity instrument readouts rather than marketing surfaces.

The visual direction merges **Technical High-Contrast Minimalism** with **Tactical Glassmorphism**. Deep obsidian and jet surfaces provide an uncompromising void where vibrant neon chromatic accents communicate operational status, resource velocity, and incident severity. Structural layouts are disciplined and compact, relying on subtle micro-borders, subdued inner glows, and layered glass cards to anchor complex statistical monitors, query editors, and geospatial node maps without visual fatigue.

## Colors

The chromatic architecture is constructed to maximize contrast on pure dark surfaces while avoiding visual blur:

- **Primary (`#00E599`)**: The signature Neon emerald. Applied intentionally for active states, operational runtime health (200 OK), query performance indicators, and primary execution calls.
- **Secondary (`#00E5FF`)**: Pure electric cyan. Reserved for geospatial vectors, data streams, throughput metrics, and telemetry connection states.
- **Tertiary (`#E4F1EB`)**: An icy mint-white off-neutral. Deployed for elevated surface highlights, structural hairline dividers, and high-readability scalar titles.
- **Neutral (`#121316`)**: The baseline carbon surface foundation, tuned cooler than pure black to allow `#0A0B0D` canvas wells to recede beneath elevated instrument tiles.

### Contextual Status & Telemetry Scale
- **Hazard Amber (`#FFB224`)**: P99 latency regressions, queue saturation, and threshold warnings.
- **Incident Crimson (`#FF385C`)**: Node failure, network partition, threshold breach, and destructive actions.
- **Text & Contrast Strategy**: Primary text uses `#FFFFFF` for display heads and `#E4F1EB` for body typography. Subdued values and metadata use `rgba(228, 241, 235, 0.6)`. Borders default to `rgba(255, 255, 255, 0.08)` or `border-glow` (`rgba(0, 229, 153, 0.2)`) on active focus.

## Typography

The typographic hierarchy balances modern engineering efficiency with clinical scannability:

- **Headlines & Display (Geist)**: Delivers tight, contemporary geometric kerning that handles dense data dashboards without visual clutter. Display scales use negative letter-spacing to reinforce architectural density.
- **Body & Paragraphs (Inter)**: The primary vehicle for interface copy, technical documentation, and complex multi-column metadata grids. Excellent rendering fidelity at sub-14px sizes.
- **Labels, Telemetry, and Metrics (JetBrains Mono)**: Exclusively drives metric counters, query consoles, hash strings, IP ranges, and system state labels. Tabular numeric figures (`tnum`) must remain forced on all monospace representations to eliminate layout shift during live stream refreshes.

## Layout & Spacing

Layouts adhere to an explicit, high-density 12-column grid configured for horizontal real estate utilization on ultra-wide data terminals and multi-pane developer workflows:

- **Grid & Gutters**: Standard desktop implementations utilize a fluid 12-column container with 16px (`gutter`) to 24px (`gutter-lg`) gutters. Breakpoint adaptations compress columns to 8 for tablet dashboards and 4 for mobile viewports.
- **Telemetry Shell**: Primary navigation relies on a persistent left-hand collapsible icon rail (64px collapsed, 240px expanded) paired with an analytical split view: visual workspace on the left (60-70% width) and real-time inspector or code canvas on the right (30-40% width).
- **Rhythm**: Element padding and control gaps scale strictly along a 4px/8px modular cadence. Inner metric cards favor tight padding (`space-md`) to ensure dense dashboards remain above the fold.

## Elevation & Depth

Visual depth is achieved through translucent structural stratification rather than heavy, diffuse cast shadows:

1. **Base Layer (Canvas)**: Hex `#0A0B0D`. The deep backdrop anchor. Geospatial charts and topology graphs render directly onto this plane, punctuated by an optional 1px dot-grid overlay (`rgba(255, 255, 255, 0.04)` at 24px intervals).
2. **Surface Layer (Cards & Panels)**: Background `#121316` rendered at 85% opacity with `backdrop-filter: blur(16px)`. Bordered by a hairline 1px stroke of `rgba(255, 255, 255, 0.08)`.
3. **Elevated Overlays (Flyouts, Menus, Modals)**: Background `#18191B` at 95% opacity with an intense localized border glow (`0 0 0 1px rgba(0, 229, 153, 0.25)`) and a directional vertical drop shadow of `0 16px 32px -8px rgba(0, 0, 0, 0.8)`.
4. **Neon Atmospheric Radiance**: Interactive active states and critical alerts project controlled neon halos via `box-shadow: 0 0 20px -4px var(--accent-glow)`. Diffusions must remain tight and subdued to preserve surgical instrument aesthetics.

## Shapes

The platform adopts a soft-geometric, precision-machined edge language (Level 1):

- **Interactive Nodes, Buttons, & Inputs**: Standard corner radius of `0.25rem` (4px). This low radius delivers structural, enterprise-grade firmness.
- **Containers, Metric Cards, & Panels**: Intermediate radius of `0.5rem` (`rounded-lg` / 8px). Corners stay clean without softening into consumer-app roundness.
- **Pills, Badges, & Status Indicators**: Dedicated full-radius encapsulation (`rounded-full` / 9999px) strictly for real-time status lozenges (e.g., active node counts, HTTP response chips) to visually separate metadata tokens from rectangular cards.

## Components

### Buttons
- **Primary**: Solid `#00E599` background, `#0A0B0D` bold typography (`Geist` or `JetBrains Mono`). Hover initiates a subtle brightness increase and an emerald atmospheric halo (`0 0 16px rgba(0, 229, 153, 0.4)`). Active state applies a scale transform of `0.98`.
- **Secondary / Ghost**: Semi-transparent `#18191B` background, 1px border of `rgba(255, 255, 255, 0.12)`, text `#E4F1EB`. Hover transitions the border to `#00E599` with text turning white.
- **Destructive**: `#18191B` background with a 1px border of `#FF385C66` and text `#FF385C`. Active trigger evokes an incident crimson outer glow.

### Telemetry Cards & Metric Monitors
- High-performance glass containers with 8px radius, `#121316` fill at 85% opacity, and a 1px edge stroke of `rgba(255, 255, 255, 0.06)`.
- Cards feature a dual-line header: uppercase micro-label in `label-sm` (`JetBrains Mono`) tracking system identifiers, followed by large metric readouts in `display-sm` (`tnum` monospace figures). Sparklines or trend vectors sit flush against the card bottom with zero margin.

### Chips & Status Badges
- Pill-shaped (`rounded-full`), height of 20px-24px, inner padding `2px 8px`.
- Composed of an 8px glowing indicator pip accompanied by `label-sm` monospaced copy.
- Variants:
  - *Healthy*: Pip `#00E599`, background `rgba(0, 229, 153, 0.08)`, border `rgba(0, 229, 153, 0.2)`.
  - *Warning*: Pip `#FFB224`, background `rgba(255, 178, 36, 0.08)`, border `rgba(255, 178, 36, 0.2)`.
  - *Critical*: Pip `#FF385C`, background `rgba(255, 56, 92, 0.08)`, border `rgba(255, 56, 92, 0.2)`.

### Input Fields & Query Terminals
- Box model built on 4px radius, `#0A0B0D` fill, and a 1px border of `rgba(255, 255, 255, 0.12)`. Text renders in `code-md` (`JetBrains Mono`).
- Focus state eliminates standard browser outlines, applying a crisp border switch to `#00E599` backed by an internal ambient glow: `box-shadow: 0 0 0 1px #00E599, 0 0 12px rgba(0, 229, 153, 0.2)`.
- Placeholder values use muted slate `rgba(228, 241, 235, 0.3)`.

### Checkboxes & Segmented Controls
- **Checkboxes**: 16x16px squares with 3px corner radius. Unchecked state is `#0A0B0D` with a 1px hairline border. Checked state transitions to a solid `#00E599` fill containing an obsidian micro-checkmark.
- **Segmented Analytical Switchers**: Obsidian trough (`#0A0B0D`) housing 4px radius tabs. Selected state lifts via `#18191B` background, white text, and a fine 1px `rgba(255, 255, 255, 0.12)` border.

### Data Grids & Inspector Lists
- Striped density: rows maintain a strict 36px height for analytical scans. Bottom dividers use hairline `rgba(255, 255, 255, 0.04)`.
- Hover triggers a flat background illumination of `rgba(255, 255, 255, 0.02)`. Key columns (IDs, timestamps, latencies) render in `JetBrains Mono` with status color-coding.