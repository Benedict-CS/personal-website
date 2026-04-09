import { buildCmsDefinitionListMarkdown } from "@/lib/cms-definition-list-insert";

describe("buildCmsDefinitionListMarkdown", () => {
  it("includes colon-prefixed definition lines", () => {
    const md = buildCmsDefinitionListMarkdown();
    expect(md).toContain("API surface\n:");
    expect(md).toContain("Implementation detail\n:");
  });

  it("ends with a trailing newline for clean concatenation", () => {
    expect(buildCmsDefinitionListMarkdown().endsWith("\n")).toBe(true);
  });
});
