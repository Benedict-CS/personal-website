import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  const folderId = request.nextUrl.searchParams.get("folderId");

  const assets = await prisma.mediaAsset.findMany({
    where: { siteId, ...(folderId ? { folderId } : {}) },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(assets);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const body = (await request.json()) as {
    folderId?: string | null;
    filename?: string;
    mimeType?: string;
    sizeBytes?: number;
    width?: number | null;
    height?: number | null;
    storageKey?: string;
    publicUrl?: string;
    metadata?: Record<string, unknown>;
  };

  if (!body.filename || !body.mimeType || !body.storageKey || !body.publicUrl) {
    return NextResponse.json({ error: "Missing required asset fields" }, { status: 400 });
  }

  const created = await prisma.mediaAsset.create({
    data: {
      siteId,
      folderId: body.folderId || null,
      filename: body.filename,
      mimeType: body.mimeType,
      sizeBytes: Math.max(0, body.sizeBytes || 0),
      width: body.width ?? null,
      height: body.height ?? null,
      storageKey: body.storageKey,
      publicUrl: body.publicUrl,
      metadata: (body.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json(created, { status: 201 });
}

