import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCustomPagePreviewToken } from "@/lib/custom-page-preview";
import { getScheduledPublishAt, stripScheduledPublishAt } from "@/lib/custom-page-schedule";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const payload = verifyCustomPagePreviewToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });

  const page = await prisma.customPage.findUnique({
    where: { id: payload.id },
    select: { id: true, slug: true, title: true, content: true, updatedAt: true },
  });
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  return NextResponse.json({
    ...page,
    content: stripScheduledPublishAt(page.content),
    scheduledPublishAt: getScheduledPublishAt(page.content),
  });
}

