import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBuilderAuth } from "@/lib/builder-scope";

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "page";
}

export async function GET(request: NextRequest) {
  const auth = await requireBuilderAuth(request);
  if ("unauthorized" in auth) return auth.unauthorized;
  const { ownerKey, siteScope } = auth.context;

  const pages = await prisma.builderPage.findMany({
    where: { ownerKey, siteScope },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { blocks: true, versions: true },
      },
    },
  });

  return NextResponse.json(
    pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      status: p.status,
      seoMetadata: p.seoMetadata,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      blockCount: p._count.blocks,
      versionCount: p._count.versions,
    }))
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireBuilderAuth(request);
  if ("unauthorized" in auth) return auth.unauthorized;
  const { ownerKey, siteScope } = auth.context;

  const body = (await request.json()) as {
    slug?: string;
    title?: string;
    status?: "draft" | "published" | "archived";
    seoMetadata?: Record<string, unknown>;
    blocks?: Array<{ type: string; content?: unknown; styling?: unknown; visibility?: string }>;
  };

  const title = body.title?.trim() || "Untitled page";
  let slug = normalizeSlug(body.slug || title);
  const status = body.status && ["draft", "published", "archived"].includes(body.status) ? body.status : "draft";

  let suffix = 1;
  while (
    await prisma.builderPage.findFirst({
      where: { ownerKey, siteScope, slug },
      select: { id: true },
    })
  ) {
    slug = `${normalizeSlug(body.slug || title)}-${suffix++}`;
  }

  const page = await prisma.builderPage.create({
    data: {
      ownerKey,
      siteScope,
      slug,
      title,
      status,
      seoMetadata: (body.seoMetadata ?? {}) as Prisma.InputJsonValue,
      blocks: {
        create:
          body.blocks?.map((b, idx) => ({
            type: b.type || "Text",
            content: (b.content ?? {}) as Prisma.InputJsonValue,
            styling: (b.styling ?? {}) as Prisma.InputJsonValue,
            visibility: b.visibility ?? "all",
            order: idx,
          })) ?? [],
      },
    },
    include: {
      blocks: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json(page, { status: 201 });
}

