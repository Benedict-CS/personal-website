import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canManageSite, requireTenantContext } from "@/lib/tenant-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canManageSite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const products = await prisma.product.findMany({
    where: { siteId },
    select: { id: true, title: true, description: true },
  });

  await prisma.vectorDocument.deleteMany({ where: { siteId, sourceType: "product" } });
  for (const p of products) {
    await prisma.vectorDocument.create({
      data: {
        siteId,
        namespace: "knowledge",
        sourceType: "product",
        sourceId: p.id,
        content: `${p.title}\n${p.description ?? ""}`,
        metadata: { title: p.title } as Prisma.InputJsonValue,
      },
    });
  }

  return NextResponse.json({ indexed: products.length });
}

