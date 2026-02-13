import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** PATCH: update custom page (dashboard only) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const { slug, title, content, order, published } = body;
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
  if (typeof content === "string") update.content = content;
  if (typeof order === "number") update.order = order;
  if (typeof published === "boolean") update.published = published;
  const page = await prisma.customPage.update({
    where: { id },
    data: update,
  });
  return NextResponse.json(page);
}

/** DELETE: remove custom page (dashboard only) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.customPage.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
