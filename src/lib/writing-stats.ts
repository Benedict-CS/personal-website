/**
 * Writing statistics engine for the dashboard overview.
 *
 * Computes authoring productivity metrics from post data: word counts,
 * publishing cadence, tag distribution, and weekly activity trends.
 * All functions are pure — no DB or network access — making them
 * deterministic and easy to test.
 */

export interface PostDataForStats {
  content: string;
  published: boolean;
  createdAt: string;
  tags: { name: string }[];
}

export interface TagFrequency {
  name: string;
  count: number;
}

export interface WeeklyActivity {
  /** ISO week label, e.g. "Mar 31" (Monday of that week). */
  label: string;
  count: number;
}

export interface WritingStats {
  totalWords: number;
  avgWordsPerPost: number;
  avgReadingMinutes: number;
  longestPostWords: number;
  shortestPostWords: number;
  postsThisMonth: number;
  postsLastMonth: number;
  monthOverMonthDelta: number;
  topTags: TagFrequency[];
  weeklyActivity: WeeklyActivity[];
}

const WORDS_PER_MINUTE = 200;

export function countWords(content: string): number {
  const stripped = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/[#*_~>|+-]/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).filter(Boolean).length;
}

function getMonthStart(date: Date, monthsAgo: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth() - monthsAgo, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(monday: Date): string {
  return monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const WEEK_COUNT = 12;

function buildEmptyWeeks(now: Date): WeeklyActivity[] {
  const currentMonday = getWeekMonday(now);
  const weeks: WeeklyActivity[] = [];
  for (let i = WEEK_COUNT - 1; i >= 0; i--) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(weekStart.getDate() - i * 7);
    weeks.push({ label: formatWeekLabel(weekStart), count: 0 });
  }
  return weeks;
}

function buildWeeksWithCounts(now: Date, posts: PostDataForStats[]): WeeklyActivity[] {
  const currentMonday = getWeekMonday(now);
  const weeks: WeeklyActivity[] = [];
  for (let i = WEEK_COUNT - 1; i >= 0; i--) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const count = posts.filter((p) => {
      const d = new Date(p.createdAt);
      return d >= weekStart && d < weekEnd;
    }).length;
    weeks.push({ label: formatWeekLabel(weekStart), count });
  }
  return weeks;
}

/**
 * Compute writing statistics from an array of post data.
 *
 * @param posts - Array of posts with content, published flag, createdAt, and tags
 * @param now - Reference "now" date for time-relative computations (defaults to current time)
 */
export function computeWritingStats(
  posts: PostDataForStats[],
  now: Date = new Date()
): WritingStats {
  const emptyWeeks = buildEmptyWeeks(now);

  if (posts.length === 0) {
    return {
      totalWords: 0,
      avgWordsPerPost: 0,
      avgReadingMinutes: 0,
      longestPostWords: 0,
      shortestPostWords: 0,
      postsThisMonth: 0,
      postsLastMonth: 0,
      monthOverMonthDelta: 0,
      topTags: [],
      weeklyActivity: emptyWeeks,
    };
  }

  const wordCounts = posts.map((p) => countWords(p.content));
  const totalWords = wordCounts.reduce((sum, w) => sum + w, 0);
  const avgWordsPerPost = Math.round(totalWords / posts.length);
  const avgReadingMinutes = Math.max(1, Math.round(avgWordsPerPost / WORDS_PER_MINUTE));
  const longestPostWords = Math.max(...wordCounts);
  const shortestPostWords = Math.min(...wordCounts);

  const thisMonthStart = getMonthStart(now, 0);
  const lastMonthStart = getMonthStart(now, 1);
  const postsThisMonth = posts.filter((p) => new Date(p.createdAt) >= thisMonthStart).length;
  const postsLastMonth = posts.filter((p) => {
    const d = new Date(p.createdAt);
    return d >= lastMonthStart && d < thisMonthStart;
  }).length;
  const monthOverMonthDelta = postsLastMonth > 0
    ? Math.round(((postsThisMonth - postsLastMonth) / postsLastMonth) * 100)
    : postsThisMonth > 0
      ? 100
      : 0;

  const tagMap = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      tagMap.set(tag.name, (tagMap.get(tag.name) ?? 0) + 1);
    }
  }
  const topTags = Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const weeks = buildWeeksWithCounts(now, posts);

  return {
    totalWords,
    avgWordsPerPost,
    avgReadingMinutes,
    longestPostWords,
    shortestPostWords,
    postsThisMonth,
    postsLastMonth,
    monthOverMonthDelta,
    topTags,
    weeklyActivity: weeks,
  };
}
