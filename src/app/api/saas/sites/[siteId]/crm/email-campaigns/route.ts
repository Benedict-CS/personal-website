import { NextRequest, NextResponse } from "next/server";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canWrite, requireTenantContext } from "@/lib/tenant-auth";

async function sendCampaignEmail(to: string, subject: string, html: string) {
  const region = process.env.AWS_REGION || "us-east-1";
  const from = process.env.SES_FROM_EMAIL || "marketing@example.com";
  const ses = new SESClient({ region });
  await ses.send(
    new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Charset: "UTF-8", Data: subject },
        Body: { Html: { Charset: "UTF-8", Data: html } },
      },
      Source: from,
    })
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  const tenant = await requireTenantContext(request, { siteId, allowViewer: true });
  if ("unauthorized" in tenant) return tenant.unauthorized;

  const campaigns = await prisma.emailCampaign.findMany({
    where: { siteId },
    include: { mailingList: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(campaigns);
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
    subject?: string;
    contentHtml?: string;
    blocks?: unknown[];
    mailingListId?: string | null;
    sendNow?: boolean;
  };
  const name = body.name?.trim() || "Untitled campaign";
  const subject = body.subject?.trim() || "Campaign update";
  const contentHtml = body.contentHtml?.trim() || "<p>Hello from your campaign.</p>";

  const created = await prisma.emailCampaign.create({
    data: {
      siteId,
      mailingListId: body.mailingListId || null,
      name,
      subject,
      contentHtml,
      blocks: (body.blocks ?? []) as Prisma.InputJsonValue,
      status: body.sendNow ? "SENDING" : "DRAFT",
    },
  });

  if (!body.sendNow) return NextResponse.json(created, { status: 201 });

  const recipients = body.mailingListId
    ? await prisma.mailingListContact.findMany({
        where: { siteId, mailingListId: body.mailingListId },
        include: { contact: true },
      }).then((rows: Array<{ contact: { email: string } }>) => rows.map((r) => r.contact.email))
    : await prisma.cRMContact.findMany({
        where: { siteId },
        select: { email: true },
      }).then((rows: Array<{ email: string }>) => rows.map((r) => r.email));

  let sent = 0;
  let failed = 0;
  for (const email of recipients) {
    try {
      await sendCampaignEmail(email, subject, contentHtml);
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  const status = failed > 0 && sent === 0 ? "FAILED" : "SENT";
  const updated = await prisma.emailCampaign.update({
    where: { id: created.id },
    data: {
      status,
      sentAt: new Date(),
      metrics: {
        recipients: recipients.length,
        sent,
        failed,
      } as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json(updated, { status: 201 });
}

