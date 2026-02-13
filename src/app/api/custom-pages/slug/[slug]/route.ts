import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET: fetch one custom page by slug (public, for rendering /page/[slug]) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) return NextResponse.json(null, { status: 404 });
  const page = await prisma.customPage.findFirst({
    where: { slug: slug.toLowerCase().trim(), published: true },
  });
  if (!page) return NextResponse.json(null, { status: 404 });
  return NextResponse.json({
    id: page.id,
    slug: page.slug,
    title: page.title,
    content: page.content,
  });
}
