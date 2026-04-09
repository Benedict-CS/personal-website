/**
 * Literal find/replace helpers for post body content (Markdown / MDX).
 * Used by the CMS bulk content operations API — not a full AST transform.
 */

export function countOccurrences(haystack: string, needle: string, matchCase: boolean): number {
  if (!needle) return 0;
  const h = matchCase ? haystack : haystack.toLowerCase();
  const n = matchCase ? needle : needle.toLowerCase();
  let count = 0;
  let pos = 0;
  while (true) {
    const i = h.indexOf(n, pos);
    if (i === -1) break;
    count++;
    pos = i + n.length;
  }
  return count;
}

/** Replace every occurrence; when matchCase is false, matches are found case-insensitively but replaced with `replacement` verbatim. */
export function replaceAllInString(source: string, find: string, replacement: string, matchCase: boolean): string {
  if (!find) return source;
  if (matchCase) {
    return source.split(find).join(replacement);
  }
  const lowerSource = source.toLowerCase();
  const lowerFind = find.toLowerCase();
  const out: string[] = [];
  let start = 0;
  while (true) {
    const i = lowerSource.indexOf(lowerFind, start);
    if (i === -1) {
      out.push(source.slice(start));
      break;
    }
    out.push(source.slice(start, i), replacement);
    start = i + find.length;
  }
  return out.join("");
}

export function snippetAround(content: string, index: number, findLen: number, radius = 56): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(content.length, index + findLen + radius);
  let s = content.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) s = "…" + s;
  if (end < content.length) s = s + "…";
  return s;
}
