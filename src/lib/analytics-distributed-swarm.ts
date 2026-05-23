/** Site-wide distributed tag crawl: many unique IPs, one hit each, same minute. */

const SWARM_WINDOW_MS = 120_000;
/** Unique IPs hitting tag pages in the window before we treat new tag hits as swarm noise. */
const SWARM_MIN_UNIQUE_TAG_IPS = 6;

type IngestEvent = { ip: string; path: string; at: number };

const recentEvents: IngestEvent[] = [];

/** Test-only reset for module-global ingest window. */
export function resetDistributedSwarmStateForTests(): void {
  recentEvents.length = 0;
}

function pruneEvents(now: number): void {
  const cutoff = now - SWARM_WINDOW_MS;
  while (recentEvents.length > 0 && recentEvents[0]!.at < cutoff) {
    recentEvents.shift();
  }
}

export function recordAnalyticsIngestEvent(ip: string, path: string, now = Date.now()): void {
  pruneEvents(now);
  recentEvents.push({ ip, path, at: now });
}

/** True when a coordinated tag-enumeration swarm is in progress (one IP per tag page). */
export function isDistributedTagSwarmActive(now = Date.now()): boolean {
  pruneEvents(now);
  const tagEvents = recentEvents.filter((e) => e.path.startsWith("/blog/tag/"));
  const uniqueTagIps = new Set(tagEvents.map((e) => e.ip));
  return uniqueTagIps.size >= SWARM_MIN_UNIQUE_TAG_IPS;
}

/** Skip logging tag-page views while a distributed swarm is active. */
export function shouldSkipDistributedSwarmIngest(path: string, now = Date.now()): boolean {
  if (!path.startsWith("/blog/tag/")) return false;
  return isDistributedTagSwarmActive(now);
}

/** For stats cleanup: IPs that only contributed a single tag hit during a swarm window. */
export function findDistributedSwarmIps(
  rows: { ip: string; path: string; createdAt: Date; durationSeconds: number | null }[]
): string[] {
  const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const flagged = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    const windowStart = sorted[i]!.createdAt.getTime();
    const windowEnd = windowStart + SWARM_WINDOW_MS;
    const inWindow = sorted.filter(
      (r) =>
        r.createdAt.getTime() >= windowStart &&
        r.createdAt.getTime() <= windowEnd &&
        r.path.startsWith("/blog/tag/") &&
        (r.durationSeconds == null || r.durationSeconds === 0)
    );
    const byIp = new Map<string, number>();
    for (const r of inWindow) {
      byIp.set(r.ip, (byIp.get(r.ip) ?? 0) + 1);
    }
    const singleTagIps = [...byIp.entries()].filter(([, c]) => c === 1).map(([ip]) => ip);
    if (singleTagIps.length >= SWARM_MIN_UNIQUE_TAG_IPS) {
      singleTagIps.forEach((ip) => flagged.add(ip));
    }
  }
  return [...flagged];
}
