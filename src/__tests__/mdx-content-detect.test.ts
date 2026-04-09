import { shouldRenderAsMdx } from "@/lib/mdx-content-detect";

describe("shouldRenderAsMdx", () => {
  it("returns false for plain markdown", () => {
    expect(shouldRenderAsMdx("# Hello\n\nSome **bold** text.")).toBe(false);
  });

  it("returns true when a whitelisted MDX component is present", () => {
    expect(shouldRenderAsMdx("# Hi\n\n<CodePlayground />\n")).toBe(true);
    expect(shouldRenderAsMdx(`<AbTestStats pctA={60} pctB={40} />`)).toBe(true);
    expect(shouldRenderAsMdx(`<TechStackGrid items="Go, Rust" />`)).toBe(true);
  });

  it("returns true for YAML frontmatter with format: mdx", () => {
    expect(
      shouldRenderAsMdx(`---\nformat: mdx\n---\n\n# Title\n\nHello.`)
    ).toBe(true);
  });
});
