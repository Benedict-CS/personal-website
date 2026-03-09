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

  const lists = await prisma.mailingList.findMany({
    where: { siteId },
    include: { contacts: { include: { contact: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(lists);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId });
  if ("unauthorized" in tenant) return tenant.unauthorized;
  if (!canWrite(tenant.context.role)) return NextResponse.json({ error: "Insufficient role" }, { status: 403 });

  const body = (await request.json()) as { name?: string; description?: string; contactIds?: string[] };
  if (!body.name?.trim()) return NextResponse.json({ error: "List name is required" }, { status: 400 });

  const list = await prisma.mailingList.create({
    data: {
      siteId,
      name: body.name.trim(),
      description: body.description ?? null,
    },
  });

  if (Array.isArray(body.contactIds) && body.contactIds.length > 0) {
    await prisma.mailingListContact.createMany({
      data: body.contactIds.map((id) => ({
        siteId,
        mailingListId: list.id,
        contactId: id,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json(list, { status: 201 });
}

