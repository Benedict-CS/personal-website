import { computeLineDiff } from "@/lib/markdown-diff";
import { buildPostDiffSemanticHints, buildPostVersionDiff } from "@/lib/post-version-diff";

describe("buildPostVersionDiff", () => {
  it("detects changed title, slug, and publication flags", () => {
    const diff = buildPostVersionDiff(
      {
        title: "Current title",
        slug: "current-slug",
        published: true,
        content: "Line A\nLine B",
      },
      {
        title: "Old title",
        slug: "old-slug",
        published: false,
        content: "Line A\nLine C",
      }
    );

    expect(diff.meta.titleChanged).toBe(true);
    expect(diff.meta.slugChanged).toBe(true);
    expect(diff.meta.publishedChanged).toBe(true);
    expect(diff.content.changedLines).toBe(1);
  });

  it("returns unchanged summary when documents match", () => {
    const diff = buildPostVersionDiff(
      {
        title: "Same",
        slug: "same",
        published: false,
        content: "One\nTwo",
      },
      {
        title: "Same",
        slug: "same",
        published: false,
        content: "One\nTwo",
      }
    );

    expect(diff.meta.titleChanged).toBe(false);
    expect(diff.meta.slugChanged).toBe(false);
    expect(diff.meta.publishedChanged).toBe(false);
    expect(diff.content.changedLines).toBe(0);
  });
});

describe("buildPostDiffSemanticHints", () => {
  it("extracts structural markdown hints from changed lines", () => {
    const diff = computeLineDiff(
      "# Old heading\nParagraph\n- item",
      "# New heading\nParagraph\n- item\n[Docs](/docs)\n![img](/a.png)"
    );
    const hints = buildPostDiffSemanticHints(diff);
    expect(hints.find((item) => item.key === "headings")?.count).toBeGreaterThan(0);
    expect(hints.find((item) => item.key === "links")?.count).toBeGreaterThan(0);
    expect(hints.find((item) => item.key === "images")?.count).toBeGreaterThan(0);
  });
});
