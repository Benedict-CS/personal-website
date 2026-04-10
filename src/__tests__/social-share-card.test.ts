import { buildSocialShareCardUrl, sanitizeShareCardTheme } from "@/lib/social-share-card";

describe("social-share-card", () => {
  it("builds OG URL with encoded params", () => {
    const url = buildSocialShareCardUrl({
      title: "Hello World",
      subtitle: "Deep dive",
      label: "Blog Post",
      theme: "blue",
    });
    expect(url).toContain("/api/og?");
    expect(url).toContain("title=Hello+World");
    expect(url).toContain("subtitle=Deep+dive");
    expect(url).toContain("label=Blog+Post");
    expect(url).toContain("theme=blue");
  });

  it("falls back to default theme when invalid", () => {
    expect(sanitizeShareCardTheme("bad-theme")).toBe("slate");
  });
});
