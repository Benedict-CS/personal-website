import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; pageId: string }> }
) {
  const { siteId, pageId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const page = await prisma.page.findFirst({
    where: { id: pageId, siteId },
    select: { id: true, title: true, slug: true, draftBlocks: true, seoMetadata: true },
  });
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const latest = await prisma.pageVersion.findFirst({
    where: { pageId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });

  const updated = await prisma.page.update({
    where: { id: pageId },
    data: {
      status: "PUBLISHED",
      publishedTree: page.draftBlocks as Prisma.InputJsonValue,
      publishedAt: new Date(),
    },
  });

  await prisma.pageVersion.create({
    data: {
      siteId,
      pageId,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      status: "PUBLISHED",
      snapshot: {
        title: page.title,
        slug: page.slug,
        seoMetadata: page.seoMetadata,
        blocks: page.draftBlocks,
      } as Prisma.InputJsonValue,
      createdById: tenant.context.userId,
    },
  });

  return NextResponse.json(updated);
}

