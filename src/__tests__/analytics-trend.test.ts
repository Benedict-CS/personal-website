import { buildDailyAnalyticsTrend, buildDailyAnalyticsTrendWithKernel } from "@/lib/analytics-trend";

describe("buildDailyAnalyticsTrend", () => {
  it("groups views and conversions into daily buckets", () => {
    const trend = buildDailyAnalyticsTrend({
      start: "2026-04-01",
      end: "2026-04-03",
      pageViews: [
        { createdAt: new Date("2026-04-01T10:00:00Z") },
        { createdAt: new Date("2026-04-01T12:00:00Z") },
        { createdAt: new Date("2026-04-03T09:00:00Z") },
      ],
      events: [
        { createdAt: new Date("2026-04-01T13:00:00Z"), action: "analytics.cv_download" },
        { createdAt: new Date("2026-04-03T14:00:00Z"), action: "analytics.lead_generated" },
      ],
    });

    expect(trend).toHaveLength(3);
    expect(trend[0]).toMatchObject({ day: "2026-04-01", views: 2, cvDownloads: 1, leads: 0 });
    expect(trend[1]).toMatchObject({ day: "2026-04-02", views: 0, cvDownloads: 0, leads: 0 });
    expect(trend[2]).toMatchObject({ day: "2026-04-03", views: 1, cvDownloads: 0, leads: 1 });
  });

  it("builds same buckets via performance kernel path", async () => {
    const trend = await buildDailyAnalyticsTrendWithKernel({
      start: "2026-04-01",
      end: "2026-04-03",
      pageViews: [
        { createdAt: new Date("2026-04-01T10:00:00Z") },
        { createdAt: new Date("2026-04-01T12:00:00Z") },
        { createdAt: new Date("2026-04-03T09:00:00Z") },
      ],
      events: [
        { createdAt: new Date("2026-04-01T13:00:00Z"), action: "analytics.cv_download" },
        { createdAt: new Date("2026-04-03T14:00:00Z"), action: "analytics.lead_generated" },
      ],
    });

    expect(trend).toHaveLength(3);
    expect(trend[0]).toMatchObject({ day: "2026-04-01", views: 2, cvDownloads: 1, leads: 0 });
    expect(trend[1]).toMatchObject({ day: "2026-04-02", views: 0, cvDownloads: 0, leads: 0 });
    expect(trend[2]).toMatchObject({ day: "2026-04-03", views: 1, cvDownloads: 0, leads: 1 });
  });
});
