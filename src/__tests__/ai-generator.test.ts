import { generateSiteSchemaFromPrompt, rewriteMarketingCopy } from "@/lib/saas/ai-generator";

describe("AI site generator", () => {
  it("generates deterministic site schema from prompt", () => {
    const result = generateSiteSchemaFromPrompt("A modern bakery website in New York");
    expect(result.siteName.length).toBeGreaterThan(0);
    expect(result.pages.length).toBeGreaterThanOrEqual(3);
    expect(result.pages.some((p) => p.slug === "home")).toBe(true);
  });

  it("rewrites copy in SEO tone", () => {
    const rewritten = rewriteMarketingCopy("Fresh sourdough made daily", "seo");
    expect(rewritten).toContain("Trusted quality");
  });

  it("rewrites copy in formal and friendly tone", () => {
    expect(rewriteMarketingCopy("Welcome", "formal")).toContain("pleased to present");
    expect(rewriteMarketingCopy("Welcome", "friendly")).toContain("friendly");
  });
});

