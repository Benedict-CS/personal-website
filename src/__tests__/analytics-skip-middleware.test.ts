import { shouldSkipMiddlewareAnalytics } from "@/lib/analytics-skip-middleware";

function createHeaders(values: Record<string, string>) {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}

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

  it("skips prefetch requests so link preloading is not counted as views", () => {
    expect(
      shouldSkipMiddlewareAnalytics(
        "/blog/tag/devops",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        createHeaders({ purpose: "prefetch" })
      )
    ).toBe(true);
    expect(
      shouldSkipMiddlewareAnalytics(
        "/blog/tag/devops",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        createHeaders({ "next-router-prefetch": "1" })
      )
    ).toBe(true);
  });

  it("skips non-navigation document fetches without prefetch headers", () => {
    expect(
      shouldSkipMiddlewareAnalytics(
        "/blog/tag/devops",
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        createHeaders({
          accept: "text/html,application/xhtml+xml",
          "sec-fetch-mode": "no-cors",
          "sec-fetch-dest": "empty",
        })
      )
    ).toBe(true);
  });

  it("does not skip normal top-level page navigation", () => {
    expect(
      shouldSkipMiddlewareAnalytics(
        "/blog/hello-world",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        createHeaders({
          accept: "text/html,application/xhtml+xml",
          "sec-fetch-mode": "navigate",
          "sec-fetch-dest": "document",
        })
      )
    ).toBe(false);
  });

  it("skips apple touch icon paths", () => {
    expect(shouldSkipMiddlewareAnalytics("/apple-touch-icon.png", "Mozilla/5.0")).toBe(true);
    expect(shouldSkipMiddlewareAnalytics("/apple-touch-icon-precomposed.png", "Mozilla/5.0")).toBe(true);
  });
});
