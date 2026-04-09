/** Line count using LF splits; empty string yields 0 lines. */
export function countSourceLines(source: string): number {
  return source.length === 0 ? 0 : source.split("\n").length;
}

/**
 * Word count: trim, then split on whitespace runs.
 * Empty or whitespace-only source yields 0.
 */
export function countSourceWords(source: string): number {
  const t = source.trim();
  if (t.length === 0) return 0;
  return t.split(/\s+/).length;
}

/** UTF-8 encoded length (bytes); can differ from `source.length` for non-BMP scalars. */
export function countSourceUtf8Bytes(source: string): number {
  return new TextEncoder().encode(source).length;
}

/**
 * User-perceived character count (Unicode grapheme clusters).
 * Uses `Intl.Segmenter` when available; otherwise falls back to spreading the string (code points, not full clusters).
 */
export function countSourceGraphemeClusters(source: string): number {
  if (source.length === 0) return 0;
  if (typeof Intl.Segmenter !== "undefined") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(source)).length;
  }
  return [...source].length;
}
