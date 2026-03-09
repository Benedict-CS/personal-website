import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const ALLOWED_PAGES = ["home", "contact"] as const;

export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get("page");
  if (!page || !ALLOWED_PAGES.includes(page as (typeof ALLOWED_PAGES)[number])) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }
  try {
    const row = await prisma.sitePageContent.findUnique({
      where: { page },
    });
    return NextResponse.json(row?.content ?? null);
  } catch (e) {
    console.error("Error fetching site content:", e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;
  const body = await request.json();
  const page = body.page as string | undefined;
  const content = body.content;
  if (!page || !ALLOWED_PAGES.includes(page as (typeof ALLOWED_PAGES)[number]) || content === undefined) {
    return NextResponse.json({ error: "Invalid page or content" }, { status: 400 });
  }
  try {
    await prisma.sitePageContent.upsert({
      where: { page },
      create: { page, content: content as object },
      update: { content: content as object },
    });
    await auditLog({
      action: "site_content.update",
      resourceType: "site_page",
      resourceId: page,
      details: JSON.stringify({ keys: Object.keys((content as Record<string, unknown>) ?? {}) }),
      ip: request.headers.get("x-forwarded-for") ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Error updating site content:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
