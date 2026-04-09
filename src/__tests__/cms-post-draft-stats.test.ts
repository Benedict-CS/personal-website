import { computePostDraftMarkdownStats } from "@/lib/cms-post-draft-stats";

describe("computePostDraftMarkdownStats", () => {
  it("returns zeros for empty markdown", () => {
    expect(computePostDraftMarkdownStats("")).toEqual({
      words: 0,
      lines: 0,
      characters: 0,
    });
  });

  it("counts words lines and characters", () => {
    const md = "Hello world\n\nSecond line";
    expect(computePostDraftMarkdownStats(md)).toEqual({
      words: 4,
      lines: 3,
      characters: md.length,
    });
  });
});
