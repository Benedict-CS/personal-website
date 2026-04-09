import { NextRequest, NextResponse } from "next/server";
import type { SitePlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";
import { getStripe } from "@/lib/saas/stripe-server";

const PAID_PLANS: SitePlan[] = ["PRO", "BUSINESS", "ENTERPRISE"];

function priceIdForPlan(plan: SitePlan): string | undefined {
  switch (plan) {
    case "PRO":
      return process.env.STRIPE_PRICE_ID_PRO?.trim();
    case "BUSINESS":
      return process.env.STRIPE_PRICE_ID_BUSINESS?.trim();
    case "ENTERPRISE":
      return process.env.STRIPE_PRICE_ID_ENTERPRISE?.trim();
    default:
      return undefined;
  }
}

/**
 * Starts a hosted Stripe Checkout session for the given tenant site and target plan.
 * Lemon Squeezy: use POST with provider "lemon_squeezy" when checkout URLs are configured (see docs).
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    siteId?: string;
    targetPlan?: SitePlan;
    provider?: "stripe" | "lemon_squeezy";
  };

  const siteId = body.siteId?.trim();
  const targetPlan = body.targetPlan;
  const provider = body.provider ?? "stripe";

  if (!siteId || !targetPlan || !PAID_PLANS.includes(targetPlan)) {
    return NextResponse.json(
      { error: "siteId and targetPlan (PRO | BUSINESS | ENTERPRISE) are required" },
      { status: 400 }
    );
  }

  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  if (provider === "lemon_squeezy") {
    const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID_PRO?.trim();
    const storeBase = process.env.LEMON_SQUEEZY_CHECKOUT_BASE_URL?.trim();
    if (!variantId || !storeBase) {
      return NextResponse.json(
        {
          error: "Lemon Squeezy is not configured",
          hint: "Set LEMON_SQUEEZY_VARIANT_ID_PRO and LEMON_SQUEEZY_CHECKOUT_BASE_URL",
        },
        { status: 501 }
      );
    }
    const checkoutUrl = `${storeBase.replace(/\/$/, "")}/checkout/buy/${variantId}?checkout[custom][site_id]=${encodeURIComponent(siteId)}`;
    return NextResponse.json({ provider: "lemon_squeezy", url: checkoutUrl });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured", hint: "Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_*" },
      { status: 501 }
    );
  }

  const priceId = priceIdForPlan(targetPlan);
  if (!priceId) {
    return NextResponse.json(
      { error: `Missing STRIPE_PRICE_ID for plan ${targetPlan}` },
      { status: 501 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";

  const sub = await prisma.subscription.findFirst({
    where: { siteId },
    orderBy: { updatedAt: "desc" },
  });

  let customerId = sub?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const user = await prisma.user.findUnique({
      where: { id: tenant.context.userId },
      select: { email: true },
    });
    const customer = await stripe.customers.create({
      email: user?.email ?? undefined,
      metadata: { siteId, userId: tenant.context.userId },
    });
    customerId = customer.id;
    if (sub) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { stripeCustomerId: customerId, billingProvider: "STRIPE" },
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId: tenant.context.userId,
          siteId,
          plan: "FREE",
          status: "TRIALING",
          stripeCustomerId: customerId,
          billingProvider: "STRIPE",
        },
      });
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard/sites/${siteId}/billing?checkout=success`,
    cancel_url: `${baseUrl}/dashboard/sites/${siteId}/billing?checkout=cancel`,
    metadata: {
      siteId,
      userId: tenant.context.userId,
      targetPlan,
    },
    subscription_data: {
      metadata: { siteId, userId: tenant.context.userId },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
  }

  return NextResponse.json({ provider: "stripe", url: session.url, id: session.id });
}
