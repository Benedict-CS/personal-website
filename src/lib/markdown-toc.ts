import GithubSlugger from "github-slugger";

export type MarkdownTocHeading = {
  level: 1 | 2 | 3;
  text: string;
  /** Matches rehype-slug / GitHub-style slug for the heading text */
  id: string;
};

export type MarkdownTocEstimate = {
  id: string;
  words: number;
  readingMinutes: number;
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

/**
 * Estimate words and reading minutes per heading section (h1–h3).
 * A section spans from one heading line to the next heading line.
 */
export function estimateTocReadingByHeading(markdown: string): MarkdownTocEstimate[] {
  const slugger = new GithubSlugger();
  const lines = markdown.split(/\r?\n/);
  const headingRows: Array<{ id: string; line: number }> = [];
  let inFence = false;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const fence = line.trim().match(/^(`{3,}|~{3,})/);
    if (fence) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (!m) continue;
    const text = m[2]
      .trim()
      .replace(/\[(.*?)]\([^)]*\)/g, "$1")
      .replace(/[*_`]/g, "")
      .trim();
    if (!text) continue;
    headingRows.push({ id: slugger.slug(text), line: idx });
  }

  if (headingRows.length === 0) return [];

  const estimates: MarkdownTocEstimate[] = [];
  for (let i = 0; i < headingRows.length; i++) {
    const start = headingRows[i].line + 1;
    const end = i + 1 < headingRows.length ? headingRows[i + 1].line : lines.length;
    const sectionRaw = lines.slice(start, end).join("\n");
    const plain = sectionRaw
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`]*`/g, " ")
      .replace(/!\[.*?\]\(.*?\)/g, " ")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_~>#-]/g, " ");
    const words = plain
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean).length;
    const readingMinutes = Math.max(1, Math.ceil(words / 220));
    estimates.push({
      id: headingRows[i].id,
      words,
      readingMinutes,
    });
  }

  return estimates;
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
