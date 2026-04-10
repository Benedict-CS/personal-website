/**
 * Post outline analyzer.
 *
 * Extracts heading hierarchy from markdown, computes per-section word counts,
 * and flags structural issues — giving authors a bird's-eye view of their
 * document structure with actionable warnings.
 *
 * Pure functions — no DB or network — deterministic and testable.
 */

export interface OutlineHeading {
  level: number;
  text: string;
  /** Approximate line number (0-based) in the original markdown. */
  line: number;
  /** Word count of the section below this heading (up to the next heading at same or higher level). */
  wordCount: number;
}

export type OutlineIssueType =
  | "skipped_level"
  | "multiple_h1"
  | "no_headings"
  | "long_section"
  | "short_section"
  | "deep_nesting";

export interface OutlineIssue {
  type: OutlineIssueType;
  message: string;
  /** Line number of the heading that triggered the issue, or -1 for document-level issues. */
  line: number;
}

export interface OutlineAnalysis {
  headings: OutlineHeading[];
  issues: OutlineIssue[];
  totalSections: number;
  maxDepth: number;
  documentWordCount: number;
}

const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const LONG_SECTION_THRESHOLD = 800;
const SHORT_SECTION_THRESHOLD = 30;

function stripMarkdownForWordCount(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/[#*_~>|]/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function countWords(text: string): number {
  const stripped = stripMarkdownForWordCount(text);
  if (!stripped) return 0;
  return stripped.split(/\s+/).filter(Boolean).length;
}

/**
 * Extract headings from markdown with their line positions and section word counts.
 */
export function extractOutline(markdown: string): OutlineHeading[] {
  const lines = markdown.split("\n");
  const headings: { level: number; text: string; line: number; sectionStart: number }[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = trimmed.match(HEADING_RE);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        line: i,
        sectionStart: i + 1,
      });
    }
  }

  return headings.map((h, idx) => {
    const nextHeadingLine = idx < headings.length - 1 ? headings[idx + 1].line : lines.length;
    const sectionLines = lines.slice(h.sectionStart, nextHeadingLine);
    const wordCount = countWords(sectionLines.join("\n"));
    return {
      level: h.level,
      text: h.text,
      line: h.line,
      wordCount,
    };
  });
}

/**
 * Analyze outline for structural issues.
 */
export function findOutlineIssues(
  headings: OutlineHeading[],
  documentWordCount: number
): OutlineIssue[] {
  const issues: OutlineIssue[] = [];

  if (headings.length === 0 && documentWordCount > 200) {
    issues.push({
      type: "no_headings",
      message: "No headings found in a long post. Add headings to improve structure and navigation.",
      line: -1,
    });
    return issues;
  }

  const h1s = headings.filter((h) => h.level === 1);
  if (h1s.length > 1) {
    issues.push({
      type: "multiple_h1",
      message: `${h1s.length} H1 headings found. Use only one H1 per post (the title); use H2+ for sections.`,
      line: h1s[1].line,
    });
  }

  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1];
    const curr = headings[i];
    if (curr.level > prev.level + 1) {
      issues.push({
        type: "skipped_level",
        message: `Heading "${curr.text}" jumps from H${prev.level} to H${curr.level}. Avoid skipping levels (e.g., H2 → H4).`,
        line: curr.line,
      });
    }
  }

  const maxDepth = headings.reduce((max, h) => Math.max(max, h.level), 0);
  if (maxDepth >= 5) {
    const deepest = headings.find((h) => h.level >= 5);
    issues.push({
      type: "deep_nesting",
      message: `Heading depth reaches H${maxDepth}. Consider flattening — most readers lose context beyond H3.`,
      line: deepest?.line ?? -1,
    });
  }

  for (const h of headings) {
    if (h.wordCount > LONG_SECTION_THRESHOLD) {
      issues.push({
        type: "long_section",
        message: `"${h.text}" has ${h.wordCount} words. Consider splitting into subsections for readability.`,
        line: h.line,
      });
    }
    if (h.wordCount < SHORT_SECTION_THRESHOLD && h.wordCount > 0) {
      issues.push({
        type: "short_section",
        message: `"${h.text}" has only ${h.wordCount} words. Consider expanding or merging with an adjacent section.`,
        line: h.line,
      });
    }
  }

  return issues;
}

/**
 * Full outline analysis: headings, issues, and summary metrics.
 */
export function analyzeOutline(markdown: string): OutlineAnalysis {
  const headings = extractOutline(markdown);
  const documentWordCount = countWords(markdown);
  const issues = findOutlineIssues(headings, documentWordCount);
  const maxDepth = headings.reduce((max, h) => Math.max(max, h.level), 0);

  return {
    headings,
    issues,
    totalSections: headings.length,
    maxDepth,
    documentWordCount,
  };
}
