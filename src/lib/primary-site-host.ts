/**
 * Hostname of the main site (blog), for skipping tenant edge lookups on every request.
 */

export function getPrimarySiteHostname(): string | null {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "").trim();
  if (!raw) return null;
  try {
    const url = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    return url.hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

/** True when this request Host is the configured primary site (not a SaaS custom domain). */
export function isPrimarySiteHost(hostHeader: string): boolean {
  const primary = getPrimarySiteHostname();
  if (!primary || !hostHeader.trim()) return false;
  const host = hostHeader.split(":")[0]?.toLowerCase() || "";
  return host === primary;
}
