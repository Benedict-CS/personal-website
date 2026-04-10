type InsightInput = {
  total: number;
  cvDownloads?: number;
  leadGenerated?: number;
  byReferrerGroup?: { group: string; count: number }[];
};

function topReferrerGroup(groups: { group: string; count: number }[] | undefined): string | null {
  if (!groups || groups.length === 0) return null;
  const sorted = [...groups].sort((a, b) => b.count - a.count);
  return sorted[0]?.group ?? null;
}

/**
 * Returns a concise human-readable insight string for analytics overview.
 */
export function buildAnalyticsInsight(input: InsightInput): string {
  const visitors = Math.max(0, input.total || 0);
  const downloads = Math.max(0, input.cvDownloads || 0);
  const leads = Math.max(0, input.leadGenerated || 0);
  const topSource = topReferrerGroup(input.byReferrerGroup);

  if (visitors === 0) {
    return "No qualified visits in this range yet. Traffic insights will appear after public sessions are recorded.";
  }

  const cvRate = visitors > 0 ? Math.round((downloads / visitors) * 100) : 0;
  const leadRate = downloads > 0 ? Math.round((leads / downloads) * 100) : 0;

  if (downloads === 0) {
    return topSource
      ? `Traffic is active (${visitors} visits), led by ${topSource}. Consider improving CTA visibility to lift CV downloads.`
      : `Traffic is active (${visitors} visits), but no CV downloads were recorded. Consider stronger above-the-fold CTA copy.`;
  }

  if (leads === 0) {
    return topSource
      ? `${downloads} CV downloads (${cvRate}% of visits) driven mainly by ${topSource}, but no leads yet—tighten contact handoff after download.`
      : `${downloads} CV downloads (${cvRate}% of visits) with no leads yet—tighten contact handoff after download.`;
  }

  return topSource
    ? `Great momentum: ${downloads} CV downloads (${cvRate}% of visits) and ${leads} leads (${leadRate}% CV-to-lead), with ${topSource} as the top source.`
    : `Great momentum: ${downloads} CV downloads (${cvRate}% of visits) and ${leads} leads (${leadRate}% CV-to-lead).`;
}
