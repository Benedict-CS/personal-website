export type AnalyticsTrendPoint = {
  day: string;
  views: number;
  cvDownloads: number;
  leads: number;
};

export type AnalyticsAnomalyCallout = {
  level: "info" | "warning" | "positive";
  title: string;
  detail: string;
};

function sumBy<T>(rows: T[], selector: (row: T) => number): number {
  return rows.reduce((sum, row) => sum + selector(row), 0);
}

export function buildAnalyticsAnomalyCallouts(
  trend: AnalyticsTrendPoint[]
): AnalyticsAnomalyCallout[] {
  if (trend.length < 4) return [];

  const recent = trend.slice(-7);
  const previous = trend.slice(-14, -7);
  if (previous.length === 0) return [];

  const recentViews = sumBy(recent, (r) => r.views);
  const previousViews = Math.max(1, sumBy(previous, (r) => r.views));
  const recentCv = sumBy(recent, (r) => r.cvDownloads);
  const previousCv = Math.max(0, sumBy(previous, (r) => r.cvDownloads));
  const recentLeads = sumBy(recent, (r) => r.leads);
  const previousLeads = Math.max(0, sumBy(previous, (r) => r.leads));

  const viewsDeltaPct = Math.round(((recentViews - previousViews) / previousViews) * 100);
  const cvRateRecent = recentViews > 0 ? recentCv / recentViews : 0;
  const cvRatePrev = previousViews > 0 ? previousCv / previousViews : 0;
  const leadRateRecent = recentCv > 0 ? recentLeads / recentCv : 0;
  const leadRatePrev = previousCv > 0 ? previousLeads / previousCv : 0;

  const callouts: AnalyticsAnomalyCallout[] = [];

  if (viewsDeltaPct <= -30) {
    callouts.push({
      level: "warning",
      title: "Traffic dropped sharply",
      detail: `Views are down ${Math.abs(viewsDeltaPct)}% versus the previous 7-day window.`,
    });
  } else if (viewsDeltaPct >= 30) {
    callouts.push({
      level: "positive",
      title: "Traffic acceleration detected",
      detail: `Views are up ${viewsDeltaPct}% versus the previous 7-day window.`,
    });
  }

  const cvRateDelta = cvRateRecent - cvRatePrev;
  if (cvRateDelta <= -0.03) {
    callouts.push({
      level: "warning",
      title: "CV conversion softened",
      detail: `CV download rate fell from ${(cvRatePrev * 100).toFixed(1)}% to ${(cvRateRecent * 100).toFixed(1)}%.`,
    });
  } else if (cvRateDelta >= 0.03) {
    callouts.push({
      level: "positive",
      title: "CV conversion improved",
      detail: `CV download rate increased to ${(cvRateRecent * 100).toFixed(1)}%.`,
    });
  }

  const leadRateDelta = leadRateRecent - leadRatePrev;
  if (leadRateDelta <= -0.08 && recentCv >= 3) {
    callouts.push({
      level: "warning",
      title: "Lead conversion from CV is weaker",
      detail: `Lead-per-download fell from ${(leadRatePrev * 100).toFixed(1)}% to ${(leadRateRecent * 100).toFixed(1)}%.`,
    });
  } else if (leadRateDelta >= 0.08 && recentCv >= 3) {
    callouts.push({
      level: "positive",
      title: "Lead conversion from CV improved",
      detail: `Lead-per-download rose to ${(leadRateRecent * 100).toFixed(1)}%.`,
    });
  }

  if (callouts.length === 0) {
    callouts.push({
      level: "info",
      title: "No major anomalies detected",
      detail: "Traffic and conversion metrics are within a normal weekly range.",
    });
  }

  return callouts.slice(0, 3);
}
