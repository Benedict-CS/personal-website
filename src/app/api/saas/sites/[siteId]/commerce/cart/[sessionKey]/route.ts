import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCartTotals } from "@/lib/commerce/pricing";
import { requireTenantContext } from "@/lib/tenant-auth";

type CartCommand =
  | { action: "addItem"; productId: string; variantId?: string; quantity?: number }
  | { action: "setQuantity"; itemId: string; quantity: number }
  | { action: "removeItem"; itemId: string }
  | { action: "applyDiscount"; code: string | null }
  | { action: "setShippingZone"; shippingZoneId: string | null };

async function recalculateCart(siteId: string, cartId: string) {
  const cart = await prisma.cart.findFirst({
    where: { id: cartId, siteId },
    include: {
      items: true,
      discountCode: true,
      shippingZone: true,
    },
  });
  if (!cart) return null;
  const subtotal = cart.items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const discount =
    cart.discountCode && cart.discountCode.active
      ? {
          type: cart.discountCode.discountType === "fixed" ? "fixed" as const : "percentage" as const,
          value: cart.discountCode.discountValue,
          minSubtotalCents: cart.discountCode.minSubtotalCents,
        }
      : null;
  const shipping = cart.shippingZone
    ? {
        baseRateCents: cart.shippingZone.baseRateCents,
        freeOverCents: cart.shippingZone.freeOverCents ?? undefined,
      }
    : null;

  const totals = calculateCartTotals({
    subtotalCents: subtotal,
    discount,
    shipping,
    taxRatePercent: 6,
  });

  return prisma.cart.update({
    where: { id: cartId },
    data: {
      subtotalCents: totals.subtotalCents,
      discountCents: totals.discountCents,
      shippingCents: totals.shippingCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
    },
    include: {
      items: true,
      discountCode: true,
      shippingZone: true,
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; sessionKey: string }> }
) {
  const { siteId, sessionKey } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  let cart = await prisma.cart.findUnique({
    where: { siteId_sessionKey: { siteId, sessionKey } },
    include: { items: true, discountCode: true, shippingZone: true },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { siteId, sessionKey, currency: "USD" },
      include: { items: true, discountCode: true, shippingZone: true },
    });
  }

  const updated = await recalculateCart(siteId, cart.id);
  return NextResponse.json(updated ?? cart);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; sessionKey: string }> }
) {
  const { siteId, sessionKey } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  const cmd = (await request.json()) as CartCommand;

  let cart = await prisma.cart.findUnique({
    where: { siteId_sessionKey: { siteId, sessionKey } },
    include: { items: true },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { siteId, sessionKey, currency: "USD" },
      include: { items: true },
    });
  }

  if (cmd.action === "addItem") {
    const product = await prisma.product.findFirst({
      where: { id: cmd.productId, siteId, status: "ACTIVE" },
      select: { id: true, title: true, basePriceCents: true },
    });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    let unitPrice = product.basePriceCents;
    if (cmd.variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: cmd.variantId, siteId, productId: cmd.productId },
        select: { id: true, priceCents: true },
      });
      if (!variant) return NextResponse.json({ error: "Variant not found" }, { status: 404 });
      unitPrice = variant.priceCents;
    }

    const quantity = Math.max(1, Math.round(cmd.quantity ?? 1));
    const existing = await prisma.cartItem.findFirst({
      where: { siteId, cartId: cart.id, productId: cmd.productId, variantId: cmd.variantId || null },
      select: { id: true, quantity: true, unitPriceCents: true },
    });

    if (existing) {
      const nextQty = existing.quantity + quantity;
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: nextQty,
          lineTotalCents: nextQty * existing.unitPriceCents,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          siteId,
          cartId: cart.id,
          productId: product.id,
          variantId: cmd.variantId || null,
          quantity,
          unitPriceCents: unitPrice,
          lineTotalCents: quantity * unitPrice,
        },
      });
    }
  }

  if (cmd.action === "setQuantity") {
    if (cmd.quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: cmd.itemId } }).catch(() => null);
    } else {
      const item = await prisma.cartItem.findFirst({
        where: { id: cmd.itemId, cartId: cart.id, siteId },
        select: { id: true, unitPriceCents: true },
      });
      if (!item) return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
      await prisma.cartItem.update({
        where: { id: item.id },
        data: {
          quantity: Math.round(cmd.quantity),
          lineTotalCents: Math.round(cmd.quantity) * item.unitPriceCents,
        },
      });
    }
  }

  if (cmd.action === "removeItem") {
    await prisma.cartItem.delete({ where: { id: cmd.itemId } }).catch(() => null);
  }

  if (cmd.action === "applyDiscount") {
    if (!cmd.code) {
      await prisma.cart.update({ where: { id: cart.id }, data: { discountCodeId: null } });
    } else {
      const code = await prisma.discountCode.findFirst({
        where: {
          siteId,
          code: cmd.code.trim(),
          active: true,
          OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }],
        },
        select: { id: true },
      });
      if (!code) return NextResponse.json({ error: "Invalid discount code" }, { status: 400 });
      await prisma.cart.update({ where: { id: cart.id }, data: { discountCodeId: code.id } });
    }
  }

  if (cmd.action === "setShippingZone") {
    if (!cmd.shippingZoneId) {
      await prisma.cart.update({ where: { id: cart.id }, data: { shippingZoneId: null } });
    } else {
      const zone = await prisma.shippingZone.findFirst({
        where: { id: cmd.shippingZoneId, siteId },
        select: { id: true },
      });
      if (!zone) return NextResponse.json({ error: "Shipping zone not found" }, { status: 404 });
      await prisma.cart.update({ where: { id: cart.id }, data: { shippingZoneId: zone.id } });
    }
  }

  const updated = await recalculateCart(siteId, cart.id);
  return NextResponse.json(updated);
}

