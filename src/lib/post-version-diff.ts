import type { DiffResult } from "@/lib/markdown-diff";

type DiffInput = {
  title: string;
  slug: string;
  published: boolean;
  content: string;
};

export type PostDiffSemanticHint = {
  key: "headings" | "links" | "images" | "codeBlocks" | "lists" | "quotes";
  label: string;
  count: number;
};

export type PostVersionDiff = {
  meta: {
    titleChanged: boolean;
    slugChanged: boolean;
    publishedChanged: boolean;
  };
  content: {
    totalLines: number;
    changedLines: number;
    rows: Array<{
      index: number;
      current: string;
      selected: string;
      changed: boolean;
    }>;
  };
};

/**
 * Produces a lightweight line-by-line diff summary between current post state and a selected version.
 */
export function buildPostVersionDiff(current: DiffInput, selected: DiffInput): PostVersionDiff {
  const currentLines = current.content.split("\n");
  const selectedLines = selected.content.split("\n");
  const total = Math.max(currentLines.length, selectedLines.length);
  const rows: PostVersionDiff["content"]["rows"] = [];
  let changedLines = 0;

  for (let i = 0; i < total; i += 1) {
    const currentLine = currentLines[i] ?? "";
    const selectedLine = selectedLines[i] ?? "";
    const changed = currentLine !== selectedLine;
    if (changed) changedLines += 1;
    rows.push({
      index: i + 1,
      current: currentLine,
      selected: selectedLine,
      changed,
    });
  }

  return {
    meta: {
      titleChanged: current.title !== selected.title,
      slugChanged: current.slug !== selected.slug,
      publishedChanged: current.published !== selected.published,
    },
    content: {
      totalLines: total,
      changedLines,
      rows,
    },
  };
}

const HINT_LABELS: Record<PostDiffSemanticHint["key"], string> = {
  headings: "Headings",
  links: "Links",
  images: "Images",
  codeBlocks: "Code blocks",
  lists: "Lists",
  quotes: "Quotes",
};

function classifyMarkdownLineKind(line: string): PostDiffSemanticHint["key"] | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (/^#{1,6}\s+/.test(trimmed)) return "headings";
  if (/!\[[^\]]*]\([^)]+\)/.test(trimmed)) return "images";
  if (/\[[^\]]+\]\([^)]+\)/.test(trimmed)) return "links";
  if (/^```/.test(trimmed) || /^`[^`]+`$/.test(trimmed)) return "codeBlocks";
  if (/^[-*+]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) return "lists";
  if (/^>\s+/.test(trimmed)) return "quotes";
  return null;
}

/**
 * Builds semantic hints from changed markdown lines so editors can quickly identify
 * what kind of structural changes occurred between revisions.
 */
export function buildPostDiffSemanticHints(diff: DiffResult): PostDiffSemanticHint[] {
  const counts: Record<PostDiffSemanticHint["key"], number> = {
    headings: 0,
    links: 0,
    images: 0,
    codeBlocks: 0,
    lists: 0,
    quotes: 0,
  };

  for (const line of diff.lines) {
    if (line.kind === "equal") continue;
    const key = classifyMarkdownLineKind(line.text);
    if (!key) continue;
    counts[key] += 1;
  }

  return (Object.keys(counts) as Array<PostDiffSemanticHint["key"]>)
    .map((key) => ({ key, label: HINT_LABELS[key], count: counts[key] }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
