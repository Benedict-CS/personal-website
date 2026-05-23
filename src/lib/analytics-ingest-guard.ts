import { BURST_SCAN_WINDOW_MS } from "@/lib/analytics-noise";
import {
  ipHasAutomatedCrawlSession,
  type CrawlPageViewRow,
} from "@/lib/analytics-automated-crawl";

/** In-memory: block after this many ingest attempts per IP in the micro window. */
const INGEST_MICRO_WINDOW_MS = 10_000;
/** Block on the 4th request within the micro window (3 already recorded). */
const INGEST_MICRO_MAX = 3;

/** In-memory: block after this many ingest attempts per IP in the burst window. */
const INGEST_BURST_MAX = 6;

type IpBucket = { times: number[] };

const buckets = new Map<string, IpBucket>();
const ipChains = new Map<string, Promise<void>>();

function pruneBucket(bucket: IpBucket, now: number): void {
  bucket.times = bucket.times.filter((t) => now - t < BURST_SCAN_WINDOW_MS);
}

/**
 * Serialize analytics ingest per IP within this process so parallel scanner requests
 * cannot all pass burst checks before any row is committed.
 */
export async function withAnalyticsIngestLock<T>(ip: string, fn: () => Promise<T>): Promise<T> {
  const prev = ipChains.get(ip) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  ipChains.set(
    ip,
    prev.then(() => gate)
  );
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (ipChains.get(ip) === gate) ipChains.delete(ip);
  }
}

/** True when this IP is already hot in-process (scanner parallel burst). */
export function isIngestBurstBlocked(ip: string, now = Date.now()): boolean {
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { times: [] };
    buckets.set(ip, bucket);
  }
  pruneBucket(bucket, now);
  const microCount = bucket.times.filter((t) => now - t < INGEST_MICRO_WINDOW_MS).length;
  if (microCount >= INGEST_MICRO_MAX) return true;
  if (bucket.times.length >= INGEST_BURST_MAX) return true;
  bucket.times.push(now);
  return false;
}

/** After insert: drop recent rows when the IP session now matches automated-crawl rules. */
export function shouldRollbackAutomatedSession(rows: CrawlPageViewRow[]): boolean {
  return ipHasAutomatedCrawlSession(rows);
}
