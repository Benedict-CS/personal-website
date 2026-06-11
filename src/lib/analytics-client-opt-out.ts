/**
 * Opt-out of analytics for your own browsing:
 * - localStorage: AnalyticsBeacon skips client POSTs.
 * - Cookie (same name value): proxy middleware skips server-side view logging.
 */

const ANALYTICS_OPT_OUT_STORAGE_KEY = "analytics_exclude_this_browser";

/** Readable by middleware on subsequent requests (not HttpOnly). */
export const ANALYTICS_OPT_OUT_COOKIE_NAME = "analytics_opt_out";

export function isAnalyticsOptedOutInBrowser(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ANALYTICS_OPT_OUT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
