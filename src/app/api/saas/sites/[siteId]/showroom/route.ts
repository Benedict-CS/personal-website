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

  const site = await prisma.tenantSite.findUnique({
    where: { id: siteId },
    select: { settings: true },
  });
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
  const settings = (site.settings ?? {}) as Record<string, unknown>;
  return NextResponse.json({
    showroom: settings.showroom ?? { models: [], camera: { x: 0, y: 2.5, z: 7 } },
  });
}

export async function PATCH(
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
    showroom?: {
      models?: Array<{
        id: string;
        url: string;
        x: number;
        y: number;
        z: number;
        rotationY?: number;
        scale?: number;
      }>;
      camera?: { x: number; y: number; z: number };
    };
  };

  const site = await prisma.tenantSite.findUnique({
    where: { id: siteId },
    select: { id: true, settings: true },
  });
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const existing = (site.settings ?? {}) as Record<string, unknown>;
  const merged = {
    ...existing,
    showroom: body.showroom ?? existing.showroom ?? { models: [], camera: { x: 0, y: 2.5, z: 7 } },
  };

  const updated = await prisma.tenantSite.update({
    where: { id: siteId },
    data: {
      settings: merged as Prisma.InputJsonValue,
    },
    select: { settings: true },
  });

  return NextResponse.json({ showroom: (updated.settings as Record<string, unknown>).showroom });
}

