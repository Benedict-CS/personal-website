import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";
import { stripMarkdown } from "@/lib/utils";

export type ContentMetrics = {
  words: number;
  readingMinutes: number;
  readingLabel: string;
};

/**
 * Shared content metrics used across editor and public list surfaces.
 */
export function getContentMetrics(markdown: string): ContentMetrics {
  const plain = stripMarkdown(markdown).trim();
  const words = plain.length > 0 ? plain.split(/\s+/).filter(Boolean).length : 0;
  const readingMinutes = calculateReadingTime(markdown);
  return {
    words,
    readingMinutes,
    readingLabel: formatReadingTime(readingMinutes),
  };
}
