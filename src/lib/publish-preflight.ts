/**
 * Publishing preflight checklist engine.
 *
 * Runs a battery of content-quality and metadata-completeness checks
 * on a post before publishing, returning a structured checklist with
 * pass / warn / fail status for each item and an overall readiness
 * verdict.
 *
 * Pure functions — no DB or network — deterministic and testable.
 */

export type CheckStatus = "pass" | "warn" | "fail";

export interface PreflightCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export type PreflightVerdict = "ready" | "review" | "blocked";

export interface PreflightResult {
  verdict: PreflightVerdict;
  checks: PreflightCheck[];
  passCount: number;
  warnCount: number;
  failCount: number;
}

export interface PreflightInput {
  title: string;
  slug: string;
  description: string;
  content: string;
  tags: string;
}

function countWordsSimple(text: string): number {
  const stripped = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/[#*_~>|]/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).filter(Boolean).length;
}

function checkTitle(title: string): PreflightCheck {
  const len = title.trim().length;
  if (len === 0) return { id: "title", label: "Title", status: "fail", detail: "Title is empty." };
  if (len < 10) return { id: "title", label: "Title", status: "warn", detail: `Title is very short (${len} chars). Aim for 30-60 characters.` };
  if (len > 80) return { id: "title", label: "Title", status: "warn", detail: `Title is long (${len} chars). May get truncated in search results.` };
  return { id: "title", label: "Title", status: "pass", detail: `Title length is good (${len} chars).` };
}

function checkSlug(slug: string): PreflightCheck {
  const s = slug.trim();
  if (!s) return { id: "slug", label: "URL slug", status: "fail", detail: "Slug is empty. A clean URL is required for publishing." };
  if (/[A-Z]/.test(s)) return { id: "slug", label: "URL slug", status: "warn", detail: "Slug contains uppercase letters. Lowercase slugs are preferred." };
  if (/[^a-z0-9-]/.test(s)) return { id: "slug", label: "URL slug", status: "warn", detail: "Slug contains special characters. Use only lowercase letters, numbers, and hyphens." };
  const words = s.split("-").filter(Boolean);
  if (words.length > 8) return { id: "slug", label: "URL slug", status: "warn", detail: `Slug is long (${words.length} segments). Shorter slugs are better for SEO.` };
  return { id: "slug", label: "URL slug", status: "pass", detail: "Slug is clean and URL-friendly." };
}

function checkDescription(description: string): PreflightCheck {
  const len = description.trim().length;
  if (len === 0) return { id: "description", label: "Meta description", status: "warn", detail: "No description set. Search engines will auto-generate one, but a custom description performs better." };
  if (len < 50) return { id: "description", label: "Meta description", status: "warn", detail: `Description is short (${len} chars). Aim for 120-160 characters.` };
  if (len > 170) return { id: "description", label: "Meta description", status: "warn", detail: `Description is long (${len} chars). May be truncated in search results.` };
  return { id: "description", label: "Meta description", status: "pass", detail: `Description length is good (${len} chars).` };
}

function checkContentLength(content: string): PreflightCheck {
  const words = countWordsSimple(content);
  if (words === 0) return { id: "content_length", label: "Content body", status: "fail", detail: "Post has no content." };
  if (words < 50) return { id: "content_length", label: "Content body", status: "fail", detail: `Only ${words} words. Posts need at least 50 words to be meaningful.` };
  if (words < 200) return { id: "content_length", label: "Content body", status: "warn", detail: `${words} words is thin content. Aim for 300+ for better engagement and SEO.` };
  return { id: "content_length", label: "Content body", status: "pass", detail: `${words} words — good content depth.` };
}

function checkTags(tags: string): PreflightCheck {
  const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
  if (tagList.length === 0) return { id: "tags", label: "Tags", status: "warn", detail: "No tags assigned. Tags improve discoverability and navigation." };
  if (tagList.length > 10) return { id: "tags", label: "Tags", status: "warn", detail: `${tagList.length} tags may be excessive. 3-7 tags is optimal.` };
  return { id: "tags", label: "Tags", status: "pass", detail: `${tagList.length} tag${tagList.length === 1 ? "" : "s"} assigned.` };
}

function checkHeadings(content: string): PreflightCheck {
  const words = countWordsSimple(content);
  const headings = (content.match(/^#{1,6}\s+/gm) || []).length;
  if (words < 200) return { id: "headings", label: "Structure", status: "pass", detail: "Short post — headings not required." };
  if (headings === 0) return { id: "headings", label: "Structure", status: "warn", detail: "No headings in a long post. Add headings to improve readability and navigation." };
  return { id: "headings", label: "Structure", status: "pass", detail: `${headings} heading${headings === 1 ? "" : "s"} for good document structure.` };
}

function checkImages(content: string): PreflightCheck {
  const images = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const words = countWordsSimple(content);
  if (words < 300) return { id: "images", label: "Visual content", status: "pass", detail: "Short post — images optional." };
  if (images === 0) return { id: "images", label: "Visual content", status: "warn", detail: "No images in a long post. Visual content improves engagement." };
  return { id: "images", label: "Visual content", status: "pass", detail: `${images} image${images === 1 ? "" : "s"} included.` };
}

function checkLinks(content: string): PreflightCheck {
  const links = (content.match(/(?<!!)\[.*?\]\(.*?\)/g) || []).length;
  const words = countWordsSimple(content);
  if (words < 300) return { id: "links", label: "Internal/external links", status: "pass", detail: "Short post — links optional." };
  if (links === 0) return { id: "links", label: "Internal/external links", status: "warn", detail: "No links in a long post. Links add authority and context." };
  return { id: "links", label: "Internal/external links", status: "pass", detail: `${links} link${links === 1 ? "" : "s"} included.` };
}

function deriveVerdict(checks: PreflightCheck[]): PreflightVerdict {
  const hasFail = checks.some((c) => c.status === "fail");
  const hasWarn = checks.some((c) => c.status === "warn");
  if (hasFail) return "blocked";
  if (hasWarn) return "review";
  return "ready";
}

/**
 * Run all preflight checks and return a structured result.
 */
export function runPreflightChecks(input: PreflightInput): PreflightResult {
  const checks: PreflightCheck[] = [
    checkTitle(input.title),
    checkSlug(input.slug),
    checkDescription(input.description),
    checkContentLength(input.content),
    checkTags(input.tags),
    checkHeadings(input.content),
    checkImages(input.content),
    checkLinks(input.content),
  ];

  const passCount = checks.filter((c) => c.status === "pass").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const failCount = checks.filter((c) => c.status === "fail").length;

  return {
    verdict: deriveVerdict(checks),
    checks,
    passCount,
    warnCount,
    failCount,
  };
}

/**
 * Human-readable verdict label.
 */
export function verdictLabel(verdict: PreflightVerdict): string {
  switch (verdict) {
    case "ready": return "Ready to publish";
    case "review": return "Review recommended";
    case "blocked": return "Issues must be fixed";
  }
}
