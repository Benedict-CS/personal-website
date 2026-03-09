import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; folderId: string }> }
) {
  const { siteId, folderId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const body = (await request.json()) as { name?: string };
  const folder = await prisma.mediaFolder.findFirst({
    where: { id: folderId, siteId },
    select: { id: true, parentId: true, path: true },
  });
  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  if (!body.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const parentPath = folder.path.split("/").slice(0, -1).join("/");
  const normalized = body.name.trim().toLowerCase().replace(/\s+/g, "-");
  const nextPath = parentPath ? `${parentPath}/${normalized}` : normalized;

  const updated = await prisma.mediaFolder.update({
    where: { id: folderId },
    data: {
      name: body.name.trim(),
      path: nextPath,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; folderId: string }> }
) {
  const { siteId, folderId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const folder = await prisma.mediaFolder.findFirst({
    where: { id: folderId, siteId },
    select: { id: true },
  });
  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });

  await prisma.mediaFolder.delete({ where: { id: folderId } });
  return NextResponse.json({ ok: true });
}

