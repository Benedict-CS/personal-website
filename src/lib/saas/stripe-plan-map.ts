import type { SitePlan, SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

/**
 * Map Stripe Price IDs from env to internal SitePlan. Unmatched prices default to PRO.
 */
export function sitePlanFromStripePriceId(priceId: string | undefined | null): SitePlan {
  if (!priceId) return "FREE";
  const pro = process.env.STRIPE_PRICE_ID_PRO?.trim();
  const business = process.env.STRIPE_PRICE_ID_BUSINESS?.trim();
  const enterprise = process.env.STRIPE_PRICE_ID_ENTERPRISE?.trim();
  if (pro && priceId === pro) return "PRO";
  if (business && priceId === business) return "BUSINESS";
  if (enterprise && priceId === enterprise) return "ENTERPRISE";
  return "PRO";
}

export function subscriptionStatusFromStripe(
  status: Stripe.Subscription.Status
): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "ACTIVE";
  }
}
