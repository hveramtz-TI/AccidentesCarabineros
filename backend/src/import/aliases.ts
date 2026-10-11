import { normalizeLabel } from "./normalize.js";

export interface CommuneAliasSource {
  /** The raw commune label exactly as it appears in the source workbooks. */
  readonly source: string;
  readonly comunaId: string;
}

export interface CommuneAliasSeed {
  /** Normalized comparison key stored as `comuna_alias.nombre_estandarizado_alias`. */
  aliasKey: string;
  comunaId: string;
  /** Original source wording, kept for audit. */
  nombreOrigen: string;
}

/**
 * Explicit commune aliases for spelling/wording differences the normalizer
 * cannot bridge (MER.md section 2). `ALTO BIO-BIO` and `O"HIGGINS` are
 * intentionally absent: the normalizer already resolves them.
 */
export const COMMUNE_ALIAS_SOURCES: readonly CommuneAliasSource[] = [
  { source: "AYSEN", comunaId: "XI-3" },
  { source: "CABO DE HORNOS", comunaId: "XII-5" },
  { source: "COYHAIQUE", comunaId: "XI-1" },
  { source: "LLAYLLAY", comunaId: "V-31" },
  { source: "SAN PEDRO ATACAMA", comunaId: "II-7" },
];

export function buildCommuneAliases(): CommuneAliasSeed[] {
  return COMMUNE_ALIAS_SOURCES.map(({ source, comunaId }) => ({
    aliasKey: normalizeLabel(source),
    comunaId,
    nombreOrigen: source,
  }));
}
