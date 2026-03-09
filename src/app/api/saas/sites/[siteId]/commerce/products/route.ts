import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "product";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  const products = await prisma.product.findMany({
    where: { siteId },
    include: {
      category: true,
      variants: { orderBy: { updatedAt: "desc" } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return NextResponse.json(products);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const body = (await request.json()) as {
    title?: string;
    slug?: string;
    description?: string;
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

  const title = body.title?.trim() || "Untitled Product";
  let slug = normalizeSlug(body.slug || title);
  let suffix = 1;
  while (await prisma.product.findUnique({ where: { siteId_slug: { siteId, slug } }, select: { id: true } })) {
    slug = `${normalizeSlug(body.slug || title)}-${suffix++}`;
  }

  if (body.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: body.categoryId, siteId },
      select: { id: true },
    });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const product = await prisma.product.create({
    data: {
      siteId,
      title,
      slug,
      description: body.description ?? null,
      categoryId: body.categoryId || null,
      status: body.status ?? "DRAFT",
      basePriceCents: Math.max(0, Math.round(body.basePriceCents ?? 0)),
      compareAtCents: body.compareAtCents != null ? Math.max(0, Math.round(body.compareAtCents)) : null,
      totalStock: Math.max(0, Math.round(body.totalStock ?? 0)),
      trackInventory: body.trackInventory !== false,
      media: (body.media ?? []) as Prisma.InputJsonValue,
      attributes: (body.attributes ?? {}) as Prisma.InputJsonValue,
      seoMetadata: (body.seoMetadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(product, { status: 201 });
}

