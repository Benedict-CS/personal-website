/**
 * Parse ANALYTICS_EXCLUDED_IPS and normalize for matching.
 * Called per-request so env changes take effect after restart.
 * Supports IPv4-mapped IPv6 (::ffff:140.113.128.3) so exclusion works
 * whether the stored/client IP is "140.113.128.3" or "::ffff:140.113.128.3".
 */

function parseExcludedIPs(): { normalizedSet: Set<string>; forNotIn: string[] } {
  const raw = (process.env.ANALYTICS_EXCLUDED_IPS || "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const normalizedSet = new Set<string>();
  const forNotIn: string[] = [];
  for (const ip of raw) {
    const norm = normalizeIP(ip);
    if (!norm) continue;
    normalizedSet.add(norm);
    forNotIn.push(norm);
    const mapped = `::ffff:${norm}`;
    if (mapped !== norm) forNotIn.push(mapped);
  }
  return { normalizedSet, forNotIn };
}

/** Normalize IP for comparison: strip IPv4-mapped prefix so 140.113.x.x matches ::ffff:140.113.x.x */
export function normalizeIP(ip: string): string {
  if (!ip || ip === "unknown") return ip;
  const s = ip.trim();
  if (s.toLowerCase().startsWith("::ffff:")) return s.slice(7).trim();
  return s;
}

export function isExcludedIP(ip: string): boolean {
  const { normalizedSet } = parseExcludedIPs();
  if (normalizedSet.size === 0) return false;
  return normalizedSet.has(normalizeIP(ip));
}

/** Array to use in Prisma where.ip.notIn so both "140.113.128.3" and "::ffff:140.113.128.3" are excluded */
export function getExcludedIPsForNotIn(): string[] {
  const { forNotIn } = parseExcludedIPs();
  return forNotIn;
}

export function getExcludedIPsSet(): Set<string> {
  const { normalizedSet } = parseExcludedIPs();
  return normalizedSet;
}
