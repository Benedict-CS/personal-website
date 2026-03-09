import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScheduledPublishAt, isScheduledLive, setScheduledPublishAt } from "@/lib/custom-page-schedule";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** GET: list all custom pages (for dashboard); includes published flag */
export async function GET() {
  try {
    const now = new Date();
    const pages = await prisma.customPage.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, slug: true, title: true, content: true, order: true, published: true, updatedAt: true },
    });
    const list = pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      order: p.order,
      published: p.published ?? true,
      scheduledPublishAt: getScheduledPublishAt(p.content),
      effectivePublished: (p.published ?? true) || isScheduledLive(p.content, now),
      updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
    }));
    return NextResponse.json(list);
  } catch {
    return NextResponse.json([]);
  }
}

/** POST: create custom page (dashboard only) */
export async function POST(request: Request) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;
  const body = await request.json();
  const { slug, title, content, order, published, scheduledPublishAt } = body;
  const slugNorm = typeof slug === "string" ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") : "";
  if (!slugNorm || !title) {
    return NextResponse.json(
      { error: "slug and title are required" },
      { status: 400 }
    );
  }
  const existing = await prisma.customPage.findUnique({ where: { slug: slugNorm } });
  if (existing) {
    return NextResponse.json({ error: "A page with this slug already exists" }, { status: 409 });
  }
  const page = await prisma.customPage.create({
    data: {
      slug: slugNorm,
      title: typeof title === "string" ? title : String(title),
      content: setScheduledPublishAt(typeof content === "string" ? content : "", typeof scheduledPublishAt === "string" ? scheduledPublishAt : null),
      order: typeof order === "number" ? order : 0,
      published: typeof published === "boolean" ? published : true,
    },
  });
  await auditLog({
    action: "custom_page.create",
    resourceType: "custom_page",
    resourceId: page.id,
    details: JSON.stringify({ slug: page.slug }),
    ip: request.headers.get("x-forwarded-for") ?? null,
  });
  return NextResponse.json(page);
}
