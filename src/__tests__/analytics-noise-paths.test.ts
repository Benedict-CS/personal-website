import { isJunkAnalyticsPath } from "@/lib/analytics-noise";

describe("isJunkAnalyticsPath", () => {
  it("treats probe paths as junk regardless of casing", () => {
    expect(isJunkAnalyticsPath("/.ENV")).toBe(true);
    expect(isJunkAnalyticsPath("/.Git/config")).toBe(true);
    expect(isJunkAnalyticsPath("/.AWS/credentials")).toBe(true);
    expect(isJunkAnalyticsPath("/debug.php")).toBe(true);
    expect(isJunkAnalyticsPath("/php.php")).toBe(true);
    expect(isJunkAnalyticsPath("/_profiler")).toBe(true);
    expect(isJunkAnalyticsPath("/apple-touch-icon.png")).toBe(true);
    expect(isJunkAnalyticsPath("/apple-touch-icon-precomposed.png")).toBe(true);
    expect(isJunkAnalyticsPath("/blog/any-post/opengraph-image")).toBe(true);
    expect(isJunkAnalyticsPath("/app/.env")).toBe(true);
    expect(isJunkAnalyticsPath("/laravel/.env")).toBe(true);
    expect(isJunkAnalyticsPath("/.cursor/mcp.json")).toBe(true);
    expect(isJunkAnalyticsPath("/.openai/config.json")).toBe(true);
    expect(isJunkAnalyticsPath("/.anthropic/config.json")).toBe(true);
    expect(isJunkAnalyticsPath("/config.json")).toBe(true);
    expect(isJunkAnalyticsPath("/credentials.json")).toBe(true);
    expect(isJunkAnalyticsPath("/serviceAccountKey.json")).toBe(true);
    expect(isJunkAnalyticsPath("/secrets.json")).toBe(true);
  });

  it("does not flag normal blog paths", () => {
    expect(isJunkAnalyticsPath("/blog/hello-world")).toBe(false);
    expect(isJunkAnalyticsPath("/about")).toBe(false);
  });
});
