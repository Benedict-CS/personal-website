import type { Prisma } from "@prisma/client";
import { isbot } from "isbot";

/**
 * Security scans and broken URLs that should not count as real page views.
 * Keep in sync: isJunkAnalyticsPath() for ingest + prismaWhereExcludeNoise() for stats.
 */

const JUNK_PATH_PREFIXES = [
  "/~/",
  "/.env",
  "/app/.env",
  "/laravel/.env",
  "/.git",
  "/.aws",
  "/.s3cfg",
  "/.cursor/",
  "/.openai/",
  "/.anthropic/",
  "/wp-config",
  "/wp-content/",
  "/wp-json/",
  "/phpinfo",
  "/admin/.env",
  "/backend/.env",
  "/aws-credentials",
  "/_debugbar",
  "/debugbar",
] as const;

const JUNK_PATH_EQUALS = [
  "/.s3cfg",
  "/config.json",
  "/config.php",
  "/credentials.json",
  "/secrets.json",
  "/serviceaccountkey.json",
  "/debug",
  "/debug.php",
  "/php.php",
  "/_profiler",
  "/info.php",
  "/test.php",
  "/phpinfo.php",
  "/wp-config.php",
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
  "/config.js",
  "/aws.json",
  "/aws-config.js",
  "/aws.config.js",
  "/api/health",
  "/api/live",
  "/health",
  "/healthz",
  "/readyz",
  "/graphql",
  "/graphiql",
  "/api/graphql",
  "/v1/graphql",
  "/.git/config",
  "/.git/HEAD",
] as const;

/**
 * Allow specific JSON / config paths that legitimately exist (manifest, RSS JSON, etc.).
 * Anything ending with .json/.env outside this whitelist is treated as a probe.
 */
const ALLOWED_NON_HTML_PATHS = new Set<string>([
  "/manifest.json",
  "/feed.json",
  "/rss.json",
  "/site.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
]);

/**
 * Static asset extensions that should never count as page views.
 * Bots forge paths like /chunks/abc.js with random UAs to inflate analytics;
 * real Next.js bundles live under /_next/static and are skipped before this check.
 */
const STATIC_ASSET_EXTENSIONS = [
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".map",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
  ".ico",
  ".bmp",
  ".mp4",
  ".webm",
  ".mp3",
  ".wav",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".7z",
  ".rar",
  ".wasm",
] as const;

/** Substrings that indicate probe paths or malformed chunk URLs */
const JUNK_PATH_CONTAINS = [
  "/chunks/",
  "/static/chunks/",
  "%22/_next",
  "%2f.",
  "..%5c",
  "$(",
  "*",
  "[",
  "]",
  "/:270",
  "/:280",
  "/.env",
  "/.netrc",
  "/.git-credentials",
  "/.gitconfig",
  "/.boto",
  "/.aws/credentials",
  "/.aws/config",
  "/var/task/",
  "/webmin/",
  "/software/",
  "/update.cgi",
  "/next.config.",
  "/nuxt.config.",
  "/package.json",
  "/serverless.",
  "/docker-compose.",
  "/netlify.toml",
  "/terraform.tfstate",
  "/terraform.tfvars",
  "/.terraform",
  "/stripe-keys.json",
  "/stripe-credentials.json",
  "/stripe/webhook_secret.env",
  "/stripe/config.json",
  "/stripe.json",
  "/stripe.env",
  "/stripe.yaml",
  "/stripe.config.",
  "/.well-known/*",
  "/.wp-config.php.swp",
  "/workspaces/",
  "/webhooks/incoming/",
  "/webhook/",
  "/threads/",
  "/teams/",
  "/trpc/",
  "/.netlify/functions/",
  "/.vercel/functions/",
  "/.env.bak",
  "/.env.save",
  "/.env.backup",
  "/opengraph-image",
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
  "semrush",
  "headlesschrome",
  "headless",
  "playwright",
  "puppeteer",
  "selenium",
  "webdriver",
] as const;

function stripQuery(path: string): string {
  const q = path.indexOf("?");
  return q === -1 ? path : path.slice(0, q);
}

