import { stripMarkdown } from "./utils";

/**
 * Estimate reading time in minutes.
 * English: ~200-250 words/min; Chinese: ~300-400 chars/min; mixed: word count.
 */
export function calculateReadingTime(content: string): number {
  const plainText = stripMarkdown(content);
  const words = plainText
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
  
  // CJK character count (non-ASCII)
  const chineseChars = (plainText.match(/[^\x00-\x7F]/g) || []).length;
  
  // English ~200 words/min, Chinese ~300 chars/min
  const englishReadingTime = words / 200;
  const chineseReadingTime = chineseChars / 300;
  
  const totalReadingTime = englishReadingTime + chineseReadingTime;
  return Math.max(1, Math.ceil(totalReadingTime));
}

/**
 * Format reading time for display
 */
export function formatReadingTime(minutes: number): string {
  if (minutes === 1) {
    return "1 min read";
  }
  return `${minutes} min read`;
}
