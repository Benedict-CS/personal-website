import {
  scorePostFreshness,
  computeFreshnessSummary,
  freshnessGradeColor,
  type PostForFreshness,
} from "@/lib/content-freshness";

const NOW = new Date("2026-04-10T12:00:00Z");

function makePost(
  id: string,
  title: string,
  daysAgo: number,
  published = true
): PostForFreshness {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  return {
    id,
    title,
    slug: title.toLowerCase().replace(/\s+/g, "-"),
    published,
    updatedAt: d.toISOString(),
  };
}

describe("scorePostFreshness", () => {
  it("scores a post updated today as 100 / Fresh", () => {
    const post = makePost("1", "New Post", 0);
    const result = scorePostFreshness(post, NOW);
    expect(result.score).toBe(100);
    expect(result.grade).toBe("Fresh");
    expect(result.daysSinceUpdate).toBe(0);
  });

  it("scores a 15-day-old post as Fresh", () => {
    const post = makePost("2", "Recent Post", 15);
    const result = scorePostFreshness(post, NOW);
    expect(result.grade).toBe("Fresh");
    expect(result.score).toBeGreaterThan(90);
  });

  it("scores a 60-day-old post as Current", () => {
    const post = makePost("3", "Two Months Ago", 60);
    const result = scorePostFreshness(post, NOW);
    expect(result.grade).toBe("Current");
    expect(result.score).toBeGreaterThan(70);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("scores a 120-day-old post as Aging", () => {
    const post = makePost("4", "Four Months Ago", 120);
    const result = scorePostFreshness(post, NOW);
    expect(result.grade).toBe("Aging");
    expect(result.score).toBeGreaterThan(50);
    expect(result.score).toBeLessThanOrEqual(80);
  });

  it("scores a 200-day-old post as Stale", () => {
    const post = makePost("5", "Old Post", 200);
    const result = scorePostFreshness(post, NOW);
    expect(result.grade).toBe("Stale");
    expect(result.score).toBeLessThan(50);
  });

  it("scores a 400-day-old post at 0", () => {
    const post = makePost("6", "Ancient Post", 400);
    const result = scorePostFreshness(post, NOW);
    expect(result.score).toBe(0);
    expect(result.grade).toBe("Stale");
  });

  it("score is always between 0 and 100", () => {
    for (const days of [0, 1, 30, 90, 180, 365, 730]) {
      const post = makePost("x", "Test", days);
      const result = scorePostFreshness(post, NOW);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });
});

describe("computeFreshnessSummary", () => {
  it("returns zeros for empty post array", () => {
    const result = computeFreshnessSummary([], NOW);
    expect(result.totalPublished).toBe(0);
    expect(result.freshCount).toBe(0);
    expect(result.currentCount).toBe(0);
    expect(result.agingCount).toBe(0);
    expect(result.staleCount).toBe(0);
    expect(result.averageAge).toBe(0);
    expect(result.stalestPosts).toEqual([]);
  });

  it("excludes unpublished posts", () => {
    const posts = [
      makePost("1", "Draft", 5, false),
      makePost("2", "Published", 10, true),
    ];
    const result = computeFreshnessSummary(posts, NOW);
    expect(result.totalPublished).toBe(1);
  });

  it("correctly distributes grades", () => {
    const posts = [
      makePost("1", "Fresh One", 5),
      makePost("2", "Fresh Two", 20),
      makePost("3", "Current", 60),
      makePost("4", "Aging", 150),
      makePost("5", "Stale", 300),
    ];
    const result = computeFreshnessSummary(posts, NOW);
    expect(result.freshCount).toBe(2);
    expect(result.currentCount).toBe(1);
    expect(result.agingCount).toBe(1);
    expect(result.staleCount).toBe(1);
  });

  it("computes average age correctly", () => {
    const posts = [
      makePost("1", "A", 10),
      makePost("2", "B", 30),
      makePost("3", "C", 50),
    ];
    const result = computeFreshnessSummary(posts, NOW);
    expect(result.averageAge).toBe(30);
  });

  it("returns up to 5 stalest posts sorted by score ascending", () => {
    const posts = Array.from({ length: 10 }, (_, i) =>
      makePost(`${i}`, `Post ${i}`, i * 40)
    );
    const result = computeFreshnessSummary(posts, NOW);
    expect(result.stalestPosts.length).toBe(5);
    for (let i = 1; i < result.stalestPosts.length; i++) {
      expect(result.stalestPosts[i - 1].score).toBeLessThanOrEqual(result.stalestPosts[i].score);
    }
  });

  it("stalest posts are the oldest ones", () => {
    const posts = [
      makePost("1", "New", 5),
      makePost("2", "Old", 300),
      makePost("3", "Ancient", 500),
    ];
    const result = computeFreshnessSummary(posts, NOW);
    expect(result.stalestPosts[0].title).toBe("Ancient");
    expect(result.stalestPosts[1].title).toBe("Old");
  });

  it("handles all posts being Fresh", () => {
    const posts = [
      makePost("1", "A", 1),
      makePost("2", "B", 2),
      makePost("3", "C", 3),
    ];
    const result = computeFreshnessSummary(posts, NOW);
    expect(result.freshCount).toBe(3);
    expect(result.agingCount).toBe(0);
    expect(result.staleCount).toBe(0);
  });
});

describe("freshnessGradeColor", () => {
  it("returns correct colors for all grades", () => {
    expect(freshnessGradeColor("Fresh")).toContain("emerald");
    expect(freshnessGradeColor("Current")).toContain("sky");
    expect(freshnessGradeColor("Aging")).toContain("amber");
    expect(freshnessGradeColor("Stale")).toContain("rose");
  });
});
