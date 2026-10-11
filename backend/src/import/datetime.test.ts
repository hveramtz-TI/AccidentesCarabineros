import test from "node:test";
import assert from "node:assert/strict";

import {
  cellToUtcDate,
  cellToUtcTime,
  dayFractionToTimeParts,
  excelSerialToUtcDate,
  formatUtcDate,
  formatUtcTime,
} from "./datetime.js";

test("Excel serial 45658 maps to 2025-01-01 in UTC", () => {
  assert.equal(formatUtcDate(excelSerialToUtcDate(45658)), "2025-01-01");
});

test("Excel serial 46022 maps to 2025-12-31 in UTC", () => {
  assert.equal(formatUtcDate(excelSerialToUtcDate(46022)), "2025-12-31");
});

test("day fraction 0.5 becomes noon", () => {
  assert.deepEqual(dayFractionToTimeParts(0.5), {
    hours: 12,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });
});

test("a fractional day converts to a stable UTC time", () => {
  assert.equal(formatUtcTime(cellToUtcTime(0.5)), "12:00:00");
});

test("a JS Date is read through its UTC parts so the day never shifts", () => {
  const eveningInLocalTerms = new Date(Date.UTC(2025, 0, 1, 23, 30, 0));
  assert.equal(formatUtcDate(cellToUtcDate(eveningInLocalTerms)), "2025-01-01");
});
