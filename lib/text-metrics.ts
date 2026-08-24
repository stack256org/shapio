// Shared character/word counting for every field with a character or word
// limit (post/comment/board/category/changelog/etc. descriptions). A raw
// `value.length` counts leading/trailing whitespace, runs of repeated spaces,
// and newline/tab padding as if they were real content, so a user can hit a
// "500 character" limit by holding down the spacebar without writing
// anything meaningful — and the raw string that gets saved can differ from
// what the live counter showed. Collapsing whitespace the same way here,
// once, keeps the displayed counter and the submit-time validation exactly
// in sync everywhere this is used.
function normalizeForCounting(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Character count that ignores leading/trailing whitespace and treats any
 * run of whitespace (spaces, tabs, newlines) as a single space. */
export function countCharacters(value: string): number {
  return normalizeForCounting(value).length;
}

/** Word count that ignores leading/trailing whitespace and treats any run
 * of whitespace as a single separator, so "a   b" and "a b" both count as
 * two words and whitespace-only input counts as zero. */
export function countWords(value: string): number {
  const normalized = normalizeForCounting(value);
  return normalized === "" ? 0 : normalized.split(" ").length;
}
