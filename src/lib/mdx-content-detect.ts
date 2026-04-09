/**
 * Detect when post body should be compiled as MDX instead of plain Markdown.
 * Plain Markdown and HTML posts stay on the existing react-markdown path.
 */

/** Whitelisted interactive embeds (must match components registered for MDX). */
const MDX_EMBED_PATTERN =
  /<(CodePlayground|AbTestStats|TechStackGrid)(\s|\/|\s*\/>|>)/;

function hasMdxFrontmatter(content: string): boolean {
  const t = content.trimStart();
  if (!t.startsWith("---")) return false;
  const end = t.indexOf("\n---", 3);
  if (end === -1) return false;
  const fm = t.slice(0, end);
  return /\bformat:\s*mdx\b/.test(fm);
}

export function shouldRenderAsMdx(content: string): boolean {
  if (hasMdxFrontmatter(content)) return true;
  return MDX_EMBED_PATTERN.test(content);
}
