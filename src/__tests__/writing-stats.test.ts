import {
  countWords,
  computeWritingStats,
  type PostDataForStats,
} from "@/lib/writing-stats";

function makePost(
  content: string,
  createdAt: string,
  tags: string[] = [],
  published = true
): PostDataForStats {
  return {
    content,
    published,
    createdAt,
    tags: tags.map((name) => ({ name })),
  };
}

const NOW = new Date("2026-04-10T12:00:00Z");

describe("countWords", () => {
  it("returns 0 for empty string", () => {
    expect(countWords("")).toBe(0);
  });

  it("counts plain text words", () => {
    expect(countWords("Hello world, this is a test.")).toBe(6);
  });

  it("strips markdown headings, bold, italic", () => {
    expect(countWords("## Heading\n\n**Bold** and *italic* text.")).toBeGreaterThanOrEqual(4);
  });

  it("strips fenced code blocks", () => {
    const md = "Before code\n\n```js\nconst x = 1;\nconst y = 2;\n```\n\nAfter code";
    const count = countWords(md);
    expect(count).toBe(4);
  });

  it("strips images but keeps link text", () => {
    const md = "Check ![alt](img.png) and [this link](url.com) here.";
    expect(countWords(md)).toBeGreaterThanOrEqual(4);
  });
});

describe("computeWritingStats", () => {
  it("returns zeros for empty post array", () => {
    const stats = computeWritingStats([], NOW);
    expect(stats.totalWords).toBe(0);
    expect(stats.avgWordsPerPost).toBe(0);
    expect(stats.avgReadingMinutes).toBe(0);
    expect(stats.topTags).toEqual([]);
    expect(stats.weeklyActivity).toHaveLength(12);
    expect(stats.weeklyActivity.every((w) => w.count === 0)).toBe(true);
  });

  it("computes correct totals for a single post", () => {
    const posts = [makePost("Hello world test content here.", "2026-04-05")];
    const stats = computeWritingStats(posts, NOW);
    expect(stats.totalWords).toBe(5);
    expect(stats.avgWordsPerPost).toBe(5);
    expect(stats.avgReadingMinutes).toBe(1);
    expect(stats.longestPostWords).toBe(5);
    expect(stats.shortestPostWords).toBe(5);
  });

  it("computes longest and shortest correctly", () => {
    const posts = [
      makePost("One two three.", "2026-04-01"),
      makePost("A B C D E F G H I J K L M N O P Q R S T.", "2026-04-02"),
      makePost("Short.", "2026-04-03"),
    ];
    const stats = computeWritingStats(posts, NOW);
    expect(stats.longestPostWords).toBeGreaterThan(stats.shortestPostWords);
    expect(stats.shortestPostWords).toBe(1);
  });

  it("counts posts this month vs last month", () => {
    const posts = [
      makePost("a b c", "2026-04-05"),
      makePost("d e f", "2026-04-08"),
      makePost("g h i", "2026-03-15"),
    ];
    const stats = computeWritingStats(posts, NOW);
    expect(stats.postsThisMonth).toBe(2);
    expect(stats.postsLastMonth).toBe(1);
    expect(stats.monthOverMonthDelta).toBe(100);
  });

  it("computes month-over-month delta correctly when decreasing", () => {
    const posts = [
      makePost("a", "2026-04-01"),
      makePost("b", "2026-03-10"),
      makePost("c", "2026-03-20"),
      makePost("d", "2026-03-25"),
    ];
    const stats = computeWritingStats(posts, NOW);
    expect(stats.postsThisMonth).toBe(1);
    expect(stats.postsLastMonth).toBe(3);
    expect(stats.monthOverMonthDelta).toBe(-67);
  });

  it("handles zero posts last month gracefully", () => {
    const posts = [makePost("hello world", "2026-04-01")];
    const stats = computeWritingStats(posts, NOW);
    expect(stats.postsThisMonth).toBe(1);
    expect(stats.postsLastMonth).toBe(0);
    expect(stats.monthOverMonthDelta).toBe(100);
  });

  it("aggregates tag frequencies and limits to top 8", () => {
    const posts = [
      makePost("a", "2026-04-01", ["Next.js", "React"]),
      makePost("b", "2026-04-02", ["React", "TypeScript"]),
      makePost("c", "2026-04-03", ["React", "Next.js", "Tailwind"]),
    ];
    const stats = computeWritingStats(posts, NOW);
    expect(stats.topTags[0].name).toBe("React");
    expect(stats.topTags[0].count).toBe(3);
    expect(stats.topTags[1].name).toBe("Next.js");
    expect(stats.topTags[1].count).toBe(2);
    expect(stats.topTags.length).toBeLessThanOrEqual(8);
  });

  it("produces 12 weeks of activity data", () => {
    const posts = [makePost("a b c", "2026-04-07")];
    const stats = computeWritingStats(posts, NOW);
    expect(stats.weeklyActivity).toHaveLength(12);
    const activeWeeks = stats.weeklyActivity.filter((w) => w.count > 0);
    expect(activeWeeks.length).toBeGreaterThanOrEqual(1);
  });

  it("weekly activity labels are human-readable", () => {
    const stats = computeWritingStats([], NOW);
    for (const week of stats.weeklyActivity) {
      expect(week.label).toMatch(/^[A-Z][a-z]{2}\s\d{1,2}$/);
    }
  });

  it("handles posts with no tags", () => {
    const posts = [makePost("hello", "2026-04-01", [])];
    const stats = computeWritingStats(posts, NOW);
    expect(stats.topTags).toEqual([]);
  });

  it("avgReadingMinutes is at least 1", () => {
    const posts = [makePost("Hi.", "2026-04-01")];
    const stats = computeWritingStats(posts, NOW);
    expect(stats.avgReadingMinutes).toBeGreaterThanOrEqual(1);
  });
});
