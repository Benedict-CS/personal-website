import {
  buildAutoTocMarkdownBlock,
  extractTocHeadingsFromMarkdown,
} from "@/lib/markdown-toc";

describe("extractTocHeadingsFromMarkdown", () => {
  it("extracts h1–h3 with stable ids", () => {
    const md = `
# Hello World

Some text.

## Second [link](https://x.com)

### Deep

## Second
`;
    const h = extractTocHeadingsFromMarkdown(md);
    expect(h.map((x) => x.level)).toEqual([1, 2, 3, 2]);
    expect(h[0]).toMatchObject({ level: 1, text: "Hello World", id: "hello-world" });
    expect(h[1].id).toBe("second-link");
    expect(h[2]).toMatchObject({ level: 3, text: "Deep", id: "deep" });
    // Distinct from "second-link"; first plain "Second" slug
    expect(h[3].id).toBe("second");
  });

  it("deduplicates identical heading text like rehype-slug", () => {
    const md = "## Same\n\n## Same\n";
    const h = extractTocHeadingsFromMarkdown(md);
    expect(h[0].id).toBe("same");
    expect(h[1].id).toBe("same-1");
  });

  it("ignores code fences and non-heading lines", () => {
    const md = "```\n# not a heading\n```\n\n## Real";
    const h = extractTocHeadingsFromMarkdown(md);
    expect(h).toHaveLength(1);
    expect(h[0].text).toBe("Real");
  });
});

describe("buildAutoTocMarkdownBlock", () => {
  it("builds anchor list for h1–h3", () => {
    const md = "## Intro\n\n### Detail\n\n## Outro\n";
    const block = buildAutoTocMarkdownBlock(md);
    expect(block).toContain("## Contents");
    expect(block).toContain("- [Intro](#intro)");
    expect(block).toContain("  - [Detail](#detail)");
    expect(block).toContain("- [Outro](#outro)");
  });

  it("returns placeholder when no headings", () => {
    const block = buildAutoTocMarkdownBlock("Just prose.\n");
    expect(block).toContain("## Contents");
    expect(block).toContain("_Add");
  });
});
