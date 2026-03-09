import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; productId: string }> }
) {
  const { siteId, productId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const body = (await request.json()) as {
    title?: string;
    slug?: string;
    description?: string | null;
    categoryId?: string | null;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    basePriceCents?: number;
    compareAtCents?: number | null;
    totalStock?: number;
    trackInventory?: boolean;
    media?: unknown[];
    attributes?: Record<string, unknown>;
    seoMetadata?: Record<string, unknown>;
  };

  const existing = await prisma.product.findFirst({
    where: { id: productId, siteId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.slug !== undefined ? { slug: body.slug } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.basePriceCents !== undefined ? { basePriceCents: Math.max(0, Math.round(body.basePriceCents)) } : {}),
      ...(body.compareAtCents !== undefined ? { compareAtCents: body.compareAtCents == null ? null : Math.max(0, Math.round(body.compareAtCents)) } : {}),
      ...(body.totalStock !== undefined ? { totalStock: Math.max(0, Math.round(body.totalStock)) } : {}),
      ...(body.trackInventory !== undefined ? { trackInventory: body.trackInventory } : {}),
      ...(body.media !== undefined ? { media: body.media as Prisma.InputJsonValue } : {}),
      ...(body.attributes !== undefined ? { attributes: body.attributes as Prisma.InputJsonValue } : {}),
      ...(body.seoMetadata !== undefined ? { seoMetadata: body.seoMetadata as Prisma.InputJsonValue } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; productId: string }> }
) {
  const { siteId, productId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const existing = await prisma.product.findFirst({
    where: { id: productId, siteId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  await prisma.product.delete({ where: { id: productId } });
  return NextResponse.json({ ok: true });
}

