import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/saas/stripe-server";
import { sitePlanFromStripePriceId, subscriptionStatusFromStripe } from "@/lib/saas/stripe-plan-map";

export const dynamic = "force-dynamic";

async function syncSubscriptionFromStripe(stripeSub: Stripe.Subscription) {
  const siteId = stripeSub.metadata?.siteId;
  if (!siteId) {
    return;
  }

  const priceId = stripeSub.items.data[0]?.price?.id ?? null;
  const plan = sitePlanFromStripePriceId(priceId);
  const status = subscriptionStatusFromStripe(stripeSub.status);
  const customerId =
    typeof stripeSub.customer === "string" ? stripeSub.customer : stripeSub.customer?.id ?? null;

  const periodStart = stripeSub.current_period_start
    ? new Date(stripeSub.current_period_start * 1000)
    : null;
  const periodEnd = stripeSub.current_period_end
    ? new Date(stripeSub.current_period_end * 1000)
    : null;

  const existing = await prisma.subscription.findFirst({
    where: { siteId },
    orderBy: { updatedAt: "desc" },
  });

  const data = {
    billingProvider: "STRIPE" as const,
    stripeSubscriptionId: stripeSub.id,
    stripeCustomerId: customerId,
    stripePriceId: priceId,
    plan,
    status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end ?? false,
  };

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data,
    });
  } else {
    const userId = stripeSub.metadata?.userId;
    if (!userId) return;
    await prisma.subscription.create({
      data: {
        userId,
        siteId,
        ...data,
      },
    });
  }
}

/**
 * Stripe webhook: verify signature and apply subscription updates to Prisma.
 * Configure endpoint in Stripe Dashboard with events: checkout.session.completed,
 * customer.subscription.updated, customer.subscription.deleted.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subId) {
          const full = await stripe.subscriptions.retrieve(subId);
          await syncSubscriptionFromStripe(full);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        if (event.type === "customer.subscription.deleted") {
          const siteId = stripeSub.metadata?.siteId;
          if (siteId) {
            await prisma.subscription.updateMany({
              where: { siteId, stripeSubscriptionId: stripeSub.id },
              data: {
                status: "CANCELED",
                cancelAtPeriodEnd: false,
              },
            });
          }
        } else {
          await syncSubscriptionFromStripe(stripeSub);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("Stripe webhook handler error:", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
