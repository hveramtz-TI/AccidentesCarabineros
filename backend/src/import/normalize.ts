/**
 * Canonical standardization key (MER.md section 2).
 *
 * Apply the exact same function to source labels and catalog labels:
 * trim -> Unicode NFKD -> drop combining marks -> uppercase -> keep [A-Z0-9].
 */
export function normalizeLabel(input: string): string {
  return input
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
