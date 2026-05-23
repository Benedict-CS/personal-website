import {
  findDistributedSwarmIps,
  isDistributedTagSwarmActive,
  recordAnalyticsIngestEvent,
  resetDistributedSwarmStateForTests,
  shouldSkipDistributedSwarmIngest,
} from "@/lib/analytics-distributed-swarm";

describe("distributed tag swarm", () => {
  beforeEach(() => {
    resetDistributedSwarmStateForTests();
  });

  it("activates after many unique IPs hit tag pages", () => {
    const t = Date.now();
    for (let i = 0; i < 6; i++) {
      recordAnalyticsIngestEvent(`203.0.113.${i}`, "/blog/tag/foo", t + i * 100);
    }
    expect(isDistributedTagSwarmActive(t + 600)).toBe(true);
    expect(shouldSkipDistributedSwarmIngest("/blog/tag/bar", t + 600)).toBe(true);
    expect(shouldSkipDistributedSwarmIngest("/about", t + 600)).toBe(false);
  });

  it("finds single-hit tag IPs in a swarm window", () => {
    const base = new Date("2026-05-23T03:39:00Z");
    const rows = Array.from({ length: 8 }, (_, i) => ({
      ip: `14.0.0.${i}`,
      path: `/blog/tag/t${i}`,
      createdAt: new Date(base.getTime() + i * 500),
      durationSeconds: null,
    }));
    expect(findDistributedSwarmIps(rows).length).toBe(8);
  });
});
