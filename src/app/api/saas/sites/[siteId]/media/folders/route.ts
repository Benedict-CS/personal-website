import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";

function buildPath(parentPath: string | null, name: string): string {
  const normalized = name.trim().replace(/\/+/g, "-").replace(/\s+/g, "-").toLowerCase();
  return parentPath ? `${parentPath}/${normalized}` : normalized;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  const folders = await prisma.mediaFolder.findMany({
    where: { siteId },
    orderBy: { path: "asc" },
    include: {
      _count: { select: { assets: true, children: true } },
    },
  });
  return NextResponse.json(folders);
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

  const body = (await request.json()) as { name?: string; parentId?: string | null };
  const name = body.name?.trim() || "new-folder";
  let parentPath: string | null = null;

  if (body.parentId) {
    const parent = await prisma.mediaFolder.findFirst({
      where: { id: body.parentId, siteId },
      select: { path: true },
    });
    if (!parent) return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
    parentPath = parent.path;
  }

  const folder = await prisma.mediaFolder.create({
    data: {
      siteId,
      parentId: body.parentId || null,
      name,
      path: buildPath(parentPath, name),
    },
  });
  return NextResponse.json(folder, { status: 201 });
}

