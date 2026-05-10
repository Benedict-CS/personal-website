/**
 * Optional IP blocking at the edge (see src/proxy.ts + shouldEnforceAccessBlockIp).
 *
 * **When `ACCESS_BLOCK_IP_PREFIXES` is non-empty:** blocked IPs get **403 on every path** by default
 * (except the internal `POST /api/analytics/access-block-log` bypass in `proxy.ts`), so they cannot
 * load `/`, `/blog`, or hit analytics beacons. Allow exact IPs with `ACCESS_ALLOW_IPS`.
 *
 * **Legacy selective mode:** set `ACCESS_BLOCK_ADMIN_ONLY=1|true|yes` so blocked IPs are only denied on
 * `/dashboard`, `/editor`, `/auth`, and most `/api/*` — public HTML and the small set of public GET APIs
 * in `shouldEnforceAccessBlockIp` still work (old default behavior).
 *
 * **Explicit flags:** `ACCESS_BLOCK_PUBLIC=1|true|yes` forces full-site enforcement even with
 * `ACCESS_BLOCK_ADMIN_ONLY`. `ACCESS_BLOCK_PUBLIC=0|false|no` forces selective enforcement even when
 * prefixes are set.
 *
 * - ACCESS_BLOCK_IP_PREFIXES: comma-separated IPv4 prefixes; use a trailing dot so
 *   e.g. "140.113.194." matches 140.113.194.0–255 only (not 140.113.1949.x).
 * - ACCESS_ALLOW_IPS: exact IPs that may always access the site even if they match a block prefix.
 * Supports IPv4-mapped IPv6 (::ffff:x.x.x.x).
 */

function normalizeIP(ip: string): string {
  if (!ip || ip === "unknown") return ip;
  const s = ip.trim();
  if (s.toLowerCase().startsWith("::ffff:")) return s.slice(7).trim();
  return s;
}

function cleanToken(s: string): string {
  let t = s.trim().replace(/\r$/, "").trim();
  if (
    (t.startsWith('"') && t.endsWith('"') && t.length >= 2) ||
    (t.startsWith("'") && t.endsWith("'") && t.length >= 2)
  ) {
    t = t.slice(1, -1).trim().replace(/\r$/, "").trim();
  }
  return t;
}

function parsePrefixes(): string[] {
  const raw = (process.env.ACCESS_BLOCK_IP_PREFIXES || "")
    .split(/[,\s]+/)
    .map((s) => cleanToken(s))
    .filter(Boolean);
  return raw.map((p) => {
    if (p.endsWith(".")) return p;
    // "140.113.194" -> "140.113.194." for safe prefix match
    if (/^\d{1,3}(\.\d{1,3}){2}$/.test(p)) return `${p}.`;
    return p.endsWith(":") ? p : `${p}.`;
  });
}

function parseAllowSet(): Set<string> {
  const raw = (process.env.ACCESS_ALLOW_IPS || "")
    .split(/[,\s]+/)
    .map((s) => cleanToken(s))
    .filter(Boolean);
  const set = new Set<string>();
  for (const ip of raw) {
    const norm = normalizeIP(ip);
    if (norm && norm !== "unknown") set.add(norm);
  }
  return set;
}

/** True if this client IP matches a block prefix and is not allowlisted (proxy still uses {@link shouldEnforceAccessBlockIp}). */
export function isAccessBlocked(ip: string): boolean {
  const prefixes = parsePrefixes();
  if (prefixes.length === 0) return false;

  const norm = normalizeIP(ip.trim() || "unknown");
  if (!norm || norm === "unknown") return false;

  if (parseAllowSet().has(norm)) return false;

  return prefixes.some((prefix) => norm.startsWith(prefix));
}

function parseExplicitBool(v: string | undefined): boolean | null {
  const s = (v || "").trim().toLowerCase();
  if (s === "1" || s === "true" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "no") return false;
  return null;
}

/** True → 403 blocked IPs on all routes; false → only dashboard/editor/auth and locked-down APIs. */
function isFullSiteAccessBlockEnforced(): boolean {
  const publicFlag = parseExplicitBool(process.env.ACCESS_BLOCK_PUBLIC);
  if (publicFlag === true) return true;
  if (publicFlag === false) return false;

  const adminOnly = parseExplicitBool(process.env.ACCESS_BLOCK_ADMIN_ONLY);
  if (adminOnly === true) return false;

  return parsePrefixes().length > 0;
}

/**
 * When `isAccessBlocked` matches, decide whether to return 403 for this request.
 * See file header: non-empty prefixes imply full-site block unless `ACCESS_BLOCK_ADMIN_ONLY` or
 * `ACCESS_BLOCK_PUBLIC=0`.
 */
export function shouldEnforceAccessBlockIp(request: { nextUrl: { pathname: string }; method: string }): boolean {
  if (isFullSiteAccessBlockEnforced()) {
    return true;
  }

  const p = request.nextUrl.pathname;
  const method = request.method.toUpperCase();

  if (p.startsWith("/dashboard") || p.startsWith("/editor") || p.startsWith("/auth")) {
    return true;
  }

  if (!p.startsWith("/api")) {
    return false;
  }

  if (method !== "GET" && method !== "HEAD") {
    return true;
  }

  if (p === "/api/posts" || p === "/api/tags") return false;
  if (p === "/api/site-config" || p === "/api/site-content") return false;
  if (p === "/api/health" || p === "/api/live" || p === "/api/v1/health") return false;
  if (p.startsWith("/api/custom-pages/slug/")) return false;
  if (p.startsWith("/api/integrations/")) return false;
  if (p.startsWith("/api/media/serve/")) return false;
  if (p === "/api/cv/download") return false;
  if (p === "/api/search") return false;

  return true;
}
