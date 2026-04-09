import type { Prisma } from "@prisma/client";

/**
 * Security scans and broken URLs that should not count as real page views.
 * Keep in sync: isJunkAnalyticsPath() for ingest + prismaWhereExcludeNoise() for stats.
 */

const JUNK_PATH_PREFIXES = [
  "/.env",
  "/.git",
  "/.aws",
  "/.s3cfg",
  "/wp-config",
  "/phpinfo",
  "/admin/.env",
  "/backend/.env",
  "/aws-credentials",
  "/_debugbar",
  "/debugbar",
] as const;

const JUNK_PATH_EQUALS = [
  "/.s3cfg",
  "/debug",
  "/info.php",
  "/test.php",
  "/phpinfo.php",
  "/wp-config.php",
  "/config.js",
  "/aws.json",
  "/aws-config.js",
  "/aws.config.js",
] as const;

/** Substrings that indicate probe paths or malformed chunk URLs */
const JUNK_PATH_CONTAINS = [
  "%22/_next",
  "/.env.bak",
  "/.env.save",
  "/.env.backup",
] as const;

/** Known non-browser / survey UAs (lowercase substrings). */
const SCANNER_USER_AGENT_MARKERS = [
  "netcraftsurvey",
  "netcraft",
  "nuclei",
  "nikto/",
  "acunetix",
  "sqlmap",
  "masscan",
  "zgrab",
  "gobuster",
  "dirbuster",
  "wpscan",
  "httpx/",
] as const;

function stripQuery(path: string): string {
  const q = path.indexOf("?");
  return q === -1 ? path : path.slice(0, q);
}

/** Skip logging and middleware analytics for these paths. */
export function isJunkAnalyticsPath(pathname: string): boolean {
  const p = stripQuery(pathname.trim() || "/");
  const pl = p.toLowerCase();
  for (const prefix of JUNK_PATH_PREFIXES) {
    if (pl.startsWith(prefix.toLowerCase())) return true;
  }
  for (const exact of JUNK_PATH_EQUALS) {
    if (pl === exact.toLowerCase()) return true;
  }
  for (const sub of JUNK_PATH_CONTAINS) {
    if (p.includes(sub) || pl.includes(sub.toLowerCase())) return true;
  }
  return false;
}

export function isLikelyScannerUserAgent(userAgent: string | null | undefined): boolean {
  const u = (userAgent || "").toLowerCase();
  if (!u) return false;
  return SCANNER_USER_AGENT_MARKERS.some((m) => u.includes(m));
}

/** Private IPv4 / localhost stored as IPv4-mapped IPv6 (::ffff:x.x.x.x). */
const IPV4_MAPPED_PRIVATE_PREFIXES: readonly string[] = (() => {
  const out: string[] = ["::ffff:10.", "::ffff:192.168."];
  for (let o = 16; o <= 31; o += 1) {
    out.push(`::ffff:172.${o}.`);
  }
  return out;
})();

/**
 * Omit rows where the client IP is missing (unknown), loopback, or RFC1918 private.
 * Used by dashboard stats so local/dev and misconfigured-proxy traffic does not dominate totals.
 * When the user filters by a specific IP or passes includeDevIps=1, stats skip this predicate.
 */
export function prismaWhereExcludeLocalAndUnknownIp(): Prisma.PageViewWhereInput {
  const not172v4: Prisma.PageViewWhereInput[] = [];
  for (let o = 16; o <= 31; o += 1) {
    not172v4.push({ NOT: { ip: { startsWith: `172.${o}.` } } });
  }
  return {
    AND: [
      { ip: { not: "unknown" } },
      { ip: { not: "127.0.0.1" } },
      { ip: { not: "::1" } },
      { ip: { not: "::ffff:127.0.0.1" } },
      { NOT: { ip: { startsWith: "10." } } },
      { NOT: { ip: { startsWith: "192.168." } } },
      ...IPV4_MAPPED_PRIVATE_PREFIXES.map((p) => ({ NOT: { ip: { startsWith: p } } })),
      ...not172v4,
    ],
  };
}

/**
 * Prisma predicate: rows matching any junk path OR scanner UA are excluded via NOT OR.
 */
export function prismaWhereExcludeNoise(): Prisma.PageViewWhereInput {
  /** Case-insensitive: scanners often vary casing (e.g. `/.ENV`, `/.Git/config`). */
  const pathOr: Prisma.PageViewWhereInput[] = [
    ...JUNK_PATH_PREFIXES.map((prefix) => ({
      path: { startsWith: prefix, mode: "insensitive" as const },
    })),
    ...JUNK_PATH_EQUALS.map((eq) => ({
      path: { equals: eq, mode: "insensitive" as const },
    })),
    ...JUNK_PATH_CONTAINS.map((sub) => ({
      path: { contains: sub, mode: "insensitive" as const },
    })),
  ];
  /**
   * Scanner UA clauses must require a non-null userAgent. In SQL, `col ILIKE '%x%'`
   * is UNKNOWN when col IS NULL; `NOT (false OR UNKNOWN)` filters the row out, which
   * incorrectly dropped all rows with no UA (e.g. CV download logs, legacy rows).
   */
  const uaOr: Prisma.PageViewWhereInput[] = SCANNER_USER_AGENT_MARKERS.map((m) => ({
    AND: [
      { userAgent: { not: null } },
      { userAgent: { contains: m, mode: "insensitive" as const } },
    ],
  }));
  return {
    NOT: {
      OR: [...pathOr, ...uaOr],
    },
  };
}
