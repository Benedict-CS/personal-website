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

  const zones = await prisma.shippingZone.findMany({
    where: { siteId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(zones);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) return NextResponse.json({ error: "Insufficient role" }, { status: 403 });

  const body = (await request.json()) as {
    name?: string;
    countries?: string[];
    baseRateCents?: number;
    freeOverCents?: number | null;
    estimatedDaysMin?: number | null;
    estimatedDaysMax?: number | null;
  };
  if (!body.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const zone = await prisma.shippingZone.create({
    data: {
      siteId,
      name: body.name.trim(),
      countries: (body.countries ?? []) as Prisma.InputJsonValue,
      baseRateCents: Math.max(0, Math.round(body.baseRateCents ?? 0)),
      freeOverCents: body.freeOverCents != null ? Math.max(0, Math.round(body.freeOverCents)) : null,
      estimatedDaysMin: body.estimatedDaysMin != null ? Math.max(0, Math.round(body.estimatedDaysMin)) : null,
      estimatedDaysMax: body.estimatedDaysMax != null ? Math.max(0, Math.round(body.estimatedDaysMax)) : null,
    },
  });
  return NextResponse.json(zone, { status: 201 });
}

