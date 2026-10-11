import { normalizeLabel } from "./normalize.js";

export interface CommuneResolverCatalog {
  /** normalized canonical commune name -> comuna_id */
  canonicalByKey: ReadonlyMap<string, string>;
  /** normalized explicit alias -> comuna_id */
  aliasByKey: ReadonlyMap<string, string>;
}

/**
 * Resolve a source commune label to a canonical `comuna_id`.
 *
 * Canonical standardized keys win; explicit aliases are consulted only after
 * the canonical lookup misses. An unknown label returns `undefined` so the
 * caller records a row error instead of guessing.
 */
export function resolveCommuneId(
  label: string,
  catalog: CommuneResolverCatalog,
): string | undefined {
  const key = normalizeLabel(label);
  return catalog.canonicalByKey.get(key) ?? catalog.aliasByKey.get(key);
}