function decodePathSafely(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/** Skip logging and middleware analytics for these paths. */
export function isJunkAnalyticsPath(pathname: string): boolean {
  const p = stripQuery(pathname.trim() || "/");
  const decoded = decodePathSafely(p);
  const pl = p.toLowerCase();
  const dl = decoded.toLowerCase();
  // Static asset extensions are never page views — kills forged /chunks/*.js scanners outright.
  for (const ext of STATIC_ASSET_EXTENSIONS) {
    if (pl.endsWith(ext) || dl.endsWith(ext)) return true;
  }
  for (const prefix of JUNK_PATH_PREFIXES) {
    const px = prefix.toLowerCase();
    if (pl.startsWith(px) || dl.startsWith(px)) return true;
  }
  for (const exact of JUNK_PATH_EQUALS) {
    const ex = exact.toLowerCase();
    if (pl === ex || dl === ex) return true;
  }
  for (const sub of JUNK_PATH_CONTAINS) {
    const s = sub.toLowerCase();
    if (p.includes(sub) || pl.includes(s) || decoded.includes(sub) || dl.includes(s)) return true;
  }
  // Generic exploit/probe signatures to avoid one-by-one path whack-a-mole.
  if (dl.includes("/server-status")) return true;
  if (dl.includes("/wp-")) return true;
  if (/(^|\/)[^/]*\.php$/i.test(decoded)) return true;
  if (/(^|\/)php[^/]*\.php$/i.test(decoded)) return true;
  if (/(^|\/)probe\.php$/i.test(decoded)) return true;
  if (/(^|\/)status\.php$/i.test(decoded)) return true;
  if (/(^|\/)test\/phpinfo\.php$/i.test(decoded)) return true;
  // *.json or *.env at any depth → secret/config probe (whitelist legit ones above).
  if ((dl.endsWith(".json") || dl.endsWith(".env")) && !ALLOWED_NON_HTML_PATHS.has(dl)) return true;
  return false;
}

/**
 * Outdated or obviously forged user-agents that real visitors do not have in 2026.
 * Scanners pick from large UA pools; many entries are 5–15 years stale (Firefox 35,
 * iPhone OS 5_1_1, IE/Trident, SymbianOS, BeOS, AppleWebKit/537.36 with no Chrome
 * version). Treat them as scanner traffic.
 */
export function isLikelyOutdatedFakeUserAgent(userAgent: string | null | undefined): boolean {
  const ua = (userAgent || "").trim();
  if (!ua) return false;
  /** Internet Explorer / Trident: dead since 2022, no real visitors today. */
  if (/\bMSIE\b/i.test(ua)) return true;
  if (/\bTrident\//i.test(ua)) return true;
  /** Symbian, BeOS, WPDesktop: ancient mobile/desktop OS. */
  if (/\b(SymbianOS|BeOS|WPDesktop|SonyEricsson|MIDP-)/i.test(ua)) return true;
  /** Old iPhone OS major versions (anything below 13). */
  const iosMatch = ua.match(/iPhone OS (\d+)[_\d]*/i);
  if (iosMatch && Number(iosMatch[1]) < 13) return true;
  const macOsMatch = ua.match(/Mac OS X 10[._](\d+)/i);
  /** macOS 10.10–10.14 are 2014–2018; 2026 visitors are on 13+ (or 10.15 at oldest). */
  if (macOsMatch && Number(macOsMatch[1]) <= 14) return true;
  /** Major-browser version floors. */
  const ffMatch = ua.match(/\bFirefox\/(\d+)/i);
  if (ffMatch && Number(ffMatch[1]) < 90) return true;
  const chromeMatch = ua.match(/\bChrome\/(\d+)/i);
  if (chromeMatch && Number(chromeMatch[1]) < 90) return true;
  /** AppleWebKit/537.36 is Chrome/Edge/Opera baseline; without a Chrome/Edg/OPR token
   *  the UA is truncated/forged (real Chromium always reports its product token). */
  if (/AppleWebKit\/537\.36/i.test(ua) && !/(Chrome|Edg|OPR|SamsungBrowser|Vivaldi|Brave)\//i.test(ua)) {
    return true;
  }
  return false;
}

export function isLikelyScannerUserAgent(userAgent: string | null | undefined): boolean {
  const u = (userAgent || "").toLowerCase();
  if (!u) return false;
  if (isbot(u)) return true;
  return SCANNER_USER_AGENT_MARKERS.some((m) => u.includes(m));
}

/**
 * Monitoring clients and internal health agents that should never count as real traffic.
 */
export function isLikelyMonitoringUserAgent(userAgent: string | null | undefined): boolean {
  const u = (userAgent || "").toLowerCase();
  if (!u) return false;
  return [
    "kube-probe",
    "docker-healthcheck",
    "healthcheck",
    "uptimerobot",
    "statuscake",
    "pingdom",
    "prometheus",
    "curl/",
    "wget/",
  ].some((marker) => u.includes(marker));
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
 * Positive match for junk paths + scanner UAs (same disjuncts as prismaWhereExcludeNoise).
 * Use for deleteMany cleanup; keep aligned with isJunkAnalyticsPath().
 */
export function prismaWhereMatchAnalyticsNoise(): Prisma.PageViewWhereInput {
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
  /**
   * Must mirror generic rules in isJunkAnalyticsPath() — static lists alone miss
   * URL-encoded probes (e.g. /%69%6E%66%6F.%70%68%70) and arbitrary *.php scanners.
   */
  const allowedNonHtml = Array.from(ALLOWED_NON_HTML_PATHS);
  const genericProbeOr: Prisma.PageViewWhereInput[] = [
    { path: { endsWith: ".php", mode: "insensitive" as const } },
    { path: { contains: "server-status", mode: "insensitive" as const } },
    { path: { contains: "/wp-", mode: "insensitive" as const } },
    /** Encoded "php" (common in obfuscated probe URLs). */
    { path: { contains: "%70%68%70", mode: "insensitive" as const } },
    /** Static asset extensions: real /_next paths are excluded by the proxy matcher. */
    ...STATIC_ASSET_EXTENSIONS.map((ext) => ({
      path: { endsWith: ext, mode: "insensitive" as const },
    })),
    /** Secret/config probes: *.env and *.json minus whitelisted paths. */
    {
      AND: [
        { path: { endsWith: ".env", mode: "insensitive" as const } },
        { NOT: { path: { in: allowedNonHtml } } },
      ],
    },
    {
      AND: [
        { path: { endsWith: ".json", mode: "insensitive" as const } },
        { NOT: { path: { in: allowedNonHtml } } },
      ],
    },
  ];
  return { OR: [...pathOr, ...genericProbeOr, ...uaOr] };
}

/**
 * Prisma predicate: rows matching any junk path OR scanner UA are excluded via NOT OR.
 */
export function prismaWhereExcludeNoise(): Prisma.PageViewWhereInput {
  return { NOT: prismaWhereMatchAnalyticsNoise() };
}
