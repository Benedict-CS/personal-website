import {
  isIngestBurstBlocked,
  withAnalyticsIngestLock,
} from "@/lib/analytics-ingest-guard";

describe("isIngestBurstBlocked", () => {
  it("blocks after four rapid ingest attempts for the same IP", () => {
    const ip = "203.0.113.50";
    expect(isIngestBurstBlocked(ip, 1_000)).toBe(false);
    expect(isIngestBurstBlocked(ip, 1_100)).toBe(false);
    expect(isIngestBurstBlocked(ip, 1_200)).toBe(false);
    expect(isIngestBurstBlocked(ip, 1_300)).toBe(true);
  });
});

describe("withAnalyticsIngestLock", () => {
  it("runs handlers for the same IP sequentially", async () => {
    const ip = "203.0.113.99";
    const order: number[] = [];
    await Promise.all([
      withAnalyticsIngestLock(ip, async () => {
        order.push(1);
        await new Promise((r) => setTimeout(r, 20));
        order.push(2);
      }),
      withAnalyticsIngestLock(ip, async () => {
        order.push(3);
      }),
    ]);
    expect(order).toEqual([1, 2, 3]);
  });
});
