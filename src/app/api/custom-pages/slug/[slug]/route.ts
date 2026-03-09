import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScheduledPublishAt, isScheduledLive, stripScheduledPublishAt } from "@/lib/custom-page-schedule";

/** GET: fetch one custom page by slug (public, for rendering /page/[slug]) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) return NextResponse.json(null, { status: 404 });
  const auth = await requireSession();
  const isAuthed = !("unauthorized" in auth);
  const now = new Date();
  const page = await prisma.customPage.findFirst({
    where: isAuthed
      ? { slug: slug.toLowerCase().trim() }
      : { slug: slug.toLowerCase().trim() },
  });
  if (!page) return NextResponse.json(null, { status: 404 });
  const live = (page.published ?? true) || isScheduledLive(page.content, now);
  if (!isAuthed && !live) return NextResponse.json(null, { status: 404 });
  return NextResponse.json({
    id: page.id,
    slug: page.slug,
    title: page.title,
    content: stripScheduledPublishAt(page.content),
    scheduledPublishAt: getScheduledPublishAt(page.content),
    effectivePublished: live,
  });
}
