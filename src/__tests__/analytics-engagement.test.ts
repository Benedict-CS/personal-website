import { buildConversionAttributionBySlug, buildTopEngagedContent } from "@/lib/analytics-engagement";

describe("analytics-engagement", () => {
  it("ranks engaged content with conversion-weighted score", () => {
    const rows = buildTopEngagedContent({
      paths: [
        { path: "/blog/a", views: 100, avgDurationSeconds: 30, cvDownloads: 0, leads: 0 },
        { path: "/blog/b", views: 60, avgDurationSeconds: 120, cvDownloads: 4, leads: 2 },
      ],
      postsBySlug: new Map([
        ["a", { title: "Post A" }],
        ["b", { title: "Post B" }],
      ]),
    });
    expect(rows[0]?.slug).toBe("b");
    expect(rows[0]?.engagementScore).toBeGreaterThan(rows[1]?.engagementScore ?? 0);
  });
});

describe("buildConversionAttributionBySlug", () => {
  it("groups conversion events by blog slug from referrer", () => {
    const map = buildConversionAttributionBySlug([
      {
        action: "analytics.cv_download",
        details: JSON.stringify({ referrer: "https://example.com/blog/my-post?utm_source=linkedin" }),
      },
      {
        action: "analytics.lead_generated",
        details: JSON.stringify({ referrer: "https://example.com/blog/my-post" }),
      },
      {
        action: "analytics.cv_download",
        details: JSON.stringify({ referrer: "https://example.com/contact" }),
      },
    ]);
    expect(map.get("my-post")?.cvDownloads).toBe(1);
    expect(map.get("my-post")?.leads).toBe(1);
    expect(map.has("contact")).toBe(false);
  });
});
