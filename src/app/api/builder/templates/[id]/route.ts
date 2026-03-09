import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBuilderAuth } from "@/lib/builder-scope";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBuilderAuth(request);
  if ("unauthorized" in auth) return auth.unauthorized;
  const { ownerKey, siteScope } = auth.context;
  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    theme?: string;
    brand?: Record<string, unknown>;
    blocks?: unknown[];
    isShared?: boolean;
  };

  const existing = await prisma.builderTemplate.findFirst({
    where: { id, ownerKey, siteScope },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const updated = await prisma.builderTemplate.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.theme !== undefined ? { theme: body.theme } : {}),
      ...(body.brand !== undefined ? { brand: body.brand as Prisma.InputJsonValue } : {}),
      ...(body.blocks !== undefined ? { blocks: body.blocks as Prisma.InputJsonValue } : {}),
      ...(body.isShared !== undefined ? { isShared: !!body.isShared } : {}),
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

  const existing = await prisma.builderTemplate.findFirst({
    where: { id, ownerKey, siteScope },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  await prisma.builderTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

