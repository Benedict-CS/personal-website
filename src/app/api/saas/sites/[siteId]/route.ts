import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canManageSite, requireTenantContext } from "@/lib/tenant-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  const site = await prisma.tenantSite.findUnique({
    where: { id: siteId },
    include: {
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
      pages: { orderBy: { updatedAt: "desc" }, take: 10 },
    },
  });
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
  return NextResponse.json(site);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canManageSite(tenant.context.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const body = (await request.json()) as {
    name?: string;
    customDomain?: string | null;
    subdomain?: string | null;
    status?: "DRAFT" | "ACTIVE" | "SUSPENDED";
    themeTokens?: Record<string, unknown>;
    settings?: Record<string, unknown>;
  };

  const updated = await prisma.tenantSite.update({
    where: { id: siteId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.customDomain !== undefined ? { customDomain: body.customDomain || null } : {}),
      ...(body.subdomain !== undefined ? { subdomain: body.subdomain || null } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.themeTokens !== undefined ? { themeTokens: body.themeTokens as Prisma.InputJsonValue } : {}),
      ...(body.settings !== undefined ? { settings: body.settings as Prisma.InputJsonValue } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (tenant.context.role !== "owner") {
    return NextResponse.json({ error: "Only owners can delete site" }, { status: 403 });
  }

  await prisma.tenantSite.delete({ where: { id: siteId } });
  return NextResponse.json({ ok: true });
}

