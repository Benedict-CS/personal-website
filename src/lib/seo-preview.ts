/**
 * SEO analysis and Google SERP preview engine for blog posts.
 *
 * Evaluates title, description, slug, and content against search engine
 * best practices and returns a composite score with a visual preview
 * model that mimics how the post would appear in Google search results.
 */

export interface SerpPreview {
  /** Display title, truncated at ~60 chars with ellipsis like Google. */
  title: string;
  /** Breadcrumb-style URL as shown in Google results. */
  url: string;
  /** Description snippet, truncated at ~160 chars like Google. */
  description: string;
}

export interface SeoSignal {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  detail: string;
}

export type SeoGrade = "Excellent" | "Good" | "Fair" | "Needs work";

export interface SeoAnalysis {
  score: number;
  grade: SeoGrade;
  signals: SeoSignal[];
  serp: SerpPreview;
}

const TITLE_MIN = 30;
const TITLE_OPTIMAL_MIN = 50;
const TITLE_OPTIMAL_MAX = 60;
const TITLE_MAX = 70;

const DESC_MIN = 50;
const DESC_OPTIMAL_MIN = 120;
const DESC_OPTIMAL_MAX = 160;

const SLUG_MAX_WORDS = 8;

function truncateForSerp(text: string, max: number): string {
  if (!text) return "";
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.4 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}\u2026`;
}

function scoreTitle(title: string): SeoSignal {
  const len = title.trim().length;
  let score = 0;
  let detail: string;

  if (len === 0) {
    detail = "Title is empty. Add a descriptive title.";
  } else if (len < TITLE_MIN) {
    score = 5;
    detail = `Title is short (${len} chars). Aim for ${TITLE_OPTIMAL_MIN}\u2013${TITLE_OPTIMAL_MAX} characters.`;
  } else if (len >= TITLE_OPTIMAL_MIN && len <= TITLE_OPTIMAL_MAX) {
    score = 25;
    detail = `Title length is ideal (${len} chars).`;
  } else if (len > TITLE_OPTIMAL_MAX && len <= TITLE_MAX) {
    score = 18;
    detail = `Title is slightly long (${len} chars). May be truncated in some SERPs.`;
  } else if (len > TITLE_MAX) {
    score = 10;
    detail = `Title will be truncated in Google (${len} chars). Keep under ${TITLE_OPTIMAL_MAX}.`;
  } else {
    score = 15;
    detail = `Title is acceptable (${len} chars) but could be longer for maximum impact.`;
  }

  return { key: "title_length", label: "Title length", score, maxScore: 25, detail };
}

function scoreDescription(description: string): SeoSignal {
  const len = description.trim().length;
  let score = 0;
  let detail: string;

  if (len === 0) {
    detail = "No meta description. Google will auto-generate one from your content.";
  } else if (len < DESC_MIN) {
    score = 5;
    detail = `Description is very short (${len} chars). Aim for ${DESC_OPTIMAL_MIN}\u2013${DESC_OPTIMAL_MAX} characters.`;
  } else if (len >= DESC_OPTIMAL_MIN && len <= DESC_OPTIMAL_MAX) {
    score = 25;
    detail = `Description length is ideal (${len} chars).`;
  } else if (len > DESC_OPTIMAL_MAX) {
    score = 15;
    detail = `Description may be truncated (${len} chars). Keep under ${DESC_OPTIMAL_MAX}.`;
  } else {
    score = 12;
    detail = `Description is short (${len} chars). More detail could improve click-through rate.`;
  }

  return { key: "desc_length", label: "Meta description", score, maxScore: 25, detail };
}

function scoreSlug(slug: string): SeoSignal {
  const trimmed = slug.trim();
  let score = 0;
  let detail: string;

  if (!trimmed) {
    detail = "Slug is empty. Add a URL-friendly slug.";
    return { key: "slug_quality", label: "URL slug", score, maxScore: 20, detail };
  }

  const words = trimmed.split("-").filter(Boolean);
  const hasNumbers = /\d{4,}/.test(trimmed);
  const hasSpecialChars = /[^a-z0-9-]/.test(trimmed);

  if (hasSpecialChars) {
    score = 5;
    detail = "Slug contains special characters. Use only lowercase letters, numbers, and hyphens.";
  } else if (words.length <= SLUG_MAX_WORDS && !hasNumbers) {
    score = 20;
    detail = `Slug is clean and concise (${words.length} words).`;
  } else if (words.length > SLUG_MAX_WORDS) {
    score = 10;
    detail = `Slug is long (${words.length} words). Shorter slugs (3\u20135 words) rank better.`;
  } else if (hasNumbers) {
    score = 15;
    detail = "Slug contains long numbers. Consider removing dates or IDs for evergreen URLs.";
  } else {
    score = 12;
    detail = "Slug is acceptable but could be more concise.";
  }

  return { key: "slug_quality", label: "URL slug", score, maxScore: 20, detail };
}

function scoreKeywordPresence(title: string, content: string): SeoSignal {
  const titleWords = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  if (titleWords.length === 0) {
    return {
      key: "keyword_presence",
      label: "Keyword consistency",
      score: 0,
      maxScore: 15,
      detail: "No meaningful keywords found in the title.",
    };
  }

  const contentLower = content.toLowerCase();
  const found = titleWords.filter((w) => contentLower.includes(w));
  const ratio = found.length / titleWords.length;

  let score: number;
  let detail: string;

  if (ratio >= 0.8) {
    score = 15;
    detail = "Title keywords appear consistently in the content.";
  } else if (ratio >= 0.5) {
    score = 10;
    detail = `${found.length}/${titleWords.length} title keywords found in content. Consider reinforcing key terms.`;
  } else {
    score = 5;
    detail = `Only ${found.length}/${titleWords.length} title keywords appear in the body. Align content with your title.`;
  }

  return { key: "keyword_presence", label: "Keyword consistency", score, maxScore: 15, detail };
}

function scoreContentDepth(content: string): SeoSignal {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  let score: number;
  let detail: string;

  if (wordCount >= 1000) {
    score = 15;
    detail = `Comprehensive content (${wordCount.toLocaleString()} words). Long-form content tends to rank well.`;
  } else if (wordCount >= 500) {
    score = 12;
    detail = `Good content depth (${wordCount.toLocaleString()} words).`;
  } else if (wordCount >= 200) {
    score = 8;
    detail = `Content is moderate (${wordCount.toLocaleString()} words). Consider expanding for better ranking.`;
  } else if (wordCount > 0) {
    score = 4;
    detail = `Content is thin (${wordCount.toLocaleString()} words). Search engines prefer substantive articles.`;
  } else {
    score = 0;
    detail = "No content yet. Write at least 300+ words for a substantive post.";
  }

  return { key: "content_depth", label: "Content depth", score, maxScore: 15, detail };
}

function gradeFromScore(score: number): SeoGrade {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs work";
}

function buildSerpPreview(
  title: string,
  slug: string,
  description: string,
  siteHost: string
): SerpPreview {
  return {
    title: truncateForSerp(title || "Untitled Post", 60),
    url: `${siteHost} \u203A blog \u203A ${slug || "untitled"}`,
    description: truncateForSerp(
      description || "No description set. Google will generate a snippet from your content.",
      160
    ),
  };
}

/**
 * Analyze a blog post's SEO signals and generate a Google SERP preview.
 */
export function analyzeSeo(input: {
  title: string;
  slug: string;
  description: string;
  content: string;
  siteHost?: string;
}): SeoAnalysis {
  const { title, slug, description, content, siteHost = "yoursite.com" } = input;

  const signals: SeoSignal[] = [
    scoreTitle(title),
    scoreDescription(description),
    scoreSlug(slug),
    scoreKeywordPresence(title, content),
    scoreContentDepth(content),
  ];

  const score = signals.reduce((sum, s) => sum + s.score, 0);
  const grade = gradeFromScore(score);
  const serp = buildSerpPreview(title, slug, description, siteHost);

  return { score, grade, signals, serp };
}
