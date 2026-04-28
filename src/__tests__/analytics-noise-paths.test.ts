import { isJunkAnalyticsPath, isLikelyOutdatedFakeUserAgent } from "@/lib/analytics-noise";

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
    expect(isJunkAnalyticsPath("/$(pwd)/package.json")).toBe(true);
    expect(isJunkAnalyticsPath("/var/task/next.config.mjs")).toBe(true);
    expect(isJunkAnalyticsPath("/~/.aws/credentials")).toBe(true);
    expect(isJunkAnalyticsPath("/:27017")).toBe(true);
    expect(isJunkAnalyticsPath("/wp-json/wp/v2/users")).toBe(true);
    expect(isJunkAnalyticsPath("/terraform.tfstate")).toBe(true);
    expect(isJunkAnalyticsPath("/.well-known/*")).toBe(true);
    expect(isJunkAnalyticsPath("/probe.php")).toBe(true);
    expect(isJunkAnalyticsPath("/admin/phpinfo.php")).toBe(true);
    expect(isJunkAnalyticsPath("/server-status")).toBe(true);
    expect(isJunkAnalyticsPath("/%69%6E%66%6F.%70%68%70")).toBe(true); // info.php
    expect(isJunkAnalyticsPath("/%70%68%70.%70%68%70")).toBe(true); // php.php
  });

  it("flags forged static asset paths used by chunk-spray scanners", () => {
    expect(isJunkAnalyticsPath("/chunks/45798-54fbda4175adf8dd.js")).toBe(true);
    expect(isJunkAnalyticsPath("/chunks/app/page-005b4c5bd64ebdcc.js")).toBe(true);
    expect(isJunkAnalyticsPath("/static/chunks/main.js")).toBe(true);
    expect(isJunkAnalyticsPath("/random/file.css")).toBe(true);
    expect(isJunkAnalyticsPath("/whatever.map")).toBe(true);
    expect(isJunkAnalyticsPath("/foo.bar.JS")).toBe(true);
  });

  it("flags secret/config probe paths (.env / .json / graphql)", () => {
    expect(isJunkAnalyticsPath("/config.env")).toBe(true);
    expect(isJunkAnalyticsPath("/env.json")).toBe(true);
    expect(isJunkAnalyticsPath("/settings.json")).toBe(true);
    expect(isJunkAnalyticsPath("/app-config.json")).toBe(true);
    expect(isJunkAnalyticsPath("/graphql")).toBe(true);
    expect(isJunkAnalyticsPath("/api/graphql")).toBe(true);
  });

  it("does not flag normal blog paths or whitelisted JSON", () => {
    expect(isJunkAnalyticsPath("/blog/hello-world")).toBe(false);
    expect(isJunkAnalyticsPath("/about")).toBe(false);
    expect(isJunkAnalyticsPath("/manifest.json")).toBe(false);
    expect(isJunkAnalyticsPath("/feed.json")).toBe(false);
  });
});

describe("isLikelyOutdatedFakeUserAgent", () => {
  it("flags ancient browsers commonly used by scanner UA pools", () => {
    expect(isLikelyOutdatedFakeUserAgent("Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko")).toBe(true);
    expect(isLikelyOutdatedFakeUserAgent("Mozilla/4.0 (compatible; MSIE 5.5; Windows NT 5.0)")).toBe(true);
    expect(isLikelyOutdatedFakeUserAgent("Mozilla/5.0 (X11; Linux i686; rv:12.0) Gecko/20100101 Firefox/12.0")).toBe(true);
    expect(isLikelyOutdatedFakeUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:35.0) Gecko/20100101 Firefox/35.0")).toBe(true);
    expect(isLikelyOutdatedFakeUserAgent("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0")).toBe(true);
    expect(isLikelyOutdatedFakeUserAgent("Mozilla/5.0 (iPhone; U; CPU iPhone OS 5_1_1 like Mac OS X; da-dk) AppleWebKit/534")).toBe(true);
    expect(isLikelyOutdatedFakeUserAgent("SonyEricssonK810i/R1KG Browser/NetFront/3.3")).toBe(true);
    expect(isLikelyOutdatedFakeUserAgent("Mozilla/5.0 (BeOS; U; BeOS BePC; en-US; rv:1.9a1) Gecko/20060702")).toBe(true);
    /** AppleWebKit/537.36 with no Chrome/Edg token → forged. */
    expect(isLikelyOutdatedFakeUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")).toBe(true);
  });

  it("does not flag modern browsers", () => {
    expect(isLikelyOutdatedFakeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")).toBe(false);
    expect(isLikelyOutdatedFakeUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15")).toBe(false);
    expect(isLikelyOutdatedFakeUserAgent("Mozilla/5.0 (Windows NT 10.0; rv:121.0) Gecko/20100101 Firefox/121.0")).toBe(false);
    expect(isLikelyOutdatedFakeUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 Version/17.4")).toBe(false);
  });
});
