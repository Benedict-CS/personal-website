import { appendResponsiveVariantsToUrl, parseBlogImageUrl } from "@/lib/blog-image-srcset-url";

describe("blog-image-srcset-url", () => {
  it("round-trips variant URLs in the fragment", () => {
    const primary = "/api/media/serve/1.webp";
    const u640 = "/api/media/serve/1-w640.webp";
    const u1280 = "/api/media/serve/1-w1280.webp";
    const href = appendResponsiveVariantsToUrl(primary, [
      { descriptor: 640, url: u640 },
      { descriptor: 1280, url: u1280 },
    ]);
    expect(href).toContain("#rs=");
    const parsed = parseBlogImageUrl(href, { w: 1920, h: 1080 });
    expect(parsed.cleanSrc).toBe(primary);
    expect(parsed.srcSet).toContain("640w");
    expect(parsed.srcSet).toContain("1280w");
    expect(parsed.srcSet).toContain(primary);
    expect(parsed.srcSet).toContain("1920w");
  });

  it("leaves URLs without variants unchanged", () => {
    const u = "/api/media/serve/x.webp";
    expect(parseBlogImageUrl(u, { w: 400, h: 300 }).cleanSrc).toBe(u);
  });
});
