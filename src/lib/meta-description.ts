import { stripMarkdown } from "@/lib/utils";

/**
 * Builds a plain-text meta description from Markdown for Open Graph, Twitter, and JSON-LD.
 * Does not append an ellipsis when the source is already within the limit (cleaner snippets in SERPs).
 */
export function metaDescriptionFromMarkdown(markdown: string, maxLen = 160): string {
  const plain = stripMarkdown(markdown).replace(/\s+/g, " ").trim();
  if (!plain) return "";
  if (plain.length <= maxLen) return plain;
  const cut = plain.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > maxLen * 0.5 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}\u2026`;
}
