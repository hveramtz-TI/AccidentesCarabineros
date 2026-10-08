import test from "node:test";
import assert from "node:assert/strict";

import { buildCommuneAliases } from "./aliases.js";
import { resolveCommuneId } from "./commune.js";
import { normalizeLabel } from "./normalize.js";

interface MutableCatalog {
  canonicalByKey: Map<string, string>;
  aliasByKey: Map<string, string>;
}

function catalog(): MutableCatalog {
  const canonicalByKey = new Map<string, string>([
    [normalizeLabel("Aisén"), "XI-3"],
    [normalizeLabel("Coihaique"), "XI-1"],
    [normalizeLabel("Llaillay"), "V-31"],
    [normalizeLabel("Alto Biobío"), "VIII-33"],
    [normalizeLabel("O'Higgins"), "XI-7"],
    [normalizeLabel("Cabo de Hornos (Ex Navarino)"), "XII-5"],
    [normalizeLabel("San Pedro de Atacama"), "II-7"],
  ]);
  const aliasByKey = new Map(
    buildCommuneAliases().map((alias) => [alias.aliasKey, alias.comunaId]),
  );
  return { canonicalByKey, aliasByKey };
}

test("canonical standardized key wins over an alias", () => {
  const c = catalog();
  c.aliasByKey.set(normalizeLabel("Aisén"), "SHOULD_NOT_WIN");
  assert.equal(resolveCommuneId("Aisén", c), "XI-3");
});

test("explicit aliases resolve the spelling variants", () => {
  const c = catalog();
  assert.equal(resolveCommuneId("AYSEN", c), "XI-3");
  assert.equal(resolveCommuneId("CABO DE HORNOS", c), "XII-5");
  assert.equal(resolveCommuneId("COYHAIQUE", c), "XI-1");
  assert.equal(resolveCommuneId("LLAYLLAY", c), "V-31");
  assert.equal(resolveCommuneId("SAN PEDRO ATACAMA", c), "II-7");
});

test("ALTO BIO-BIO and O\"HIGGINS resolve through the normalizer alone", () => {
  const c = catalog();
  assert.equal(resolveCommuneId("ALTO BIO-BIO", c), "VIII-33");
  assert.equal(resolveCommuneId('O"HIGGINS', c), "XI-7");
});

test("deterministic alias data keeps its normalized keys", () => {
  const aliases = buildCommuneAliases();
  assert.equal(aliases.length, 5);
  assert.equal(
    aliases.find((a) => a.comunaId === "XI-3")?.aliasKey,
    normalizeLabel("AYSEN"),
  );
});

test("an unknown label is not guessed", () => {
  assert.equal(resolveCommuneId("COMUNA INEXISTENTE", catalog()), undefined);
});
