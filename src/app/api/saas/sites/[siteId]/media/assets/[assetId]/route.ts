import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; assetId: string }> }
) {
  const { siteId, assetId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const body = (await request.json()) as {
    filename?: string;
    folderId?: string | null;
    metadata?: Record<string, unknown>;
  };
  const existing = await prisma.mediaAsset.findFirst({
    where: { id: assetId, siteId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const updated = await prisma.mediaAsset.update({
    where: { id: assetId },
    data: {
      ...(body.filename !== undefined ? { filename: body.filename } : {}),
      ...(body.folderId !== undefined ? { folderId: body.folderId } : {}),
      ...(body.metadata !== undefined ? { metadata: body.metadata as Prisma.InputJsonValue } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; assetId: string }> }
) {
  const { siteId, assetId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const existing = await prisma.mediaAsset.findFirst({
    where: { id: assetId, siteId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  await prisma.mediaAsset.delete({ where: { id: assetId } });
  return NextResponse.json({ ok: true });
}

