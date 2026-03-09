import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  const submissions = await prisma.formSubmission.findMany({
    where: { siteId },
    orderBy: { createdAt: "desc" },
    include: { contact: true },
    take: 200,
  });
  return NextResponse.json(submissions);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const site = await prisma.tenantSite.findUnique({ where: { id: siteId }, select: { id: true } });
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const body = (await request.json()) as {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    pageSlug?: string;
    formName?: string;
    payload?: Record<string, unknown>;
  };
  const email = body.email?.trim().toLowerCase();
  let contactId: string | null = null;

  if (email) {
    const contact = await prisma.cRMContact.upsert({
      where: { siteId_email: { siteId, email } },
      update: {
        firstName: body.firstName ?? null,
        lastName: body.lastName ?? null,
        phone: body.phone ?? null,
        source: "form",
      },
      create: {
        siteId,
        email,
        firstName: body.firstName ?? null,
        lastName: body.lastName ?? null,
        phone: body.phone ?? null,
        source: "form",
      },
      select: { id: true },
    });
    contactId = contact.id;
  }

  const submission = await prisma.formSubmission.create({
    data: {
      siteId,
      contactId,
      pageSlug: body.pageSlug ?? null,
      formName: body.formName ?? "contact",
      payload: (body.payload ?? {}) as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json(submission, { status: 201 });
}

