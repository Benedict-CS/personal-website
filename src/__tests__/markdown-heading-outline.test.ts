import { extractMarkdownHeadingOutline } from "@/lib/markdown-heading-outline";

describe("extractMarkdownHeadingOutline", () => {
  it("returns heading depth, text, and source line", () => {
    const out = extractMarkdownHeadingOutline(
      "# Title\n\n## Section A\nText\n### Detail A1\n\n## Section B"
    );

    expect(out).toEqual([
      { depth: 1, text: "Title", line: 1 },
      { depth: 2, text: "Section A", line: 3 },
      { depth: 3, text: "Detail A1", line: 5 },
      { depth: 2, text: "Section B", line: 7 },
    ]);
  });

  it("ignores non-heading lines and empty markdown", () => {
    expect(extractMarkdownHeadingOutline("paragraph\n- list")).toEqual([]);
    expect(extractMarkdownHeadingOutline("   ")).toEqual([]);
  });
});
