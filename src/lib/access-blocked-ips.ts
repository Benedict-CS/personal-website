/**
 * Optional IP blocking at the edge (see src/proxy.ts + shouldEnforceAccessBlockIp).
 *
 * **Default (ACCESS_BLOCK_PUBLIC unset / false):** blocked IPs get **403** on `/dashboard`,
 * `/editor`, `/auth`, and most `/api/*` routes — **not** on public HTML (`/`, `/blog`, …) or
 * the small set of GET APIs listed in `shouldEnforceAccessBlockIp`, so the public site still loads.
 *
 * **Strict (ACCESS_BLOCK_PUBLIC=1|true|yes):** blocked IPs get **403 on every path** (except the
 * internal `POST /api/analytics/access-block-log` bypass in `proxy.ts`). No public blog, no analytics views.
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

function isStrictPublicAccessBlock(): boolean {
  const v = (process.env.ACCESS_BLOCK_PUBLIC || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * When `isAccessBlocked` matches, decide whether to return 403 for this request.
 * See file header: default is selective; set `ACCESS_BLOCK_PUBLIC=1` for full-site block.
 */
export function shouldEnforceAccessBlockIp(request: { nextUrl: { pathname: string }; method: string }): boolean {
  if (isStrictPublicAccessBlock()) {
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
