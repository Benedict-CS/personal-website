/**
 * Parse ANALYTICS_EXCLUDED_IPS and normalize for matching.
 * Called per-request so env changes take effect after restart.
 * - Supports IPv4-mapped IPv6 (::ffff:140.113.128.3).
 * - Supports prefix exclusion: e.g. "140.113." excludes all 140.113.x.x (stored or incoming).
 * - DEFAULT_EXCLUDED_IPS are always excluded (e.g. your own IP) even if env is not loaded.
 */
const DEFAULT_EXCLUDED_IPS = ["140.113.128.3", "140.113.194.249"];

function parseExcludedIPs(): {
  normalizedSet: Set<string>;
  forNotIn: string[];
  prefixes: string[];
} {
  const envRaw = (process.env.ANALYTICS_EXCLUDED_IPS || "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const raw = [...new Set([...DEFAULT_EXCLUDED_IPS, ...envRaw])];
  const normalizedSet = new Set<string>();
  const forNotIn: string[] = [];
  const prefixes: string[] = [];
  for (const ip of raw) {
    const norm = normalizeIP(ip);
    if (!norm) continue;
    if (norm.endsWith(".")) {
      prefixes.push(norm);
      continue;
    }
    normalizedSet.add(norm);
    forNotIn.push(norm);
    const mapped = `::ffff:${norm}`;
    if (mapped !== norm) forNotIn.push(mapped);
  }
  return { normalizedSet, forNotIn, prefixes };
}

/** Normalize IP for comparison: strip IPv4-mapped prefix so 140.113.x.x matches ::ffff:140.113.x.x */
export function normalizeIP(ip: string): string {
  if (!ip || ip === "unknown") return ip;
  const s = ip.trim();
  if (s.toLowerCase().startsWith("::ffff:")) return s.slice(7).trim();
  return s;
}

export function isExcludedIP(ip: string): boolean {
  const { normalizedSet, prefixes } = parseExcludedIPs();
  const norm = normalizeIP(ip);
  if (normalizedSet.has(norm)) return true;
  if (prefixes.length && norm !== "unknown")
    return prefixes.some((p) => norm.startsWith(p));
  return false;
}

/** Array to use in Prisma where.ip.notIn (exact match only; use filterByExcludedIP for prefix) */
export function getExcludedIPsForNotIn(): string[] {
  const { forNotIn } = parseExcludedIPs();
  return forNotIn;
}

export function getExcludedIPsSet(): Set<string> {
  const { normalizedSet } = parseExcludedIPs();
  return normalizedSet;
}

/** Prefixes from ANALYTICS_EXCLUDED_IPS (e.g. "140.113.") for DB/stats filtering */
export function getExcludedPrefixes(): string[] {
  const { prefixes } = parseExcludedIPs();
  return prefixes;
}

/** Filter out items whose ip is excluded (exact or prefix). Use after query when prefixes are set. */
export function filterByExcludedIP<T extends { ip: string }>(items: T[]): T[] {
  return items.filter((item) => !isExcludedIP(item.ip));
}
