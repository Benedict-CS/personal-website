import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  const codes = await prisma.discountCode.findMany({
    where: { siteId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(codes);
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
    code?: string;
    description?: string;
    discountType?: "percentage" | "fixed";
    discountValue?: number;
    minSubtotalCents?: number;
    maxUses?: number;
    startsAt?: string;
    endsAt?: string;
  };
  if (!body.code?.trim()) return NextResponse.json({ error: "Code is required" }, { status: 400 });

  const created = await prisma.discountCode.create({
    data: {
      siteId,
      code: body.code.trim().toUpperCase(),
      description: body.description ?? null,
      discountType: body.discountType ?? "percentage",
      discountValue: Math.max(0, Math.round(body.discountValue ?? 0)),
      minSubtotalCents: Math.max(0, Math.round(body.minSubtotalCents ?? 0)),
      maxUses: body.maxUses != null ? Math.max(1, Math.round(body.maxUses)) : null,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
    },
  });
  return NextResponse.json(created, { status: 201 });
}

