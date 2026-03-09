import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBuilderAuth } from "@/lib/builder-scope";

export async function GET(request: NextRequest) {
  const auth = await requireBuilderAuth(request);
  if ("unauthorized" in auth) return auth.unauthorized;
  const { ownerKey, siteScope } = auth.context;

  const templates = await prisma.builderTemplate.findMany({
    where: {
      siteScope,
      OR: [{ ownerKey }, { isShared: true }],
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const auth = await requireBuilderAuth(request);
  if ("unauthorized" in auth) return auth.unauthorized;
  const { ownerKey, siteScope } = auth.context;
  const body = (await request.json()) as {
    name?: string;
    theme?: string;
    brand?: Record<string, unknown>;
    blocks?: unknown[];
    isShared?: boolean;
  };

  const template = await prisma.builderTemplate.create({
    data: {
      ownerKey,
      siteScope,
      name: body.name?.trim() || "Untitled template",
      theme: body.theme?.trim() || "clean",
      brand: (body.brand ?? {}) as Prisma.InputJsonValue,
      blocks: (body.blocks ?? []) as Prisma.InputJsonValue,
      isShared: !!body.isShared,
    },
  });

  return NextResponse.json(template, { status: 201 });
}

