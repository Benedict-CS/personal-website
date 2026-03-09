import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  const orders = await prisma.order.findMany({
    where: { siteId },
    include: {
      customer: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(orders);
}

