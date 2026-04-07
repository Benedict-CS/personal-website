/**
 * Remove sensitive query params from referrers before storing PageView rows
 * (e.g. blog preview URLs include ?token=... which must not live in analytics DB).
 */

const SENSITIVE_QUERY_KEYS = [
  "token",
  "preview_token",
  "previewToken",
  "secret",
  "access_token",
  "code",
  "state",
];

export function sanitizeReferrerForAnalytics(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    for (const k of SENSITIVE_QUERY_KEYS) {
      u.searchParams.delete(k);
    }
    const out = u.toString();
    return out;
  } catch {
    return t
      .replace(/([?&])(token|preview_token|previewToken|secret|access_token|code|state)=[^&#'"]*/gi, "$1")
      .replace(/\?&/, "?")
      .replace(/&&/g, "&")
      .replace(/[?&]$/, "");
  }
}
