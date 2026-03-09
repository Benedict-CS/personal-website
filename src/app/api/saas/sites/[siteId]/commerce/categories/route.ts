import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "category";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  const categories = await prisma.category.findMany({
    where: { siteId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: true } },
    },
  });
  return NextResponse.json(categories);
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

  const body = (await request.json()) as { name?: string; slug?: string; description?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  const slug = normalizeSlug(body.slug || name);

  const category = await prisma.category.create({
    data: {
      siteId,
      name,
      slug,
      description: body.description ?? null,
    },
  });
  return NextResponse.json(category, { status: 201 });
}

