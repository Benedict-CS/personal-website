import { buildAnalyticsTrendInterpretationCards } from "@/lib/analytics-trend-interpretation";

describe("buildAnalyticsTrendInterpretationCards", () => {
  it("returns empty when fewer than 5 days", () => {
    expect(
      buildAnalyticsTrendInterpretationCards([
        { day: "2026-01-01", views: 1, cvDownloads: 0, leads: 0 },
        { day: "2026-01-02", views: 2, cvDownloads: 0, leads: 0 },
      ])
    ).toEqual([]);
  });

  it("includes peak day and conversion card for a healthy series", () => {
    const trend = [
      { day: "2026-01-01", views: 10, cvDownloads: 0, leads: 0 },
      { day: "2026-01-02", views: 12, cvDownloads: 1, leads: 0 },
      { day: "2026-01-03", views: 8, cvDownloads: 0, leads: 0 },
      { day: "2026-01-04", views: 40, cvDownloads: 2, leads: 1 },
      { day: "2026-01-05", views: 11, cvDownloads: 1, leads: 0 },
      { day: "2026-01-06", views: 9, cvDownloads: 0, leads: 0 },
      { day: "2026-01-07", views: 10, cvDownloads: 1, leads: 0 },
    ];
    const cards = buildAnalyticsTrendInterpretationCards(trend);
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards.some((c) => c.title === "Strongest traffic day")).toBe(true);
    expect(cards.some((c) => c.title === "Conversion posture (7d)")).toBe(true);
  });
});
