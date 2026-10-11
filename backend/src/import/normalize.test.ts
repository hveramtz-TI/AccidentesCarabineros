import test from "node:test";
import assert from "node:assert/strict";

import { normalizeLabel } from "./normalize.js";

test("strips accents, spaces and punctuation then uppercases", () => {
  assert.equal(
    normalizeLabel("Región Metropolitana de Santiago"),
    "REGIONMETROPOLITANADESANTIAGO",
  );
});

test("ordinary commune names normalize to a compact key", () => {
  assert.equal(normalizeLabel("  Alto Biobío "), "ALTOBIOBIO");
  assert.equal(normalizeLabel("ALTO BIO-BIO"), "ALTOBIOBIO");
});

test("resolves O'Higgins written with a quote character", () => {
  assert.equal(normalizeLabel('O"HIGGINS'), "OHIGGINS");
  assert.equal(normalizeLabel("O'Higgins"), "OHIGGINS");
});

test("keeps digits while dropping remaining punctuation", () => {
  assert.equal(normalizeLabel("Ruta 5 (Norte)"), "RUTA5NORTE");
});
