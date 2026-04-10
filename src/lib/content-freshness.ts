/**
 * Content freshness scoring engine.
 *
 * Evaluates how "fresh" published posts are based on time since their
 * last update. Search engines reward regularly updated content, and
 * authors need visibility into which posts are aging and need a refresh.
 *
 * All functions are pure — no DB or network access — making them
 * deterministic and easy to test.
 */

export interface PostForFreshness {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  updatedAt: string;
}

export type FreshnessGrade = "Fresh" | "Current" | "Aging" | "Stale";

export interface PostFreshnessItem {
  id: string;
  title: string;
  slug: string;
  daysSinceUpdate: number;
  score: number;
  grade: FreshnessGrade;
}

export interface FreshnessSummary {
  totalPublished: number;
  freshCount: number;
  currentCount: number;
  agingCount: number;
  staleCount: number;
  averageAge: number;
  stalestPosts: PostFreshnessItem[];
}

const FRESH_THRESHOLD = 30;
const CURRENT_THRESHOLD = 90;
const AGING_THRESHOLD = 180;

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function gradeFromDays(days: number): FreshnessGrade {
  if (days <= FRESH_THRESHOLD) return "Fresh";
  if (days <= CURRENT_THRESHOLD) return "Current";
  if (days <= AGING_THRESHOLD) return "Aging";
  return "Stale";
}

/**
 * Score freshness from 0 (extremely stale) to 100 (just updated).
 * Uses a decay curve: score = max(0, 100 - (days * 100 / 365))
 * This means content older than ~1 year scores 0.
 */
function computeFreshnessScore(daysSinceUpdate: number): number {
  const raw = 100 - (daysSinceUpdate * 100) / 365;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Compute freshness for a single post.
 */
export function scorePostFreshness(
  post: PostForFreshness,
  now: Date = new Date()
): PostFreshnessItem {
  const updated = new Date(post.updatedAt);
  const days = daysBetween(updated, now);
  const score = computeFreshnessScore(days);
  const grade = gradeFromDays(days);

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    daysSinceUpdate: days,
    score,
    grade,
  };
}

/**
 * Compute a freshness summary across all published posts.
 * Returns grade distribution counts, average age, and the top 5 stalest posts.
 */
export function computeFreshnessSummary(
  posts: PostForFreshness[],
  now: Date = new Date()
): FreshnessSummary {
  const published = posts.filter((p) => p.published);

  if (published.length === 0) {
    return {
      totalPublished: 0,
      freshCount: 0,
      currentCount: 0,
      agingCount: 0,
      staleCount: 0,
      averageAge: 0,
      stalestPosts: [],
    };
  }

  const scored = published.map((p) => scorePostFreshness(p, now));

  const freshCount = scored.filter((s) => s.grade === "Fresh").length;
  const currentCount = scored.filter((s) => s.grade === "Current").length;
  const agingCount = scored.filter((s) => s.grade === "Aging").length;
  const staleCount = scored.filter((s) => s.grade === "Stale").length;

  const totalDays = scored.reduce((sum, s) => sum + s.daysSinceUpdate, 0);
  const averageAge = Math.round(totalDays / scored.length);

  const stalestPosts = [...scored]
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  return {
    totalPublished: published.length,
    freshCount,
    currentCount,
    agingCount,
    staleCount,
    averageAge,
    stalestPosts,
  };
}

/**
 * Get the color class for a freshness grade.
 */
export function freshnessGradeColor(grade: FreshnessGrade): string {
  switch (grade) {
    case "Fresh": return "text-emerald-700 bg-emerald-50";
    case "Current": return "text-sky-700 bg-sky-50";
    case "Aging": return "text-amber-700 bg-amber-50";
    case "Stale": return "text-rose-700 bg-rose-50";
  }
}
