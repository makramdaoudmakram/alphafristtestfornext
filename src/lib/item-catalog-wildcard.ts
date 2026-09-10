/**
 * PurchDetail wildcard conversion: two consecutive spaces become '%'.
 * Does not trim — leading/trailing double spaces are wildcard markers.
 *
 * "AB"              → "AB"
 * "AB  CD"          → "AB%CD"
 * "  AB"            → "%AB"
 * "AB  "            → "AB%"
 * "  AB  CD  EF"    → "%AB%CD%EF"
 */
export function doubleSpacesToLikePattern(search: string): string {
  return search.replace(/ {2,}/g, "%");
}

export function hasSearchableCatalogQuery(search: string): boolean {
  return doubleSpacesToLikePattern(search).replace(/%/g, "").trim().length > 0;
}

export function likePatternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/%/g, ".*")}$`, "i");
}
