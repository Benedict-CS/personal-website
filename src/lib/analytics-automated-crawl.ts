import type { Prisma, PrismaClient } from "@prisma/client";

/** Minimum rows before automated-crawl heuristics apply. */
export const AUTOMATED_CRAWL_MIN_ROWS = 4;

/** Max views allowed inside a short sliding window (micro-burst / prefetch storm). */
export const AUTOMATED_CRAWL_MICRO_BURST_WINDOW_MS = 3_000;
export const AUTOMATED_CRAWL_MICRO_BURST_MIN_VIEWS = 4;

/** Whole-session burst: many pages with almost no dwell time between first and last. */
export const AUTOMATED_CRAWL_SESSION_MAX_SPAN_MS = 90_000;
export const AUTOMATED_CRAWL_SESSION_MIN_VIEWS = 6;

/** Sliding window burst (dirbuster-style crawl). */
export const AUTOMATED_CRAWL_BURST_WINDOW_MS = 60_000;
export const AUTOMATED_CRAWL_BURST_MIN_VIEWS = 8;

/** Tag enumeration without probe paths. */
export const AUTOMATED_CRAWL_TAG_MIN_COUNT = 6;
export const AUTOMATED_CRAWL_TAG_MAX_SPAN_MS = 300_000;

/** Gap between page views that starts a new browsing session. */
export const AUTOMATED_CRAWL_SESSION_GAP_MS = 30 * 60 * 1000;

export type CrawlPageViewRow = {
  path: string;
  createdAt: Date;
  durationSeconds: number | null;
};

/** Split rows into sessions separated by idle gaps (default 30 min). */
export function splitIntoBrowsingSessions(
  rows: CrawlPageViewRow[],
  gapMs = AUTOMATED_CRAWL_SESSION_GAP_MS
): CrawlPageViewRow[][] {
  if (rows.length === 0) return [];
  const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const sessions: CrawlPageViewRow[][] = [[sorted[0]!]];
  for (let i = 1; i < sorted.length; i++) {
    const row = sorted[i]!;
    const prev = sorted[i - 1]!;
    if (row.createdAt.getTime() - prev.createdAt.getTime() > gapMs) {
      sessions.push([]);
    }
    sessions[sessions.length - 1]!.push(row);
  }
  return sessions;
}

/** True if any single browsing session for this IP looks automated. */
export function ipHasAutomatedCrawlSession(rows: CrawlPageViewRow[]): boolean {
  return splitIntoBrowsingSessions(rows).some((session) => isAutomatedCrawlSession(session));
}

/** Max page views inside any fixed window (times must be sorted ascending). */
export function maxViewsInSlidingWindow(sortedTimesMs: number[], windowMs: number): number {
  if (sortedTimesMs.length === 0) return 0;
  let max = 0;
  for (let i = 0; i < sortedTimesMs.length; i++) {
    let j = i;
    while (j < sortedTimesMs.length && sortedTimesMs[j]! - sortedTimesMs[i]! <= windowMs) j += 1;
    max = Math.max(max, j - i);
  }
  return max;
}

/**
 * True when page-view timestamps for one IP look like a bot, prefetch storm, or tag crawl —
 * even if every path is a "normal" blog URL.
 */
export function isAutomatedCrawlSession(rows: CrawlPageViewRow[]): boolean {
  if (rows.length < AUTOMATED_CRAWL_MIN_ROWS) return false;

  const times = rows.map((r) => r.createdAt.getTime()).sort((a, b) => a - b);
  const spanMs = times[times.length - 1]! - times[0]!;

  if (
    maxViewsInSlidingWindow(times, AUTOMATED_CRAWL_MICRO_BURST_WINDOW_MS) >=
    AUTOMATED_CRAWL_MICRO_BURST_MIN_VIEWS
  ) {
    return true;
  }

  if (rows.length >= AUTOMATED_CRAWL_SESSION_MIN_VIEWS && spanMs <= AUTOMATED_CRAWL_SESSION_MAX_SPAN_MS) {
    return true;
  }

  if (
    maxViewsInSlidingWindow(times, AUTOMATED_CRAWL_BURST_WINDOW_MS) >= AUTOMATED_CRAWL_BURST_MIN_VIEWS
  ) {
    return true;
  }

  const tagCount = rows.filter((r) => r.path.startsWith("/blog/tag/")).length;
  if (tagCount >= AUTOMATED_CRAWL_TAG_MIN_COUNT && spanMs <= AUTOMATED_CRAWL_TAG_MAX_SPAN_MS) {
    return true;
  }

  return false;
}

/**
 * IPs whose combined page views in scope match automated-crawl heuristics.
 */
export async function findAutomatedCrawlIps(
  prisma: Pick<PrismaClient, "pageView">,
  scope?: Prisma.PageViewWhereInput
): Promise<string[]> {
  const baseWhere: Prisma.PageViewWhereInput = scope ?? {};
  const groups = await prisma.pageView.groupBy({
    by: ["ip"],
    where: {
      AND: [
        baseWhere,
        { ip: { not: "unknown" } },
        { ip: { not: "127.0.0.1" } },
        { ip: { not: "::1" } },
      ],
    },
    _count: { ip: true },
  });

  const candidates = groups
    .filter((g) => g._count.ip >= AUTOMATED_CRAWL_MIN_ROWS)
    .map((g) => g.ip);

  const automated: string[] = [];
  for (const ip of candidates) {
    const rows = await prisma.pageView.findMany({
      where: { AND: [baseWhere, { ip }] },
      select: { path: true, createdAt: true, durationSeconds: true },
      orderBy: { createdAt: "asc" },
    });
    if (ipHasAutomatedCrawlSession(rows)) automated.push(ip);
  }
  return automated;
}

