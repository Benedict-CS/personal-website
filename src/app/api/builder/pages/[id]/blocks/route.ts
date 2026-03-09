import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBuilderAuth } from "@/lib/builder-scope";

type IncomingBlock = {
  id?: string;
  type: string;
  content?: unknown;
  styling?: unknown;
  visibility?: string;
};

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
    select: { id: true },
  });
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const blocks = await prisma.builderBlock.findMany({
    where: { pageId: id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(blocks);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBuilderAuth(request);
  if ("unauthorized" in auth) return auth.unauthorized;
  const { ownerKey, siteScope } = auth.context;
  const { id } = await params;
  const body = (await request.json()) as { blocks?: IncomingBlock[] };
  const incomingBlocks = Array.isArray(body.blocks) ? body.blocks : [];

  const page = await prisma.builderPage.findFirst({
    where: { id, ownerKey, siteScope },
    include: { blocks: true },
  });
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const existingMap = new Map(page.blocks.map((b) => [b.id, b]));
  const keepIds = new Set<string>();

  for (let index = 0; index < incomingBlocks.length; index += 1) {
    const block = incomingBlocks[index];
    if (block.id && existingMap.has(block.id)) {
      keepIds.add(block.id);
      const before = existingMap.get(block.id)!;
      const changed =
        before.type !== block.type ||
        JSON.stringify(before.content) !== JSON.stringify(block.content ?? {}) ||
        JSON.stringify(before.styling) !== JSON.stringify(block.styling ?? {}) ||
        before.visibility !== (block.visibility ?? "all") ||
        before.order !== index;

      if (changed) {
        const maxVersion = await prisma.builderBlockVersion.findFirst({
          where: { blockId: block.id },
          orderBy: { versionNumber: "desc" },
          select: { versionNumber: true },
        });
        await prisma.builderBlockVersion.create({
          data: {
            blockId: block.id,
            versionNumber: (maxVersion?.versionNumber ?? 0) + 1,
            content: before.content as Prisma.InputJsonValue,
            styling: before.styling as Prisma.InputJsonValue,
            createdBy: ownerKey,
          },
        });
      }

      await prisma.builderBlock.update({
        where: { id: block.id },
        data: {
          type: block.type,
          content: (block.content ?? {}) as Prisma.InputJsonValue,
          styling: (block.styling ?? {}) as Prisma.InputJsonValue,
          visibility: block.visibility ?? "all",
          order: index,
        },
      });
    } else {
      const created = await prisma.builderBlock.create({
        data: {
          pageId: id,
          type: block.type,
          content: (block.content ?? {}) as Prisma.InputJsonValue,
          styling: (block.styling ?? {}) as Prisma.InputJsonValue,
          visibility: block.visibility ?? "all",
          order: index,
        },
      });
      keepIds.add(created.id);
    }
  }

  const deleteIds = page.blocks.map((b) => b.id).filter((x) => !keepIds.has(x));
  if (deleteIds.length > 0) {
    await prisma.builderBlock.deleteMany({
      where: { id: { in: deleteIds } },
    });
  }

  const updated = await prisma.builderBlock.findMany({
    where: { pageId: id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(updated);
}

