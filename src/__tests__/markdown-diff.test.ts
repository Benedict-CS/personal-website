import { computeLineDiff, formatDiffSummary } from "@/lib/markdown-diff";

describe("computeLineDiff", () => {
  it("returns no changes for identical texts", () => {
    const diff = computeLineDiff("hello\nworld", "hello\nworld");
    expect(diff.additions).toBe(0);
    expect(diff.deletions).toBe(0);
    expect(diff.unchanged).toBe(2);
    expect(diff.lines.every((l) => l.kind === "equal")).toBe(true);
  });

  it("detects a single line addition", () => {
    const diff = computeLineDiff("line1\nline3", "line1\nline2\nline3");
    expect(diff.additions).toBe(1);
    expect(diff.deletions).toBe(0);
    const added = diff.lines.filter((l) => l.kind === "add");
    expect(added).toHaveLength(1);
    expect(added[0].text).toBe("line2");
    expect(added[0].newLineNumber).toBe(2);
    expect(added[0].oldLineNumber).toBeNull();
  });

  it("detects a single line deletion", () => {
    const diff = computeLineDiff("a\nb\nc", "a\nc");
    expect(diff.deletions).toBe(1);
    expect(diff.additions).toBe(0);
    const removed = diff.lines.filter((l) => l.kind === "remove");
    expect(removed).toHaveLength(1);
    expect(removed[0].text).toBe("b");
    expect(removed[0].oldLineNumber).toBe(2);
    expect(removed[0].newLineNumber).toBeNull();
  });

  it("detects a modification (remove + add)", () => {
    const diff = computeLineDiff("hello\nworld", "hello\nearth");
    expect(diff.deletions).toBe(1);
    expect(diff.additions).toBe(1);
    expect(diff.unchanged).toBe(1);
  });

  it("handles empty old text (all additions)", () => {
    const diff = computeLineDiff("", "first\nsecond");
    expect(diff.additions).toBe(2);
    expect(diff.deletions).toBe(0);
  });

  it("handles empty new text (all deletions)", () => {
    const diff = computeLineDiff("first\nsecond", "");
    expect(diff.deletions).toBe(2);
    expect(diff.additions).toBe(0);
  });

  it("handles both texts empty", () => {
    const diff = computeLineDiff("", "");
    expect(diff.additions).toBe(0);
    expect(diff.deletions).toBe(0);
    expect(diff.unchanged).toBe(0);
    expect(diff.lines).toHaveLength(0);
  });

  it("preserves line ordering in result", () => {
    const diff = computeLineDiff("a\nb\nc", "a\nx\nc");
    const kinds = diff.lines.map((l) => l.kind);
    expect(kinds).toEqual(["equal", "remove", "add", "equal"]);
    expect(diff.lines[0].text).toBe("a");
    expect(diff.lines[1].text).toBe("b");
    expect(diff.lines[2].text).toBe("x");
    expect(diff.lines[3].text).toBe("c");
  });

  it("handles multi-line markdown diff", () => {
    const old = `# Title

Some paragraph.

## Section A

Content A.`;
    const updated = `# Title

Some paragraph with edits.

## Section A

Content A.

## Section B

Content B.`;
    const diff = computeLineDiff(old, updated);
    expect(diff.additions).toBeGreaterThan(0);
    expect(diff.deletions).toBeGreaterThanOrEqual(1);
    expect(diff.lines.length).toBeGreaterThan(0);
  });
});

describe("formatDiffSummary", () => {
  it("returns 'No changes' for identical content", () => {
    const diff = computeLineDiff("same", "same");
    expect(formatDiffSummary(diff)).toBe("No changes");
  });

  it("returns correct summary for additions only", () => {
    const diff = computeLineDiff("", "a\nb");
    expect(formatDiffSummary(diff)).toBe("+2 lines changed");
  });

  it("returns correct summary for mixed changes", () => {
    const diff = computeLineDiff("a\nb", "a\nc");
    expect(formatDiffSummary(diff)).toMatch(/\+1 \/ -1/);
  });

  it("uses singular 'line' for a single change", () => {
    const diff = computeLineDiff("a", "a\nb");
    expect(formatDiffSummary(diff)).toBe("+1 line changed");
  });
});
