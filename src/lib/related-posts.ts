/**
 * Smart related posts engine.
 *
 * Computes content similarity between posts using three signals:
 * 1. **Tag overlap** (Jaccard similarity) — shared taxonomy
 * 2. **Title keyword overlap** — shared topic focus
 * 3. **Content term frequency** — shared vocabulary beyond headings
 *
 * Weights: tags (40%), title keywords (30%), content terms (30%)
 *
 * Pure functions — no DB or network — deterministic and testable.
 */

export interface PostForSimilarity {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  content: string;
}

export interface RelatedPostResult {
  id: string;
  title: string;
  slug: string;
  score: number;
  reasons: string[];
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "shall", "can", "need",
  "it", "its", "this", "that", "these", "those", "i", "you", "he",
  "she", "we", "they", "me", "him", "her", "us", "them", "my", "your",
  "his", "our", "their", "what", "which", "who", "whom", "how", "when",
  "where", "why", "all", "each", "every", "both", "few", "more", "most",
  "other", "some", "such", "no", "not", "only", "same", "so", "than",
  "too", "very", "just", "about", "also", "if", "then", "into",
  "through", "during", "before", "after", "above", "below", "between",
  "out", "up", "down", "over", "under", "again", "once", "here",
  "there", "while", "because", "although", "since", "unless",
  "get", "got", "like", "make", "made", "use", "used", "using",
  "new", "one", "two", "way", "even", "well", "back",
]);

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>|]/g, " ")
    .replace(/<[^>]+>/g, " ");
}

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function uniqueKeywords(text: string): Set<string> {
  return new Set(extractKeywords(text));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function tagOverlap(tagsA: string[], tagsB: string[]): { score: number; shared: string[] } {
  const setA = new Set(tagsA.map((t) => t.toLowerCase()));
  const setB = new Set(tagsB.map((t) => t.toLowerCase()));
  const shared: string[] = [];
  for (const tag of setA) {
    if (setB.has(tag)) shared.push(tag);
  }
  const union = new Set([...setA, ...setB]).size;
  const score = union === 0 ? 0 : shared.length / union;
  return { score, shared };
}

/**
 * Compute the similarity score between two posts.
 * Returns a score 0-100 and human-readable reasons.
 */
export function computeSimilarity(
  postA: PostForSimilarity,
  postB: PostForSimilarity
): { score: number; reasons: string[] } {
  const reasons: string[] = [];

  const tagResult = tagOverlap(postA.tags, postB.tags);
  const tagScore = tagResult.score;
  if (tagResult.shared.length > 0) {
    reasons.push(`${tagResult.shared.length} shared tag${tagResult.shared.length > 1 ? "s" : ""}`);
  }

  const titleA = uniqueKeywords(postA.title);
  const titleB = uniqueKeywords(postB.title);
  const titleScore = jaccardSimilarity(titleA, titleB);
  if (titleScore > 0) {
    const sharedTitle: string[] = [];
    for (const w of titleA) if (titleB.has(w)) sharedTitle.push(w);
    if (sharedTitle.length > 0) {
      reasons.push(`title keywords: ${sharedTitle.slice(0, 3).join(", ")}`);
    }
  }

  const contentA = uniqueKeywords(stripMarkdown(postA.content));
  const contentB = uniqueKeywords(stripMarkdown(postB.content));
  const contentScore = jaccardSimilarity(contentA, contentB);
  if (contentScore > 0.05) {
    reasons.push("similar vocabulary");
  }

  const weighted = tagScore * 0.4 + titleScore * 0.3 + contentScore * 0.3;
  const score = Math.min(100, Math.round(weighted * 100));

  return { score, reasons };
}

/**
 * Find the most related posts to a given source post.
 *
 * @param source — The post to find related content for
 * @param candidates — All other posts to compare against
 * @param limit — Maximum number of results (default 5)
 * @param minScore — Minimum similarity score to include (default 5)
 */
export function findRelatedPosts(
  source: PostForSimilarity,
  candidates: PostForSimilarity[],
  limit: number = 5,
  minScore: number = 5
): RelatedPostResult[] {
  return candidates
    .filter((c) => c.id !== source.id)
    .map((candidate) => {
      const { score, reasons } = computeSimilarity(source, candidate);
      return { id: candidate.id, title: candidate.title, slug: candidate.slug, score, reasons };
    })
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
