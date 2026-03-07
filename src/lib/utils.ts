import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Strip Markdown syntax from content, leaving only plain text
 */
export function stripMarkdown(content: string): string {
  let text = content;

  // Keep code block content so snippet order matches DOM order (for search scroll)
  text = text.replace(/```[\s\S]*?```/g, (block) =>
    block.replace(/^```\w*\n?|\n?```$/g, "").trim()
  );

  // Keep inline code text for search/snippet (replace backticks only)
  text = text.replace(/`([^`]*)`/g, "$1");

  // Remove images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\([^\)]*\)/g, "");

  // Remove links [text](url) but keep the text
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

  // Remove headers (# Header)
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Remove bold (**text** or __text__)
  text = text.replace(/\*\*([^\*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");

  // Remove italic (*text* or _text_)
  text = text.replace(/\*([^\*]+)\*/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");

  // Remove strikethrough (~~text~~)
  text = text.replace(/~~([^~]+)~~/g, "$1");

  // Remove blockquotes (> Quote)
  text = text.replace(/^>\s+/gm, "");

  // Remove horizontal rules (--- or ***)
  text = text.replace(/^[-*]{3,}$/gm, "");

  // Remove list markers (-, *, +, 1.)
  text = text.replace(/^[\s]*[-*+]\s+/gm, "");
  text = text.replace(/^[\s]*\d+\.\s+/gm, "");

  // Remove extra whitespace and newlines
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Slug format: lowercase, letters, numbers, hyphens only. No spaces or underscores. */
export function validateSlug(slug: string): { valid: boolean; message?: string } {
  const t = slug.trim();
  if (!t) return { valid: false, message: "Slug is required" };
  if (!SLUG_PATTERN.test(t)) {
    return { valid: false, message: "Use only lowercase letters, numbers, and hyphens (e.g. my-post-1)" };
  }
  return { valid: true };
}

/** Normalize slug for storage: lowercase, replace spaces/special chars with hyphens. */
export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");
}
