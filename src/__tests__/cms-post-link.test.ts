import { buildBlogPostLinkMarkdown } from "@/lib/cms-post-link";

describe("buildBlogPostLinkMarkdown", () => {
  it("returns empty string for blank slug", () => {
    expect(buildBlogPostLinkMarkdown("  ")).toBe("");
  });

  it("builds relative blog link with encoded slug", () => {
    const s = buildBlogPostLinkMarkdown("hello world");
    expect(s).toContain("/blog/hello%20world");
    expect(s).toContain("[Read on site →]");
  });

  it("trims slashes from slug", () => {
    const s = buildBlogPostLinkMarkdown("/my-post/");
    expect(s).toContain("/blog/my-post");
  });
});
