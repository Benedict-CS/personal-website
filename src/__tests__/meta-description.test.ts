import { metaDescriptionFromMarkdown } from "@/lib/meta-description";

describe("metaDescriptionFromMarkdown", () => {
  it("returns full text when under limit", () => {
    expect(metaDescriptionFromMarkdown("Hello **world**", 160)).toBe("Hello world");
  });

  it("truncates long text with ellipsis", () => {
    const long = "word ".repeat(50).trim();
    const out = metaDescriptionFromMarkdown(long, 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith("\u2026")).toBe(true);
  });

  it("returns empty for whitespace-only markdown", () => {
    expect(metaDescriptionFromMarkdown("   \n\n  ", 160)).toBe("");
  });
});
