import assert from "node:assert/strict";
import { test } from "node:test";

import { RowValidationError, cellToAge, cellToCount, cellToInteger } from "./cell.js";

test("cellToInteger rejects blank and whitespace-only cells", () => {
  assert.throws(() => cellToInteger(null, "ID"), RowValidationError);
  assert.throws(() => cellToInteger(undefined, "ID"), RowValidationError);
  assert.throws(() => cellToInteger("", "ID"), RowValidationError);
  assert.throws(
    () => cellToInteger("   ", "ID"),
    RowValidationError,
    "whitespace-only cells must not coerce to integer 0",
  );
});

test("cellToInteger accepts clean numeric values", () => {
  assert.equal(cellToInteger(812812, "PARTE"), 812812);
  assert.equal(cellToInteger("3063", "ID"), 3063);
  assert.equal(cellToInteger(0, "FALLECIDO"), 0);
});

test("cellToCount rejects negative or fractional values", () => {
  assert.throws(() => cellToCount(-1, "GRAVE"), RowValidationError);
  assert.throws(() => cellToCount(1.5, "LEVE"), RowValidationError);
});

test("cellToAge maps blank to null and bounds to 1..120", () => {
  assert.equal(cellToAge(""), null);
  assert.equal(cellToAge(96), 96);
  assert.throws(() => cellToAge(0), RowValidationError);
  assert.throws(() => cellToAge(121), RowValidationError);
});
