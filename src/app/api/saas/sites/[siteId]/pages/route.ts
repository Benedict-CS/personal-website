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
    .replace(/^-|-$/g, "") || "page";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  const pages = await prisma.page.findMany({
    where: { siteId },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      _count: { select: { versions: true, blocks: true } },
    },
  });
  return NextResponse.json(pages);
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
    blocks?: Array<Record<string, unknown>>;
    seoMetadata?: Record<string, unknown>;
  };

  const title = body.title?.trim() || "Untitled page";
  let slug = normalizeSlug(body.slug || title);
  let suffix = 1;
  while (await prisma.page.findUnique({ where: { siteId_slug: { siteId, slug } }, select: { id: true } })) {
    slug = `${normalizeSlug(body.slug || title)}-${suffix++}`;
  }

  const page = await prisma.page.create({
    data: {
      siteId,
      slug,
      title,
      status: "DRAFT",
      seoMetadata: (body.seoMetadata ?? {}) as Prisma.InputJsonValue,
      draftBlocks: (body.blocks ?? []) as Prisma.InputJsonValue,
      publishedTree: [] as Prisma.InputJsonValue,
    },
  });
  await prisma.pageVersion.create({
    data: {
      siteId,
      pageId: page.id,
      versionNumber: 1,
      status: "DRAFT",
      snapshot: {
        title: page.title,
        slug: page.slug,
        blocks: body.blocks ?? [],
        seoMetadata: body.seoMetadata ?? {},
      } as Prisma.InputJsonValue,
      createdById: tenant.context.userId,
    },
  });

  return NextResponse.json(page, { status: 201 });
}

