import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; pageId: string }> }
) {
  const { siteId, pageId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  const page = await prisma.page.findFirst({
    where: { id: pageId, siteId },
    include: {
      versions: { orderBy: { versionNumber: "desc" }, take: 50 },
    },
  });
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  return NextResponse.json(page);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; pageId: string }> }
) {
  const { siteId, pageId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const body = (await request.json()) as {
    title?: string;
    slug?: string;
    seoMetadata?: Record<string, unknown>;
    draftBlocks?: Array<Record<string, unknown>>;
  };

  const existing = await prisma.page.findFirst({
    where: { id: pageId, siteId },
    select: { id: true, title: true, slug: true, seoMetadata: true, draftBlocks: true },
  });
  if (!existing) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const updated = await prisma.page.update({
    where: { id: pageId },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.slug !== undefined ? { slug: body.slug } : {}),
      ...(body.seoMetadata !== undefined ? { seoMetadata: body.seoMetadata as Prisma.InputJsonValue } : {}),
      ...(body.draftBlocks !== undefined ? { draftBlocks: body.draftBlocks as Prisma.InputJsonValue } : {}),
    },
  });

  const latest = await prisma.pageVersion.findFirst({
    where: { pageId },
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
        title: updated.title,
        slug: updated.slug,
        seoMetadata: updated.seoMetadata,
        blocks: updated.draftBlocks,
      } as Prisma.InputJsonValue,
      createdById: tenant.context.userId,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; pageId: string }> }
) {
  const { siteId, pageId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }
  const page = await prisma.page.findFirst({ where: { id: pageId, siteId }, select: { id: true } });
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  await prisma.page.delete({ where: { id: pageId } });
  return NextResponse.json({ ok: true });
}

