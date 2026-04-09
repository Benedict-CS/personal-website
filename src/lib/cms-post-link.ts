/**
 * Markdown link to the public blog post path for the current slug (relative URL).
 */
export function buildBlogPostLinkMarkdown(slug: string): string {
  const s = slug.trim().replace(/^\/+|\/+$/g, "");
  if (!s) return "";
  const path = `/blog/${encodeURIComponent(s)}`;
  return `[Read on site →](${path})\n\n`;
}
