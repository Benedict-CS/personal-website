/**
 * CMS helper: normalize whitespace in Markdown drafts without changing semantics of fenced blocks.
 * - Trims trailing spaces on each line
 * - Collapses 3+ consecutive blank lines to exactly 2 newlines (one blank line)
 * - Trims leading/trailing whitespace on the full document
 */
export function normalizeMarkdownWhitespace(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const trimmedLines = lines.map((line) => line.replace(/[ \t]+$/u, ""));
  const withCollapsedBlanks = trimmedLines.join("\n").replace(/(?:\n{3,})/g, "\n\n");
  return withCollapsedBlanks.trim();
}
