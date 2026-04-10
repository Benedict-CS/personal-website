export type EngagementPathRow = {
  path: string;
  views: number;
  avgDurationSeconds: number;
  cvDownloads: number;
  leads: number;
};

export type TopEngagedContentRow = {
  slug: string;
  title: string;
  views: number;
  avgDurationSeconds: number;
  cvDownloads: number;
  leads: number;
  engagementScore: number;
};

export type ConversionAttributionEvent = {
  action: "analytics.cv_download" | "analytics.lead_generated";
  details: string | null;
};

function normalizeSlug(path: string): string | null {
  if (!path.startsWith("/blog/")) return null;
  const raw = path.replace("/blog/", "").split("/")[0]?.trim() ?? "";
  if (!raw || raw.startsWith("?")) return null;
  return raw;
}

function round(value: number, digits = 2): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function extractBlogSlugFromReferrer(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    const path = url.pathname;
    if (!path.startsWith("/blog/")) return null;
    const slug = path.replace("/blog/", "").split("/")[0]?.trim() ?? "";
    return slug || null;
  } catch {
    return null;
  }
}

function readReferrerFromDetails(details: string | null): string | null {
  if (!details) return null;
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    return typeof parsed.referrer === "string" ? parsed.referrer : null;
  } catch {
    return null;
  }
}

export function buildConversionAttributionBySlug(
  events: ConversionAttributionEvent[]
): Map<string, { cvDownloads: number; leads: number }> {
  const map = new Map<string, { cvDownloads: number; leads: number }>();

  for (const event of events) {
    const slug = extractBlogSlugFromReferrer(readReferrerFromDetails(event.details));
    if (!slug) continue;
    const current = map.get(slug) ?? { cvDownloads: 0, leads: 0 };
    if (event.action === "analytics.cv_download") current.cvDownloads += 1;
    else if (event.action === "analytics.lead_generated") current.leads += 1;
    map.set(slug, current);
  }

  return map;
}

/**
 * Ranks blog content using a blended score:
 * - views (base reach)
 * - avg duration (attention)
 * - CV downloads and leads (conversion quality)
 */
export function buildTopEngagedContent(input: {
  paths: EngagementPathRow[];
  postsBySlug: Map<string, { title: string }>;
  limit?: number;
}): TopEngagedContentRow[] {
  const limit = input.limit ?? 8;
  const rows: TopEngagedContentRow[] = [];

  for (const row of input.paths) {
    const slug = normalizeSlug(row.path);
    if (!slug) continue;
    const post = input.postsBySlug.get(slug);
    if (!post) continue;

    const reach = Math.max(0, row.views) * 1.0;
    const attention = Math.max(0, row.avgDurationSeconds) / 45;
    const cvBoost = Math.max(0, row.cvDownloads) * 6;
    const leadBoost = Math.max(0, row.leads) * 12;
    const score = round(reach + attention + cvBoost + leadBoost);

    rows.push({
      slug,
      title: post.title,
      views: row.views,
      avgDurationSeconds: row.avgDurationSeconds,
      cvDownloads: row.cvDownloads,
      leads: row.leads,
      engagementScore: score,
    });
  }

  return rows
    .sort((a, b) => b.engagementScore - a.engagementScore || b.views - a.views || a.slug.localeCompare(b.slug))
    .slice(0, limit);
}
