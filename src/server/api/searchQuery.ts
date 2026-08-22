/**
 * Helpers for Postgres full-text + fuzzy (pg_trgm) search.
 * No external fuzzy library — Postgres handles prefix FTS and trigram similarity.
 */

/** Minimum query length before applying trigram typo matching (avoids noisy short matches). */
export const FUZZY_MIN_QUERY_LENGTH = 4;

/**
 * word_similarity() threshold for typo tolerance.
 * Tuned so "minecaft"≈"Minecraft" (~0.58) and "greenday"≈"Green Day" (~0.58) match,
 * while weak single-token overlaps (e.g. "day" in unrelated titles) stay out.
 */
export const WORD_SIMILARITY_THRESHOLD = 0.5;

/**
 * Build a prefix tsquery string for Postgres `to_tsquery('english', ...)`.
 * e.g. "minecr song" → "minecr:* & song:*" so partial tokens match full lexemes.
 * Returns null when the query has no usable alphanumeric tokens.
 */
export function buildPrefixTsQuery(rawQuery: string): string | null {
  const tokens = rawQuery
    .trim()
    .toLowerCase()
    // Strip characters that are special in tsquery / not useful for lexemes
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return null;
  }

  return tokens.map((token) => `${token}:*`).join(" & ");
}
