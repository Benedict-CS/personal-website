import { getContentMetrics } from "@/lib/content-metrics";

describe("getContentMetrics", () => {
  it("returns zero-safe metrics for empty content", () => {
    const metrics = getContentMetrics("");
    expect(metrics.words).toBe(0);
    expect(metrics.readingMinutes).toBe(1);
    expect(metrics.readingLabel).toBe("1 min read");
  });

  it("normalizes markdown to consistent word and reading values", () => {
    const metrics = getContentMetrics("# Hello\n\nThis is a test post with **markdown**.");
    expect(metrics.words).toBe(8);
    expect(metrics.readingMinutes).toBeGreaterThanOrEqual(1);
    expect(metrics.readingLabel).toContain("min read");
  });
});
