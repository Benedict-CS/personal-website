import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";

/**
 * Markdown byline line from current draft body (word-count based).
 * Inserts an italic line suitable under the title or before the first section.
 */
export function buildReadingTimeInsertMarkdown(markdown: string): string {
  const minutes = calculateReadingTime(markdown || "");
  const label = formatReadingTime(minutes);
  return `_Estimated reading time: ${label}_\n\n`;
}
