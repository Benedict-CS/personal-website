import { buildCmsDetailsBlockMarkdown } from "@/lib/cms-details-block-insert";

describe("buildCmsDetailsBlockMarkdown", () => {
  it("returns a details block with summary and placeholder body", () => {
    const md = buildCmsDetailsBlockMarkdown();
    expect(md).toContain("<details>");
    expect(md).toContain("</details>");
    expect(md).toContain("<summary>");
    expect(md).toContain("Click to expand");
  });
});
