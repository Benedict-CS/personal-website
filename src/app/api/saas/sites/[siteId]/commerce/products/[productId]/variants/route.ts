import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; productId: string }> }
) {
  const { siteId, productId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  const variants = await prisma.productVariant.findMany({
    where: { siteId, productId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(variants);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; productId: string }> }
) {
  const { siteId, productId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, siteId },
    select: { id: true },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const body = (await request.json()) as {
    sku?: string;
    title?: string;
    priceCents?: number;
    stock?: number;
    options?: Record<string, unknown>;
  };
  if (!body.sku?.trim()) return NextResponse.json({ error: "SKU is required" }, { status: 400 });

  const variant = await prisma.productVariant.create({
    data: {
      siteId,
      productId,
      sku: body.sku.trim(),
      title: body.title?.trim() || body.sku.trim(),
      priceCents: Math.max(0, Math.round(body.priceCents ?? 0)),
      stock: Math.max(0, Math.round(body.stock ?? 0)),
      options: (body.options ?? {}) as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json(variant, { status: 201 });
}

