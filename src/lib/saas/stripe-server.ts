import Stripe from "stripe";

let stripeSingleton: Stripe | null | undefined;

/**
 * Lazily construct Stripe client when STRIPE_SECRET_KEY is set (platform billing).
 */
export function getStripe(): Stripe | null {
  if (stripeSingleton !== undefined) {
    return stripeSingleton;
  }
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    stripeSingleton = null;
    return null;
  }
  stripeSingleton = new Stripe(key);
  return stripeSingleton;
}
