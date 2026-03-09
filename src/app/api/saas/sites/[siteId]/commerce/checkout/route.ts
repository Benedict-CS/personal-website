import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant-auth";

function makeOrderNumber(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `ORD-${y}${m}${d}-${rand}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  const body = (await request.json()) as {
    sessionKey?: string;
    customer?: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
    };
    shippingAddress?: Record<string, unknown>;
    billingAddress?: Record<string, unknown>;
    paymentMethod?: string;
    variantId?: string;
  };

  const sessionKey = body.sessionKey?.trim();
  if (!sessionKey) return NextResponse.json({ error: "Missing sessionKey" }, { status: 400 });

  const cart = await prisma.cart.findUnique({
    where: { siteId_sessionKey: { siteId, sessionKey } },
    include: {
      items: true,
      discountCode: true,
      shippingZone: true,
    },
  });
  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const email = body.customer?.email?.trim().toLowerCase();
  let customerId: string | null = null;
  let crmContactId: string | null = null;
  if (email) {
    const customer = await prisma.customer.upsert({
      where: { siteId_email: { siteId, email } },
      update: {
        firstName: body.customer?.firstName || null,
        lastName: body.customer?.lastName || null,
        phone: body.customer?.phone || null,
      },
      create: {
        siteId,
        email,
        firstName: body.customer?.firstName || null,
        lastName: body.customer?.lastName || null,
        phone: body.customer?.phone || null,
      },
    });
    customerId = customer.id;
    const crm = await prisma.cRMContact.upsert({
      where: { siteId_email: { siteId, email } },
      update: {
        firstName: body.customer?.firstName || null,
        lastName: body.customer?.lastName || null,
        phone: body.customer?.phone || null,
        source: "order",
      },
      create: {
        siteId,
        email,
        firstName: body.customer?.firstName || null,
        lastName: body.customer?.lastName || null,
        phone: body.customer?.phone || null,
        source: "order",
      },
      select: { id: true },
    });
    crmContactId = crm.id;
  }

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        siteId,
        customerId,
        orderNumber: makeOrderNumber(),
        status: "PAID",
        fulfillmentStage: "NEW",
        currency: cart.currency,
        subtotalCents: cart.subtotalCents,
        discountCents: cart.discountCents,
        shippingCents: cart.shippingCents,
        taxCents: cart.taxCents,
        totalCents: cart.totalCents,
        discountCodeId: cart.discountCodeId,
        shippingZoneId: cart.shippingZoneId,
        shippingAddress: (body.shippingAddress ?? {}) as Prisma.InputJsonValue,
        billingAddress: (body.billingAddress ?? {}) as Prisma.InputJsonValue,
        payment: {
          provider: "mock_stripe",
          paymentMethod: body.paymentMethod || "card",
          paymentIntentId: `pi_mock_${Date.now()}`,
          status: "succeeded",
        } as Prisma.InputJsonValue,
      },
    });

    for (const item of cart.items) {
      await tx.orderItem.create({
        data: {
          siteId,
          orderId: createdOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          title: "Product",
          sku: null,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          lineTotalCents: item.lineTotalCents,
        },
      });
      await tx.product.update({
        where: { id: item.productId },
        data: {
          totalStock: {
            decrement: item.quantity,
          },
        },
      });
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }
    }

    await tx.cart.update({
      where: { id: cart.id },
      data: {
        checkedOutAt: new Date(),
      },
    });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.formSubmission.create({
      data: {
        siteId,
        contactId: crmContactId,
        pageSlug: "checkout",
        formName: "purchase",
        payload: {
          orderNumber: createdOrder.orderNumber,
          totalCents: createdOrder.totalCents,
          items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        } as Prisma.InputJsonValue,
      },
    });
    if (cart.discountCodeId) {
      await tx.discountCode.update({
        where: { id: cart.discountCodeId },
        data: {
          usedCount: { increment: 1 },
        },
      });
    }
    if (body.variantId) {
      await tx.variantEvent.create({
        data: {
          siteId,
          variantId: body.variantId,
          orderId: createdOrder.id,
          eventType: "purchase",
          valueCents: createdOrder.totalCents,
          metadata: { source: "checkout" },
        },
      });
    }
    return createdOrder;
  });

  return NextResponse.json(
    {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: "succeeded",
    },
    { status: 201 }
  );
}

