import { prisma } from "@/lib/prisma";

/** Reserved first segment after /blog/ — not a post slug. */
const BLOG_RESERVED_SEGMENTS = new Set(["preview", "archive", "tag"]);

/**
 * Return post slug if pathname is a single-segment public blog article URL, else null.
 * Excludes /blog/preview, /blog/archive, /blog/tag/...
 */
export function getBlogPostSlugFromPath(pathname: string): string | null {
  if (!pathname.startsWith("/blog/")) return null;
  const slug = pathname.slice(6);
  if (!slug || slug.includes("/")) return null;
  if (BLOG_RESERVED_SEGMENTS.has(slug)) return null;
  return slug;
}

/** Increment stored view count when a published (or scheduled-live) post is viewed. */
export async function incrementPublishedPostViewCount(slug: string): Promise<void> {
  const now = new Date();
  const post = await prisma.post.findFirst({
    where: {
      slug,
      OR: [{ published: true }, { publishedAt: { lte: now } }],
    },
    select: { id: true },
  });
  if (!post) return;
  await prisma.post.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  });
}
