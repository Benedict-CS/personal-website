/**
 * Skip middleware-triggered page-view logging for crawlers and non-page assets.
 * Reduces dashboard noise and avoids extra internal fetch + DB work.
 */

const UA_MARKERS = [
  "ahrefsbot",
  "bingbot",
  "googlebot",
  "google-inspectiontool",
  "gptbot",
  "applebot",
  "petalbot",
  "yandexbot",
  "baiduspider",
  "duckduckbot",
  "facebookexternalhit",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "twitterbot",
  "headlesschrome",
  "semrushbot",
  "mj12bot",
  "dotbot",
  "bytespider",
  "amazonbot",
  "claudebot",
  "anthropic-ai",
  "perplexitybot",
  "crawler",
  "spider",
];

export function shouldSkipMiddlewareAnalytics(pathname: string, userAgent: string | null): boolean {
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next")) return true;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  if (pathname.startsWith("/sitemap") || pathname.startsWith("/feed")) return true;
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return false;
  return UA_MARKERS.some((m) => ua.includes(m));
}
