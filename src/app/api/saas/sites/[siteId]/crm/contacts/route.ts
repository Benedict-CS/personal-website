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

  const contacts = await prisma.cRMContact.findMany({
    where: { siteId },
    orderBy: { updatedAt: "desc" },
    include: { submissions: true },
  });
  return NextResponse.json(contacts);
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
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    source?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  };
  const email = body.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const contact = await prisma.cRMContact.upsert({
    where: { siteId_email: { siteId, email } },
    update: {
      firstName: body.firstName ?? null,
      lastName: body.lastName ?? null,
      phone: body.phone ?? null,
      source: body.source ?? "form",
      tags: (body.tags ?? []) as Prisma.InputJsonValue,
      metadata: (body.metadata ?? {}) as Prisma.InputJsonValue,
    },
    create: {
      siteId,
      email,
      firstName: body.firstName ?? null,
      lastName: body.lastName ?? null,
      phone: body.phone ?? null,
      source: body.source ?? "form",
      tags: (body.tags ?? []) as Prisma.InputJsonValue,
      metadata: (body.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json(contact, { status: 201 });
}

