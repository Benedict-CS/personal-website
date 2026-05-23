import type { Prisma } from "@prisma/client";
import { siteUrl } from "@/config/site";

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

/** Hostnames for this site (canonical URL + env overrides). */
export function getAnalyticsSiteHostnames(): string[] {
  const hosts = new Set<string>();
  const add = (raw: string | undefined) => {
    const t = raw?.trim();
    if (!t) return;
    try {
      hosts.add(new URL(t).hostname.toLowerCase());
    } catch {
      // ignore invalid URL
    }
  };
  add(siteUrl);
  add(process.env.NEXT_PUBLIC_SITE_URL);
  add(process.env.NEXTAUTH_URL);
  return [...hosts];
}

/** True when the referrer points at this site (in-site navigation, not an external source). */
export function isSameSiteReferrer(referrer: string | null | undefined): boolean {
  const r = (referrer || "").trim().toLowerCase();
  if (!r) return false;
  return getAnalyticsSiteHostnames().some((h) => h && r.includes(h));
}

/** Referrer stats: only off-site URLs (excludes benedict.winlab.tw → /blog/… self-clicks). */
export function prismaWhereExternalReferrerOnly(): Prisma.PageViewWhereInput {
  const hosts = getAnalyticsSiteHostnames();
  if (hosts.length === 0) {
    return { referrer: { not: null } };
  }
  return {
    AND: [
      { referrer: { not: null } },
      ...hosts.map((h) => ({
        NOT: { referrer: { contains: h, mode: "insensitive" as const } },
      })),
    ],
  };
}

/** Human label for in-site referrers (homepage → blog post, etc.). */
export function formatInternalReferrerLabel(referrer: string): string {
  try {
    const u = new URL(referrer);
    const path = u.pathname || "/";
    if (path === "/" || path === "") return "Homepage";
    if (path.startsWith("/blog/")) {
      const slug = path.replace(/^\/blog\//, "").split("/").filter(Boolean)[0] ?? "";
      if (!slug) return "Blog index";
      return slug.length > 48 ? `Blog · ${slug.slice(0, 48)}…` : `Blog · ${slug}`;
    }
    if (path.startsWith("/about")) return "About page";
    if (path.startsWith("/contact")) return "Contact page";
    return path.length > 40 ? `${path.slice(0, 40)}…` : path;
  } catch {
    return referrer.length > 48 ? `${referrer.slice(0, 48)}…` : referrer;
  }
}

export type ReferrerRow = { referrer: string; count: number };

export type SplitReferrerStats = {
  external: ReferrerRow[];
  internal: { referrer: string; label: string; count: number }[];
  internalTotal: number;
};

/** Split raw referrer groupBy rows into off-site vs on-site navigation. */
export function splitReferrerRows(rows: { referrer: string | null; count: number }[]): SplitReferrerStats {
  const external: ReferrerRow[] = [];
  const internalMap = new Map<string, { referrer: string; label: string; count: number }>();
  for (const row of rows) {
    const ref = (row.referrer || "").trim();
    if (!ref) continue;
    const count = row.count;
    if (isSameSiteReferrer(ref)) {
      const label = formatInternalReferrerLabel(ref);
      const key = label;
      const cur = internalMap.get(key);
      if (cur) {
        cur.count += count;
      } else {
        internalMap.set(key, { referrer: ref, label, count });
      }
    } else {
      external.push({ referrer: ref, count });
    }
  }
  const internal = Array.from(internalMap.values()).sort((a, b) => b.count - a.count);
  const internalTotal = internal.reduce((s, r) => s + r.count, 0);
  external.sort((a, b) => b.count - a.count);
  return { external, internal, internalTotal };
}
