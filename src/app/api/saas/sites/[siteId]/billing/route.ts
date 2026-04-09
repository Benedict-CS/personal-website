import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/tenant-auth";
import { getSiteSubscription, getSiteUsage } from "@/lib/saas/entitlements";
import { limitsForPlan } from "@/lib/saas/plan-limits";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  const sub = await getSiteSubscription(siteId);
  const plan = sub?.plan ?? "FREE";
  const usage = await getSiteUsage(siteId);
  const limits = limitsForPlan(plan);

  return NextResponse.json({
    plan,
    status: sub?.status ?? "TRIALING",
    billingProvider: sub?.billingProvider ?? "NONE",
    stripeCustomerId: sub?.stripeCustomerId ?? null,
    stripeSubscriptionId: sub?.stripeSubscriptionId ?? null,
    lemonCustomerId: sub?.lemonCustomerId ?? null,
    lemonSubscriptionId: sub?.lemonSubscriptionId ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    limits,
    usage,
  });
}
