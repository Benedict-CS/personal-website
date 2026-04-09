import {
  isCustomPagePublicOnSite,
  stripCustomPageDecoratorsForSeo,
  stripScheduledPublishAt,
} from "@/lib/custom-page-schedule";

describe("custom-page-schedule", () => {
  it("stripScheduledPublishAt removes publish marker", () => {
    const raw = `<!-- custom-page:publish-at:2099-01-01T00:00:00.000Z -->\n# Hi`;
    expect(stripScheduledPublishAt(raw).trim()).toBe("# Hi");
  });

  it("isCustomPagePublicOnSite matches scheduled draft visibility", () => {
    const past = `<!-- custom-page:publish-at:2020-01-01T00:00:00.000Z -->\n# Hi`;
    expect(isCustomPagePublicOnSite(false, past)).toBe(true);
    const future = `<!-- custom-page:publish-at:2099-01-01T00:00:00.000Z -->\n# Hi`;
    expect(isCustomPagePublicOnSite(false, future)).toBe(false);
    expect(isCustomPagePublicOnSite(true, future)).toBe(true);
  });

  it("stripCustomPageDecoratorsForSeo removes schedule, theme, and brand hints", () => {
    const raw = `<!-- custom-page:publish-at:2020-01-01T00:00:00.000Z -->
<!-- site-theme:bold -->
<!-- site-brand:{"brandName":"X"} -->
# Title
Hello`;
    const out = stripCustomPageDecoratorsForSeo(raw);
    expect(out).toContain("# Title");
    expect(out).not.toContain("site-theme");
    expect(out).not.toContain("site-brand");
    expect(out).not.toContain("custom-page:publish-at");
  });
});
