import GithubSlugger from "github-slugger";

export type MarkdownTocHeading = {
  level: 1 | 2 | 3;
  text: string;
  /** Matches rehype-slug / GitHub-style slug for the heading text */
  id: string;
};

/**
 * Extract h1–h3 headings from markdown source for TOC navigation.
 * Uses the same slug algorithm as rehype-slug (github-slugger) so anchor links match rendered HTML.
 */
export function extractTocHeadingsFromMarkdown(markdown: string): MarkdownTocHeading[] {
  const slugger = new GithubSlugger();
  const lines = markdown.split(/\r?\n/);
  const out: MarkdownTocHeading[] = [];
  let inFence = false;

  for (const line of lines) {
    const fence = line.trim().match(/^(`{3,}|~{3,})/);
    if (fence) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (!m) continue;
    const level = m[1].length as 1 | 2 | 3;
    const rawText = m[2].trim();
    if (!rawText) continue;
    const text = rawText
      .replace(/\[(.*?)]\([^)]*\)/g, "$1")
      .replace(/[*_`]/g, "")
      .trim();
    if (!text) continue;
    const id = slugger.slug(text);
    out.push({ level, text, id });
  }

  return out;
}

/** Build parent h2 links for h3 items (for nested TOC display). */
export function markdownTocToNavItems(
  headings: MarkdownTocHeading[]
): { id: string; text: string; level: number; parentId?: string }[] {
  let lastH2Id = "";
  return headings.map((h) => {
    if (h.level === 2) lastH2Id = h.id;
    return {
      id: h.id,
      text: h.text,
      level: h.level,
      parentId: h.level === 3 ? lastH2Id : undefined,
    };
  });
}

/**
 * Build a markdown block listing anchor links to existing h1–h3 headings.
 * Slugs match rehype-slug / GitHub-style IDs used on the public blog.
 */
export function buildAutoTocMarkdownBlock(markdown: string): string {
  const headings = extractTocHeadingsFromMarkdown(markdown);
  if (headings.length === 0) {
    return (
      "## Contents\n\n" +
      "_Add `##` or `###` headings to your draft to populate this list._\n\n"
    );
  }
  const lines = ["## Contents", ""];
  for (const h of headings) {
    const indent = h.level >= 3 ? "  " : "";
    lines.push(`${indent}- [${h.text}](#${h.id})`);
  }
  lines.push("");
  return lines.join("\n");
}
