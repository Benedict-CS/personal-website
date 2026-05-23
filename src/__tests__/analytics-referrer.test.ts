import {
  formatInternalReferrerLabel,
  getAnalyticsSiteHostnames,
  isSameSiteReferrer,
  sanitizeReferrerForAnalytics,
  splitReferrerRows,
} from "@/lib/analytics-referrer";

describe("sanitizeReferrerForAnalytics", () => {
  it("strips sensitive query params", () => {
    expect(sanitizeReferrerForAnalytics("https://x.test/blog/preview?token=secret")).toBe(
      "https://x.test/blog/preview"
    );
  });
});

describe("isSameSiteReferrer", () => {
  const prev = process.env.NEXT_PUBLIC_SITE_URL;
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://benedict.winlab.tw";
  });
  afterAll(() => {
    process.env.NEXT_PUBLIC_SITE_URL = prev;
  });

  it("detects same-site URLs", () => {
    expect(
      isSameSiteReferrer("https://benedict.winlab.tw/blog/thesis-a-cicd-framework-for-zero-downtime-deployment")
    ).toBe(true);
    expect(isSameSiteReferrer("https://www.linkedin.com/")).toBe(false);
  });

  it("lists configured hostnames", () => {
    expect(getAnalyticsSiteHostnames()).toEqual(expect.arrayContaining(["benedict.winlab.tw"]));
  });
});

describe("splitReferrerRows", () => {
  it("separates external and on-site referrers", () => {
    const split = splitReferrerRows([
      { referrer: "https://www.linkedin.com/feed/", count: 9 },
      { referrer: "https://github.com/ben/repo", count: 3 },
      {
        referrer:
          "https://benedict.winlab.tw/blog/thesis-a-cicd-framework-for-zero-downtime-deployment-in-wi-fi-mesh-networks",
        count: 14,
      },
      { referrer: "https://benedict.winlab.tw/", count: 13 },
    ]);
    expect(split.external).toHaveLength(2);
    expect(split.external[0].count).toBe(9);
    expect(split.internalTotal).toBe(27);
    expect(split.internal.some((r) => r.label.startsWith("Blog ·"))).toBe(true);
  });

  it("labels internal blog paths", () => {
    expect(
      formatInternalReferrerLabel("https://benedict.winlab.tw/blog/hello-world")
    ).toBe("Blog · hello-world");
  });
});
