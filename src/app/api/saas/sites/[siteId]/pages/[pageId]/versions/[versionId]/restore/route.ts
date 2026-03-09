import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; pageId: string; versionId: string }> }
) {
  const { siteId, pageId, versionId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const version = await prisma.pageVersion.findFirst({
    where: { id: versionId, siteId, pageId },
  });
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const snapshot = (version.snapshot ?? {}) as Record<string, unknown>;
  const blocks = (snapshot.blocks ?? []) as Prisma.InputJsonValue;
  const title = typeof snapshot.title === "string" ? snapshot.title : undefined;
  const slug = typeof snapshot.slug === "string" ? snapshot.slug : undefined;
  const seoMetadata = (snapshot.seoMetadata ?? {}) as Prisma.InputJsonValue;

  const page = await prisma.page.update({
    where: { id: pageId },
    data: {
      ...(title ? { title } : {}),
      ...(slug ? { slug } : {}),
      draftBlocks: blocks,
      seoMetadata,
      status: "DRAFT",
    },
  });

  const latest = await prisma.pageVersion.findFirst({
    where: { siteId, pageId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  await prisma.pageVersion.create({
    data: {
      siteId,
      pageId,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      status: "DRAFT",
      snapshot: {
        title: page.title,
        slug: page.slug,
        seoMetadata: page.seoMetadata,
        blocks: page.draftBlocks,
        restoredFromVersionId: versionId,
      } as Prisma.InputJsonValue,
      createdById: tenant.context.userId,
    },
  });

  return NextResponse.json(page);
}

