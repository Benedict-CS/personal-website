import { buildReadingTimeInsertMarkdown } from "@/lib/cms-reading-time-insert";

describe("buildReadingTimeInsertMarkdown", () => {
  it("returns italic line with min read for empty body", () => {
    expect(buildReadingTimeInsertMarkdown("")).toMatch(/_Estimated reading time: 1 min read_\n\n/);
  });

  it("reflects longer content", () => {
    const words = Array.from({ length: 400 }, () => "word").join(" ");
    const out = buildReadingTimeInsertMarkdown(words);
    expect(out).toContain("_Estimated reading time:");
    expect(out).toMatch(/\d+ min read/);
  });
});
