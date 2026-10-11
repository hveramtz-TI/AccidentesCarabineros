# Data directory

Canonical data for the dashboard frontend.

## Files

- `oversio-identifiers.json` — **canonical territorial catalog** (16 regions,
  ~350 communes) with `identifier` keys like `"XIII-9"`. This file is the
  source of truth for region/commune names and must not be duplicated or
  edited elsewhere. Filter option lists and the region `romanNumber → number`
  mapping used by the API query builder read from it.

## Removed fixtures

The synthetic `dashboard-summary.example.json` and
`territorial-ranking.example.json` (and the `deriveDashboardData` join layer)
were deleted when the dashboard switched to the real `GET /api/dashboard`
backend. All dashboard values now come from the API; nothing in `src/data/`
is demo data, and there is no synthetic fallback path.
