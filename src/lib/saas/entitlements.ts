import type { SitePlan, Subscription, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { limitsForPlan } from "@/lib/saas/plan-limits";

const ACTIVE_LIKE: SubscriptionStatus[] = ["ACTIVE", "TRIALING", "PAST_DUE"];

/**
 * Primary subscription row for a tenant site (latest by update time).
 * Canceled subscriptions are ignored so entitlements fall back to FREE behavior.
 */
export async function getSiteSubscription(siteId: string): Promise<Subscription | null> {
  return prisma.subscription.findFirst({
    where: { siteId, status: { in: ACTIVE_LIKE } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getEffectivePlanForSite(siteId: string): Promise<SitePlan> {
  const sub = await getSiteSubscription(siteId);
  return sub?.plan ?? "FREE";
}

export type SiteUsageSnapshot = {
  pages: number;
  products: number;
  vectorDocuments: number;
};

export async function getSiteUsage(siteId: string): Promise<SiteUsageSnapshot> {
  const [pages, products, vectorDocuments] = await Promise.all([
    prisma.page.count({ where: { siteId } }),
    prisma.product.count({ where: { siteId } }),
    prisma.vectorDocument.count({ where: { siteId } }),
  ]);
  return { pages, products, vectorDocuments };
}

export async function assertPageCreateAllowed(siteId: string): Promise<
  | { ok: true; plan: SitePlan }
  | { ok: false; status: 403; message: string; plan: SitePlan; limit: number; usage: number }
> {
  const plan = await getEffectivePlanForSite(siteId);
  const limits = limitsForPlan(plan);
  const usage = await prisma.page.count({ where: { siteId } });
  if (usage >= limits.maxPages) {
    return {
      ok: false,
      status: 403,
      message: `Page limit reached for ${plan} plan (${limits.maxPages}). Upgrade billing to add more pages.`,
      plan,
      limit: limits.maxPages,
      usage,
    };
  }
  return { ok: true, plan };
}
