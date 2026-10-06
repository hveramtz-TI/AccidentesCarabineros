# Data directory

Canonical and fixture data for the dashboard frontend.

## Files

- `oversio-identifiers.json` — **canonical territorial catalog** (16 regions,
  ~350 communes) with `identifier` keys like `"XIII-9"`. This file is the
  source of truth for region/commune names and must not be duplicated or
  edited elsewhere.
- `dashboard-summary.example.json` — **synthetic** national aggregates:
  KPIs, 12-month trend (generic `Jan`–`Dec` labels — no real year is claimed)
  and a severity distribution. `source: "example-synthetic"`, `synthetic: true`.
- `territorial-ranking.example.json` — **synthetic** per-commune rows keyed by
  identifiers that exist in `oversio-identifiers.json` (e.g. `XIII-9` La
  Florida, `VII-1` Talca, `X-20` Osorno). Coverage is deliberately partial: a
  region with no fixture rows yields zeros when filtered.

## Invariants (validated when generated)

- `fatal + serious + minor + property == accidents` per row; `fatal ==
  fatalities` and `serious + minor == injuries`.
- Summary KPIs equal the column sums of `monthlyTrend`; severity buckets sum
  to `kpis.accidents`.

These are demo values only. **Do not present them as official statistics.**
Real data will arrive later from the backend; loaders in `src/lib/data.ts`
are the single join point and will switch sources without touching
components.
