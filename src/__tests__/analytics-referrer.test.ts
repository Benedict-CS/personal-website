import { sanitizeReferrerForAnalytics } from "@/lib/analytics-referrer";

describe("sanitizeReferrerForAnalytics", () => {
  it("strips token from blog preview referrer", () => {
    expect(
      sanitizeReferrerForAnalytics(
        "https://example.com/blog/preview?token=secret123&foo=1"
      )
    ).toBe("https://example.com/blog/preview?foo=1");
  });

  it("returns null for empty", () => {
    expect(sanitizeReferrerForAnalytics("")).toBe(null);
    expect(sanitizeReferrerForAnalytics(null)).toBe(null);
  });

  it("leaves referrers without sensitive params unchanged", () => {
    expect(sanitizeReferrerForAnalytics("https://www.linkedin.com/")).toBe("https://www.linkedin.com/");
  });
});
