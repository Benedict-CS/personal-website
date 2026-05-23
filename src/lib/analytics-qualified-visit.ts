import type { Prisma, PrismaClient } from "@prisma/client";
import { isCvAnalyticsPath } from "@/lib/analytics-noise";

export type VisitorEngagementRow = {
  path: string;
  durationSeconds: number | null;
  referrer: string | null;
};

/**
 * Exclude only homepage bounces with no dwell time (bots, scanners, quick hits).
 * Inner pages and LinkedIn landings (/about, /blog, …) count even without duration —
 * leave beacon often does not fire before the tab closes.
 */
export function isQualifiedPageView(path: string, durationSeconds: number | null | undefined): boolean {
  const p = path.trim() || "/";
  if (p !== "/") return true;
  if (isCvAnalyticsPath(p)) return true;
  return durationSeconds != null && durationSeconds > 0;
}

/** Dashboard: drop "/" rows with null/zero duration only. */
export function prismaWhereQualifiedPageView(): Prisma.PageViewWhereInput {
  return {
    NOT: {
      AND: [
        { path: "/" },
        { OR: [{ durationSeconds: null }, { durationSeconds: 0 }] },
      ],
    },
  };
}

function hasReferrer(referrer: string | null | undefined): boolean {
  return Boolean((referrer || "").trim());
}

function hasDwell(durationSeconds: number | null | undefined): boolean {
  return durationSeconds != null && durationSeconds > 0;
}

/**
 * Single anonymous hits (no referrer, no dwell) — typical distributed tag crawlers
 * that rotate IPs (145.223.x.x, etc.). Keeps LinkedIn/referral traffic and CV downloads.
 */
export function isLowEngagementProbeIp(rows: VisitorEngagementRow[]): boolean {
  if (rows.length === 0) return true;
  if (rows.some((r) => isCvAnalyticsPath(r.path))) return false;
  if (rows.some((r) => hasDwell(r.durationSeconds))) return false;
  if (rows.some((r) => hasReferrer(r.referrer))) return false;
  if (rows.length >= 2) return false;
  return true;
}

/** IPs to hide from visitor stats (one-off bot/tag probes). */
export async function findLowEngagementProbeIps(
  prisma: Pick<PrismaClient, "pageView">,
  scope?: Prisma.PageViewWhereInput
): Promise<string[]> {
  const baseWhere: Prisma.PageViewWhereInput = scope ?? {};
  const groups = await prisma.pageView.groupBy({
    by: ["ip"],
    where: baseWhere,
    _count: { ip: true },
  });
  const out: string[] = [];
  for (const g of groups) {
    if (g._count.ip > 1) continue;
    const rows = await prisma.pageView.findMany({
      where: { AND: [baseWhere, { ip: g.ip }] },
      select: { path: true, durationSeconds: true, referrer: true },
    });
    if (isLowEngagementProbeIp(rows)) out.push(g.ip);
  }
  return out;
}

/** Skip direct /blog/tag/* hits with no referrer (distributed crawlers). */
export function isDirectTagProbePath(path: string, referrer: string | null | undefined): boolean {
  const p = (path.trim() || "/");
  return p.startsWith("/blog/tag/") && !hasReferrer(referrer);
}
