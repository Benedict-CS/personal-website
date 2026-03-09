import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBuilderAuth } from "@/lib/builder-scope";

export async function GET(request: NextRequest) {
  const auth = await requireBuilderAuth(request);
  if ("unauthorized" in auth) return auth.unauthorized;
  const { ownerKey, siteScope } = auth.context;

  const components = await prisma.builderComponent.findMany({
    where: {
      siteScope,
      OR: [{ ownerKey }, { isShared: true }],
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(components);
}

export async function POST(request: NextRequest) {
  const auth = await requireBuilderAuth(request);
  if ("unauthorized" in auth) return auth.unauthorized;
  const { ownerKey, siteScope } = auth.context;
  const body = (await request.json()) as {
    name?: string;
    block?: Record<string, unknown>;
    isShared?: boolean;
  };

  const component = await prisma.builderComponent.create({
    data: {
      ownerKey,
      siteScope,
      name: body.name?.trim() || "Untitled component",
      block: (body.block ?? {}) as Prisma.InputJsonValue,
      isShared: !!body.isShared,
    },
  });

  return NextResponse.json(component, { status: 201 });
}

