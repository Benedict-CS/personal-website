import { aggregateDailyCounts } from "@/lib/wasm/perf-kernel";

type TrendViewRow = { createdAt: Date };
type TrendEventRow = { createdAt: Date; action: string };

export type DailyAnalyticsTrendRow = {
  day: string;
  views: number;
  cvDownloads: number;
  leads: number;
};

type BuildDailyAnalyticsTrendInput = {
  start: string;
  end: string;
  pageViews: TrendViewRow[];
  events: TrendEventRow[];
};

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Builds a day-level analytics series for charts and trend summaries.
 */
export function buildDailyAnalyticsTrend(input: BuildDailyAnalyticsTrendInput): DailyAnalyticsTrendRow[] {
  const start = new Date(`${input.start}T00:00:00.000Z`);
  const end = new Date(`${input.end}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const map = new Map<string, DailyAnalyticsTrendRow>();
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = toDayKey(cursor);
    map.set(day, { day, views: 0, cvDownloads: 0, leads: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const row of input.pageViews) {
    const key = toDayKey(row.createdAt);
    const bucket = map.get(key);
    if (bucket) bucket.views += 1;
  }
  for (const row of input.events) {
    const key = toDayKey(row.createdAt);
    const bucket = map.get(key);
    if (!bucket) continue;
    if (row.action === "analytics.cv_download") bucket.cvDownloads += 1;
    if (row.action === "analytics.lead_generated") bucket.leads += 1;
  }

  return Array.from(map.values());
}

/**
 * WASM-kernel accelerated daily aggregation path.
 * Falls back automatically to JS if kernel is unavailable.
 */
export async function buildDailyAnalyticsTrendWithKernel(
  input: BuildDailyAnalyticsTrendInput
): Promise<DailyAnalyticsTrendRow[]> {
  const start = new Date(`${input.start}T00:00:00.000Z`);
  const end = new Date(`${input.end}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const dayMs = 24 * 60 * 60 * 1000;
  const startDayMs = start.getTime();
  const endDayMs = end.getTime();
  const totalDays = Math.floor((endDayMs - startDayMs) / dayMs) + 1;

  const viewsCounts = await aggregateDailyCounts(
    input.pageViews.map((row) => row.createdAt.getTime()),
    startDayMs,
    endDayMs
  );
  const cvCounts = await aggregateDailyCounts(
    input.events
      .filter((row) => row.action === "analytics.cv_download")
      .map((row) => row.createdAt.getTime()),
    startDayMs,
    endDayMs
  );
  const leadCounts = await aggregateDailyCounts(
    input.events
      .filter((row) => row.action === "analytics.lead_generated")
      .map((row) => row.createdAt.getTime()),
    startDayMs,
    endDayMs
  );

  const rows: DailyAnalyticsTrendRow[] = [];
  for (let i = 0; i < totalDays; i += 1) {
    const day = new Date(startDayMs + i * dayMs).toISOString().slice(0, 10);
    rows.push({
      day,
      views: viewsCounts[i] ?? 0,
      cvDownloads: cvCounts[i] ?? 0,
      leads: leadCounts[i] ?? 0,
    });
  }
  return rows;
}
