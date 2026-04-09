import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { BillingProvider, SitePlan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function verifyLemonSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(digest, "utf8"), Buffer.from(signature, "utf8"));
  } catch {
    return false;
  }
}

function mapLemonStatus(value: string): SubscriptionStatus {
  const s = value.toLowerCase();
  if (s.includes("active") || s.includes("on_trial")) return "ACTIVE";
  if (s.includes("past_due")) return "PAST_DUE";
  if (s.includes("cancel") || s.includes("expired")) return "CANCELED";
  return "ACTIVE";
}

function inferPlanFromVariant(variantId: string | undefined): SitePlan {
  const pro = process.env.LEMON_SQUEEZY_VARIANT_ID_PRO?.trim();
  const business = process.env.LEMON_SQUEEZY_VARIANT_ID_BUSINESS?.trim();
  const enterprise = process.env.LEMON_SQUEEZY_VARIANT_ID_ENTERPRISE?.trim();
  if (variantId && pro && variantId === pro) return "PRO";
  if (variantId && business && variantId === business) return "BUSINESS";
  if (variantId && enterprise && variantId === enterprise) return "ENTERPRISE";
  return "PRO";
}

/**
 * Lemon Squeezy webhook: verify X-Signature (HMAC SHA256 hex of raw body) and sync Subscription.
 * Payload shapes vary by event; this handler is defensive and ignores unknown events.
 * @see https://docs.lemonsqueezy.com/help/webhooks/signing-requests
 */
export async function POST(request: NextRequest) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Lemon webhook not configured" }, { status: 501 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");
  if (!verifyLemonSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const meta = (payload.meta as Record<string, unknown> | undefined) ?? {};
  const custom = (meta.custom_data as Record<string, string> | undefined) ?? {};
  const siteId = custom.site_id ?? custom.siteId;

  const data = (payload.data as Record<string, unknown> | undefined) ?? {};
  const attributes = (data.attributes as Record<string, unknown> | undefined) ?? {};

  const variantRaw = attributes.variant_id;
  const variantId =
    typeof variantRaw === "number" ? String(variantRaw) : String(variantRaw ?? "");

  const subRaw = attributes.id ?? attributes.subscription_id;
  const subId = typeof subRaw === "number" ? String(subRaw) : String(subRaw ?? "");

  const customerRaw = attributes.customer_id ?? attributes.user_email;
  const customerId = customerRaw != null ? String(customerRaw) : "";

  const statusRaw = String(attributes.status ?? attributes.state ?? "active");
  const plan = inferPlanFromVariant(variantId || undefined);
  const status = mapLemonStatus(statusRaw);

  if (!siteId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const billingProvider: BillingProvider = "LEMON_SQUEEZY";

  const existing = await prisma.subscription.findFirst({
    where: { siteId: String(siteId) },
    orderBy: { updatedAt: "desc" },
  });

  const updatePayload = {
    billingProvider,
    lemonSubscriptionId: subId || null,
    lemonCustomerId: customerId || null,
    lemonVariantId: variantId || null,
    plan,
    status,
  };

  try {
    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: updatePayload,
      });
    } else {
      const site = await prisma.tenantSite.findUnique({
        where: { id: String(siteId) },
        select: { createdById: true },
      });
      const userId = site?.createdById;
      if (!userId) {
        return NextResponse.json({ error: "Cannot create subscription without site owner" }, { status: 400 });
      }
      await prisma.subscription.create({
        data: {
          userId,
          siteId: String(siteId),
          ...updatePayload,
        },
      });
    }
  } catch (e) {
    console.error("Lemon webhook persistence error:", e);
    return NextResponse.json({ error: "Persist failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
