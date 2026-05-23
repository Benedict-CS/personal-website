import {
  ipHasAutomatedCrawlSession,
  isAutomatedCrawlSession,
  maxViewsInSlidingWindow,
  splitIntoBrowsingSessions,
} from "@/lib/analytics-automated-crawl";

function row(path: string, offsetMs: number) {
  return {
    path,
    createdAt: new Date(1_700_000_000_000 + offsetMs),
    durationSeconds: null as number | null,
  };
}

describe("maxViewsInSlidingWindow", () => {
  it("counts views inside a fixed window", () => {
    expect(maxViewsInSlidingWindow([0, 500, 1000, 5000], 1000)).toBe(3);
  });
});

describe("isAutomatedCrawlSession", () => {
  it("flags tag crawl in under 90 seconds (104.252.191.214 pattern)", () => {
    const rows = [
      row("/", 0),
      row("/about", 1000),
      row("/blog", 2000),
      ...Array.from({ length: 19 }, (_, i) => row(`/blog/tag/t${i}`, 3000 + i * 100)),
    ];
    expect(isAutomatedCrawlSession(rows)).toBe(true);
  });

  it("flags micro-burst prefetch (114.43.135.63 pattern)", () => {
    const rows = [
      row("/", 0),
      row("/about", 10),
      row("/blog", 20),
      row("/contact", 30),
      row("/blog/post", 40),
      row("/blog/post", 300_000),
    ];
    expect(isAutomatedCrawlSession(rows)).toBe(true);
  });

  it("does not flag slow human browsing over hours in one session", () => {
    const rows = [
      row("/", 0),
      row("/about", 3_600_000),
      row("/blog", 7_200_000),
      row("/contact", 10_800_000),
    ];
    expect(isAutomatedCrawlSession(rows)).toBe(false);
  });

  it("flags automated sub-session but not slow visits on the same IP later", () => {
    const rows = [
      row("/", 0),
      row("/about", 10),
      row("/blog", 20),
      row("/contact", 30),
      row("/blog/post", 40),
      row("/blog/post", 3_600_000),
      row("/about", 7_200_000),
    ];
    expect(ipHasAutomatedCrawlSession(rows)).toBe(true);
    const [burstSession, slowSession] = splitIntoBrowsingSessions(rows);
    expect(isAutomatedCrawlSession(burstSession!)).toBe(true);
    expect(isAutomatedCrawlSession(slowSession!)).toBe(false);
  });

  it("does not flag a single page view", () => {
    expect(isAutomatedCrawlSession([row("/", 0)])).toBe(false);
  });
});
