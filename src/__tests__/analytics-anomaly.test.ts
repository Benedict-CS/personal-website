import { buildAnalyticsAnomalyCallouts } from "@/lib/analytics-anomaly";

describe("analytics-anomaly", () => {
  it("flags steep traffic drop", () => {
    const trend = [
      ...Array.from({ length: 7 }).map((_, i) => ({ day: `2026-04-0${i + 1}`, views: 200, cvDownloads: 20, leads: 5 })),
      ...Array.from({ length: 7 }).map((_, i) => ({ day: `2026-04-1${i + 1}`, views: 80, cvDownloads: 8, leads: 2 })),
    ];
    const callouts = buildAnalyticsAnomalyCallouts(trend);
    expect(callouts.some((c) => c.title.toLowerCase().includes("traffic"))).toBe(true);
  });

  it("returns stable info callout when normal", () => {
    const trend = [
      ...Array.from({ length: 14 }).map((_, i) => ({
        day: `2026-04-${String(i + 1).padStart(2, "0")}`,
        views: 100,
        cvDownloads: 10,
        leads: 2,
      })),
    ];
    const callouts = buildAnalyticsAnomalyCallouts(trend);
    expect(callouts[0]?.level).toBe("info");
  });
});
