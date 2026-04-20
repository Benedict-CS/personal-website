/**
 * Skip middleware-triggered page-view logging for crawlers and non-page assets.
 * Reduces dashboard noise and avoids extra internal fetch + DB work.
 */

import { isJunkAnalyticsPath, isLikelyScannerUserAgent } from "@/lib/analytics-noise";

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
  "netcraftsurvey",
];

function isLikelyPrefetchRequest(
  headers: Pick<Headers, "get"> | null | undefined
): boolean {
  if (!headers) return false;
  const purpose = (headers.get("purpose") || "").toLowerCase();
  const secPurpose = (headers.get("sec-purpose") || "").toLowerCase();
  const nextPrefetch = headers.get("next-router-prefetch");
  const prefetchHint = (headers.get("x-middleware-prefetch") || "").toLowerCase();
  return (
    purpose.includes("prefetch") ||
    secPurpose.includes("prefetch") ||
    nextPrefetch !== null ||
    prefetchHint === "1"
  );
}

function isLikelyTopLevelDocumentNavigation(
  headers: Pick<Headers, "get"> | null | undefined
): boolean {
  if (!headers) return true;
  const secFetchDest = (headers.get("sec-fetch-dest") || "").toLowerCase();
  const secFetchMode = (headers.get("sec-fetch-mode") || "").toLowerCase();
  const accept = (headers.get("accept") || "").toLowerCase();
  if (accept && !accept.includes("text/html")) return false;
  if (secFetchDest && secFetchDest !== "document") return false;
  if (secFetchMode && secFetchMode !== "navigate") return false;
  return true;
}

export function shouldSkipMiddlewareAnalytics(
  pathname: string,
  userAgent: string | null,
  headers?: Pick<Headers, "get"> | null
): boolean {
  if (headers && !isLikelyTopLevelDocumentNavigation(headers)) return true;
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next")) return true;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  if (pathname === "/apple-touch-icon.png" || pathname === "/apple-touch-icon-precomposed.png") return true;
  if (pathname.startsWith("/sitemap") || pathname.startsWith("/feed")) return true;
  if (isJunkAnalyticsPath(pathname)) return true;
  if (isLikelyPrefetchRequest(headers)) return true;
  if (isLikelyScannerUserAgent(userAgent)) return true;
  const ua = (userAgent || "").toLowerCase();
  if (!ua) return false;
  return UA_MARKERS.some((m) => ua.includes(m));
}
