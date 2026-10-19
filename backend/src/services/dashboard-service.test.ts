import assert from "node:assert/strict";
import test from "node:test";

import { createDashboardService } from "./dashboard-service.js";

test("builds dense zero-filled sections and marks an empty filtered scope", async () => {
  const service = createDashboardService(
    {
      async resolveTerritory() {
        return {
          scopeLabel: "Región Metropolitana de Santiago",
          territoryScope: "commune" as const,
          regionId: 13,
          communeId: "XIII-1",
        };
      },
      async loadSnapshot() {
        return {
          totals: { accidents: 0, fatalities: 0, seriousInjuries: 0, lessSeriousInjuries: 0, minorInjuries: 0 },
          monthly: [],
          severity: [],
          territories: [],
          zeroAccidentCount: 0,
          causes: [],
          accidentTypes: [],
          sectors: [],
          hours: [],
          midnightArtifactCount: 0,
          vehicles: [],
          persons: { rows: 0, quality: [], sex: [], ages: [] },
        };
      },
    },
    () => new Date("2026-10-10T00:00:00.000Z"),
  );

  const result = await service.getDashboard({
    from: "2025-02-01",
    to: "2025-03-31",
    regionId: null,
    communeId: "XIII-1",
  });

  assert.equal(result.meta.emptyScope, true);
  assert.equal(result.meta.scopeLabel, "Región Metropolitana de Santiago");
  assert.deepEqual(result.monthlyTrend.map(({ month, accidents }) => [month, accidents]), [
    ["2025-02", 0],
    ["2025-03", 0],
  ]);
  assert.deepEqual(result.severity.map(({ key, accidents }) => [key, accidents]), [
    ["fatal", 0],
    ["serious", 0],
    ["minor", 0],
    ["onlyIlesos", 0],
  ]);
  assert.deepEqual(result.hourBuckets.items.map(({ hourStart, accidents }) => [hourStart, accidents]), [
    [0, 0], [3, 0], [6, 0], [9, 0], [12, 0], [15, 0], [18, 0], [21, 0],
  ]);
  assert.deepEqual(result.persons.ageBands.map(({ band, count }) => [band, count]), [
    ["0-17", 0], ["18-25", 0], ["26-40", 0], ["41-64", 0], ["65+", 0], ["unknown", 0],
  ]);
  assert.equal(result.vehicles.note, "shares no suman 100: un siniestro puede involucrar varios tipos");
});

test("uses database aggregates for KPIs and stable shares while retaining the commune scope", async () => {
  const service = createDashboardService(
    {
      async resolveTerritory() {
        return { scopeLabel: "Comuna A", territoryScope: "commune", regionId: 8, communeId: "VIII-1" };
      },
      async loadSnapshot() {
        return {
          totals: { accidents: 20, fatalities: 2, seriousInjuries: 3, lessSeriousInjuries: 4, minorInjuries: 5 },
          monthly: [{ month: "2025-03", accidents: 20, fatalities: 2, injuries: 12, seriousInjuries: 3 }],
          severity: [{ key: "fatal", accidents: 2 }, { key: "serious", accidents: 3 }],
          territories: [
            { code: "VIII-2", name: "Comuna B", accidents: 6, fatalities: 1 },
            { code: "VIII-1", name: "Comuna A", accidents: 6, fatalities: 1 },
            { code: "VIII-3", name: "Comuna C", accidents: 2, fatalities: 0 },
            { code: "VIII-4", name: "Comuna D", accidents: 0, fatalities: 0 },
          ],
          zeroAccidentCount: 4,
          causes: [
            { id: 2, name: "Cause B", accidents: 4, fatalities: 1 },
            { id: 1, name: "Cause A", accidents: 4, fatalities: 1 },
          ],
          accidentTypes: [{ id: 2, name: "Type B", count: 5 }, { id: 1, name: "Type A", count: 5 }],
          sectors: [{ id: 1, name: "URBANO", count: 15 }],
          hours: [{ hourStart: 15, accidents: 8 }],
          midnightArtifactCount: 1,
          vehicles: [{ id: 3, name: "AUTO", count: 14 }],
          persons: {
            rows: 10,
            quality: [{ id: 1, name: "CONDUCTOR", count: 7 }],
            sex: [{ id: 1, name: "MASCULINO", count: 6 }, { id: 3, name: "SE IGNORA", count: 1 }],
            ages: [{ band: "unknown", count: 2 }],
          },
        };
      },
    },
    () => new Date("2026-10-10T00:00:00.000Z"),
  );

  const result = await service.getDashboard({ from: "2025-03-01", to: "2025-03-31", regionId: 4, communeId: "VIII-1" });

  assert.deepEqual(result.meta.filters, { regionId: 8, communeId: "VIII-1" });
  assert.deepEqual(result.kpis, { accidents: 20, fatalities: 2, injuries: 12, seriousInjuries: 3 });
  assert.deepEqual(result.causes.items.map(({ id }) => id), [1, 2]);
  assert.deepEqual(result.accidentTypes.map(({ id, sharePct }) => [id, sharePct]), [[1, 25], [2, 25]]);
  assert.equal(result.sectors[0].sharePct, 75);
  assert.equal(result.hourBuckets.items[5].accidents, 8);
  assert.equal(result.hourBuckets.midnightArtifactCount, 1);
  assert.equal(result.territories.items[0].code, "VIII-1");
  assert.deepEqual(result.territories.items.map(({ code }) => code), ["VIII-1", "VIII-2", "VIII-3"]);
  assert.equal(result.territories.zeroAccidentCount, 4);
  assert.deepEqual(result.territories.all, [
    { code: "VIII-1", name: "Comuna A", accidents: 6, fatalities: 1 },
    { code: "VIII-2", name: "Comuna B", accidents: 6, fatalities: 1 },
    { code: "VIII-3", name: "Comuna C", accidents: 2, fatalities: 0 },
    { code: "VIII-4", name: "Comuna D", accidents: 0, fatalities: 0 },
  ]);
  assert.deepEqual(result.persons.ageBands.map(({ band, count }) => [band, count]), [
    ["0-17", 0], ["18-25", 0], ["26-40", 0], ["41-64", 0], ["65+", 0], ["unknown", 2],
  ]);
});
