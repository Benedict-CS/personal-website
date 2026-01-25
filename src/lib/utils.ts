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

  // Remove code blocks (```code```)
  text = text.replace(/```[\s\S]*?```/g, "");

  // Remove inline code (`code`)
  text = text.replace(/`[^`]*`/g, "");

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
