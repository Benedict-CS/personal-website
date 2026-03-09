import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBuilderAuth } from "@/lib/builder-scope";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBuilderAuth(request);
  if ("unauthorized" in auth) return auth.unauthorized;
  const { ownerKey, siteScope } = auth.context;
  const { id } = await params;

  const page = await prisma.builderPage.findFirst({
    where: { id, ownerKey, siteScope },
    include: {
      blocks: { orderBy: { order: "asc" } },
      versions: { orderBy: { versionNumber: "desc" }, take: 20 },
    },
  });

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }
  return NextResponse.json(page);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBuilderAuth(request);
  if ("unauthorized" in auth) return auth.unauthorized;
  const { ownerKey, siteScope } = auth.context;
  const { id } = await params;

  const body = (await request.json()) as {
    slug?: string;
    title?: string;
    status?: "draft" | "published" | "archived";
    seoMetadata?: Record<string, unknown>;
  };

  const page = await prisma.builderPage.findFirst({
    where: { id, ownerKey, siteScope },
    include: { blocks: { orderBy: { order: "asc" } } },
  });
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const updated = await prisma.builderPage.update({
    where: { id },
    data: {
      ...(body.slug ? { slug: body.slug } : {}),
      ...(body.title ? { title: body.title } : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(body.seoMetadata ? { seoMetadata: body.seoMetadata as Prisma.InputJsonValue } : {}),
    },
    include: { blocks: { orderBy: { order: "asc" } } },
  });

  const maxVersion = await prisma.builderPageVersion.findFirst({
    where: { pageId: id },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  await prisma.builderPageVersion.create({
    data: {
      pageId: id,
      versionNumber: (maxVersion?.versionNumber ?? 0) + 1,
      createdBy: ownerKey,
      snapshot: {
        title: updated.title,
        slug: updated.slug,
        status: updated.status,
        seoMetadata: updated.seoMetadata,
        blocks: updated.blocks.map((b) => ({
          id: b.id,
          type: b.type,
          content: b.content,
          styling: b.styling,
          order: b.order,
          visibility: b.visibility,
        })),
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBuilderAuth(request);
  if ("unauthorized" in auth) return auth.unauthorized;
  const { ownerKey, siteScope } = auth.context;
  const { id } = await params;

  const page = await prisma.builderPage.findFirst({
    where: { id, ownerKey, siteScope },
    select: { id: true },
  });
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  await prisma.builderPage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

