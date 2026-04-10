import { buildAnalyticsInsight } from "@/lib/analytics-insight";

describe("buildAnalyticsInsight", () => {
  it("returns no-traffic message when visits are zero", () => {
    const insight = buildAnalyticsInsight({ total: 0, cvDownloads: 0, leadGenerated: 0 });
    expect(insight).toContain("No qualified visits");
  });

  it("returns conversion message with top source when leads exist", () => {
    const insight = buildAnalyticsInsight({
      total: 100,
      cvDownloads: 20,
      leadGenerated: 4,
      byReferrerGroup: [
        { group: "Search Engines", count: 40 },
        { group: "Social Media", count: 30 },
      ],
    });
    expect(insight).toContain("Great momentum");
    expect(insight).toContain("Search Engines");
    expect(insight).toContain("20");
  });
});
