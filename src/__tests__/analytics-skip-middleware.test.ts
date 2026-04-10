import { shouldSkipMiddlewareAnalytics } from "@/lib/analytics-skip-middleware";

describe("shouldSkipMiddlewareAnalytics", () => {
  it("skips API and Next internals", () => {
    expect(shouldSkipMiddlewareAnalytics("/api/posts", "Mozilla/5.0")).toBe(true);
    expect(shouldSkipMiddlewareAnalytics("/_next/data/foo", "Mozilla/5.0")).toBe(true);
    expect(shouldSkipMiddlewareAnalytics("/api/health", "kube-probe/1.29")).toBe(true);
  });

  it("skips SEO and feed paths", () => {
    expect(shouldSkipMiddlewareAnalytics("/robots.txt", "Mozilla/5.0")).toBe(true);
    expect(shouldSkipMiddlewareAnalytics("/sitemap.xml", "Mozilla/5.0")).toBe(true);
    expect(shouldSkipMiddlewareAnalytics("/sitemap/abc", "Mozilla/5.0")).toBe(true);
    expect(shouldSkipMiddlewareAnalytics("/feed.xml", "Mozilla/5.0")).toBe(true);
  });

  it("skips known bots", () => {
    expect(
      shouldSkipMiddlewareAnalytics(
        "/blog/foo",
        "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)"
      )
    ).toBe(true);
    expect(
      shouldSkipMiddlewareAnalytics("/sitemap.xml", "Mozilla/5.0 AppleWebKit/537.36 (compatible; bingbot/2.0)")
    ).toBe(true);
    expect(
      shouldSkipMiddlewareAnalytics("/", "Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot/1.3)")
    ).toBe(true);
    expect(
      shouldSkipMiddlewareAnalytics("/", "Mozilla/5.0 (compatible; SemrushBot/7~bl; +https://www.semrush.com/bot.html)")
    ).toBe(true);
    expect(
      shouldSkipMiddlewareAnalytics("/", "Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/124.0.0.0")
    ).toBe(true);
  });

  it("does not skip normal browsers", () => {
    expect(
      shouldSkipMiddlewareAnalytics(
        "/",
        "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0"
      )
    ).toBe(false);
  });

  it("skips probe paths case-insensitively", () => {
    expect(shouldSkipMiddlewareAnalytics("/.ENV", "Mozilla/5.0")).toBe(true);
    expect(shouldSkipMiddlewareAnalytics("/.Git/HEAD", "curl/8")).toBe(true);
  });

  it("skips scanner user agents from shared noise list", () => {
    expect(
      shouldSkipMiddlewareAnalytics(
        "/",
        "Mozilla/5.0 (compatible; NetcraftSurveyAgent/1.0; +info@netcraft.com)"
      )
    ).toBe(true);
  });
});
