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
    block?: Record<string, unknown>;
    isShared?: boolean;
  };

  const existing = await prisma.builderComponent.findFirst({
    where: { id, ownerKey, siteScope },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Component not found" }, { status: 404 });

  const updated = await prisma.builderComponent.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.block !== undefined ? { block: body.block as Prisma.InputJsonValue } : {}),
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

  const existing = await prisma.builderComponent.findFirst({
    where: { id, ownerKey, siteScope },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Component not found" }, { status: 404 });

  await prisma.builderComponent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

