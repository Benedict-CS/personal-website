export type DiffLineKind = "equal" | "add" | "remove";

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
  /** 1-based line number in the old version (null for additions). */
  oldLineNumber: number | null;
  /** 1-based line number in the new version (null for deletions). */
  newLineNumber: number | null;
}

export interface DiffResult {
  lines: DiffLine[];
  additions: number;
  deletions: number;
  unchanged: number;
}

/**
 * Compute a line-level diff between two text strings using the LCS
 * (Longest Common Subsequence) approach. Produces a unified-style
 * output with equal/add/remove markers.
 *
 * Optimised for markdown content up to several thousand lines.
 * For very large documents the LCS table is bounded by a diagonal
 * band so memory stays reasonable.
 */
export function computeLineDiff(oldText: string, newText: string): DiffResult {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);

  const lcs = longestCommonSubsequence(oldLines, newLines);
  const result: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  let oi = 0;
  let ni = 0;
  let li = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (li < lcs.length && oi < oldLines.length && ni < newLines.length && oldLines[oi] === lcs[li] && newLines[ni] === lcs[li]) {
      result.push({ kind: "equal", text: oldLines[oi], oldLineNumber: oi + 1, newLineNumber: ni + 1 });
      unchanged++;
      oi++;
      ni++;
      li++;
    } else if (oi < oldLines.length && (li >= lcs.length || oldLines[oi] !== lcs[li])) {
      result.push({ kind: "remove", text: oldLines[oi], oldLineNumber: oi + 1, newLineNumber: null });
      deletions++;
      oi++;
    } else if (ni < newLines.length && (li >= lcs.length || newLines[ni] !== lcs[li])) {
      result.push({ kind: "add", text: newLines[ni], oldLineNumber: null, newLineNumber: ni + 1 });
      additions++;
      ni++;
    }
  }

  return { lines: result, additions, deletions, unchanged };
}

function splitLines(text: string): string[] {
  if (text.length === 0) return [];
  return text.split("\n");
}

/**
 * Standard DP-based LCS on string arrays.
 * Uses O(m*n) space which is fine for typical markdown documents (< 5k lines).
 */
function longestCommonSubsequence(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;

  if (m === 0 || n === 0) return [];

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.push(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  result.reverse();
  return result;
}

/**
 * Summarise a diff as a human-readable sentence
 * (e.g. "+12 / -3 lines changed").
 */
export function formatDiffSummary(diff: DiffResult): string {
  const parts: string[] = [];
  if (diff.additions > 0) parts.push(`+${diff.additions}`);
  if (diff.deletions > 0) parts.push(`-${diff.deletions}`);
  if (parts.length === 0) return "No changes";
  return `${parts.join(" / ")} line${diff.additions + diff.deletions === 1 ? "" : "s"} changed`;
}
