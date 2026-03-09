import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; orderId: string }> }
) {
  const { siteId, orderId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const body = (await request.json()) as {
    status?: "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELED";
    fulfillmentStage?: "NEW" | "PICKING" | "PACKING" | "SHIPPED" | "DELIVERED";
    notes?: string | null;
  };

  const existing = await prisma.order.findFirst({
    where: { id: orderId, siteId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.fulfillmentStage !== undefined ? { fulfillmentStage: body.fulfillmentStage } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
  });
  return NextResponse.json(updated);
}

