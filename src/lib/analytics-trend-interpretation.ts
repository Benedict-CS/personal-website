import type { AnalyticsTrendPoint } from "@/lib/analytics-anomaly";

export type TrendInterpretationCard = {
  title: string;
  detail: string;
  tone: "neutral" | "positive" | "caution";
};

function sumBy<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((acc, row) => acc + pick(row), 0);
}

/**
 * Derives short, actionable interpretation cards from daily trend buckets (privacy-first summaries).
 */
export function buildAnalyticsTrendInterpretationCards(trend: AnalyticsTrendPoint[]): TrendInterpretationCard[] {
  if (trend.length < 5) return [];

  const sorted = [...trend].sort((a, b) => a.day.localeCompare(b.day));
  const cards: TrendInterpretationCard[] = [];

  let peak = sorted[0]!;
  for (const row of sorted) {
    if (row.views > peak.views) peak = row;
  }
  if (peak.views > 0) {
    cards.push({
      title: "Strongest traffic day",
      detail: `${peak.day} led this range with ${peak.views.toLocaleString()} views.`,
      tone: "positive",
    });
  }

  if (sorted.length >= 10) {
    const last7 = sorted.slice(-7);
    const prev7 = sorted.slice(-14, -7);
    if (prev7.length >= 5) {
      const avgLast = sumBy(last7, (r) => r.views) / last7.length;
      const avgPrev = sumBy(prev7, (r) => r.views) / prev7.length;
      if (avgPrev > 0) {
        const pct = Math.round(((avgLast - avgPrev) / avgPrev) * 100);
        const tone: TrendInterpretationCard["tone"] =
          pct >= 10 ? "positive" : pct <= -10 ? "caution" : "neutral";
        let detail: string;
        if (pct >= 5) {
          detail = `Last week averaged ${Math.round(avgLast)} views/day, up ${pct}% vs the prior week.`;
        } else if (pct <= -5) {
          detail = `Last week averaged ${Math.round(avgLast)} views/day, down ${Math.abs(pct)}% vs the prior week.`;
        } else {
          detail = `Last week averaged ${Math.round(avgLast)} views/day, roughly flat versus the prior week.`;
        }
        cards.push({ title: "Recent daily rhythm", detail, tone });
      }
    }
  }

  const tail = sorted.slice(-7);
  const tViews = sumBy(tail, (r) => r.views);
  const tCv = sumBy(tail, (r) => r.cvDownloads);
  const tLeads = sumBy(tail, (r) => r.leads);
  if (tViews >= 15) {
    if (tCv === 0) {
      cards.push({
        title: "Conversion posture (7d)",
        detail: `${tViews.toLocaleString()} views in the last week with no CV downloads—consider strengthening above-the-fold CTAs.`,
        tone: "caution",
      });
    } else {
      const cvRate = (tCv / tViews) * 100;
      cards.push({
        title: "Conversion posture (7d)",
        detail: `CV download rate is about ${cvRate.toFixed(1)}% of views, with ${tLeads} lead(s) from ${tCv} download(s).`,
        tone: "neutral",
      });
    }
  }

  return cards.slice(0, 3);
}
