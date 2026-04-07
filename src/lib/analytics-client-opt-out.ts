/**
 * Opt-out of analytics for your own browsing:
 * - localStorage: AnalyticsBeacon skips client POSTs.
 * - Cookie (same name value): proxy middleware skips server-side view logging.
 */

export const ANALYTICS_OPT_OUT_STORAGE_KEY = "analytics_exclude_this_browser";

/** Readable by middleware on subsequent requests (not HttpOnly). */
export const ANALYTICS_OPT_OUT_COOKIE_NAME = "analytics_opt_out";

const COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60;

export function syncAnalyticsOptOutCookie(optOut: boolean): void {
  if (typeof document === "undefined") return;
  if (optOut) {
    document.cookie = `${ANALYTICS_OPT_OUT_COOKIE_NAME}=1;path=/;max-age=${COOKIE_MAX_AGE_SEC};SameSite=Lax`;
  } else {
    document.cookie = `${ANALYTICS_OPT_OUT_COOKIE_NAME}=;path=/;max-age=0;SameSite=Lax`;
  }
}

export function isAnalyticsOptedOutInBrowser(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ANALYTICS_OPT_OUT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAnalyticsOptOutInBrowser(optOut: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (optOut) {
      window.localStorage.setItem(ANALYTICS_OPT_OUT_STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(ANALYTICS_OPT_OUT_STORAGE_KEY);
    }
  } catch {
    /* private mode / disabled storage */
  }
  syncAnalyticsOptOutCookie(optOut);
}
