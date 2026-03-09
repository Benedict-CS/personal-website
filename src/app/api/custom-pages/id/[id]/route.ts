import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScheduledPublishAt, setScheduledPublishAt } from "@/lib/custom-page-schedule";
import { auditLog } from "@/lib/audit";

/** PATCH: update custom page (dashboard only) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;
  const { id } = await params;
  const body = await request.json();
  const before = await prisma.customPage.findUnique({
    where: { id },
    select: { slug: true, title: true, order: true, published: true, content: true },
  });
  if (!before) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  const { slug, title, content, order, published, scheduledPublishAt } = body;
  const update: { slug?: string; title?: string; content?: string; order?: number; published?: boolean } = {};
  if (typeof slug === "string") {
    const slugNorm = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (slugNorm) {
      const existing = await prisma.customPage.findFirst({
        where: { slug: slugNorm, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
      }
      update.slug = slugNorm;
    }
  }
  if (typeof title === "string") update.title = title;
  if (typeof content === "string" || scheduledPublishAt !== undefined) {
    const baseContent = typeof content === "string" ? content : before.content;
    const nextSchedule =
      scheduledPublishAt === null
        ? null
        : typeof scheduledPublishAt === "string"
          ? scheduledPublishAt
          : getScheduledPublishAt(before.content);
    update.content = setScheduledPublishAt(baseContent, nextSchedule);
  }
  if (typeof order === "number") update.order = order;
  if (typeof published === "boolean") update.published = published;
  const page = await prisma.customPage.update({
    where: { id },
    data: update,
  });
  await auditLog({
    action: "custom_page.update",
    resourceType: "custom_page",
    resourceId: id,
    details: JSON.stringify({
      slug: page.slug,
      updatedKeys: Object.keys(body ?? {}),
      before: {
        slug: before.slug,
        title: before.title,
        order: before.order,
        published: before.published ?? true,
        scheduledPublishAt: getScheduledPublishAt(before.content),
        contentLength: before.content?.length ?? 0,
      },
      after: {
        slug: page.slug,
        title: page.title,
        order: page.order,
        published: page.published ?? true,
        scheduledPublishAt: getScheduledPublishAt(page.content),
        contentLength: page.content?.length ?? 0,
      },
    }),
    ip: request.headers.get("x-forwarded-for") ?? null,
  });
  return NextResponse.json(page);
}

/** DELETE: remove custom page (dashboard only) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;
  const { id } = await params;
  await prisma.customPage.delete({ where: { id } });
  await auditLog({
    action: "custom_page.delete",
    resourceType: "custom_page",
    resourceId: id,
    details: null,
    ip: _request.headers.get("x-forwarded-for") ?? null,
  });
  return new NextResponse(null, { status: 204 });
}
