import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getServerSession } from "next-auth";
import { requireSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import { checkRateLimitAsync, getClientIP } from "@/lib/rate-limit";
import { normalizePublicationInput, withPublicationState } from "@/lib/post-publication-state";

function publishedPublicWhere(now: Date): Prisma.PostWhereInput {
  return {
    OR: [{ published: true }, { publishedAt: { lte: now } }],
  };
}

function parseTagConnections(tags: string | undefined) {
  if (!tags) return [];
  return tags
    .split(",")
    .map((tag: string) => tag.trim())
    .filter((tag: string) => tag.length > 0)
    .map((tagName: string) => {
      let cleanedTagName = tagName.trim();
      cleanedTagName = cleanedTagName.replace(/^["']+/, "");
      cleanedTagName = cleanedTagName.replace(/["']+$/, "");
      const tagSlug = cleanedTagName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return {
        where: { slug: tagSlug },
        create: { name: cleanedTagName, slug: tagSlug },
      };
    });
}

function revalidatePublicPostSurfaces(slug: string, tagSlugs: string[]) {
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/blog/archive");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/feed.xml");
  revalidatePath("/sitemap.xml");
  revalidateTag("posts", "max");
  revalidateTag(`post:${slug}`, "max");
  for (const tagSlug of tagSlugs) {
    revalidatePath(`/blog/tag/${tagSlug}`);
    revalidateTag(`tag:${tagSlug}`, "max");
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authed = !!session;

    const searchParams = request.nextUrl.searchParams;
    const published = searchParams.get("published");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");

    const now = new Date();
    const where: Prisma.PostWhereInput = {};
    if (!authed) {
      Object.assign(where, publishedPublicWhere(now));
    } else if (published !== null) {
      if (published === "true") {
        Object.assign(where, publishedPublicWhere(now));
      } else {
        where.published = false;
      }
    }
    if (tag) {
      where.tags = {
        some: {
          slug: tag.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-"),
        },
      };
    }

    // Full-text search: use PostgreSQL FTS + tag match, then merge by relevance
    if (search && search.trim()) {
      const searchTerm = search.trim().replace(/'/g, " ").trim();
      const publishedOnly = !authed || published === "true";

      let ftsIds: string[] = [];
      try {
        const q =
          publishedOnly
            ? Prisma.sql`SELECT id FROM "Post" WHERE (published = true OR ("publishedAt" IS NOT NULL AND "publishedAt" <= now())) AND search_vector @@ plainto_tsquery('english', ${searchTerm}) ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${searchTerm})) DESC`
            : Prisma.sql`SELECT id FROM "Post" WHERE search_vector @@ plainto_tsquery('english', ${searchTerm}) ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${searchTerm})) DESC`;
        const rows = await prisma.$queryRaw<{ id: string }[]>(q);
        ftsIds = rows.map((r) => r.id);
      } catch {
        // search_vector column may not exist yet; fallback to Prisma contains below
      }

      const tagMatchPosts = await prisma.post.findMany({
        where: {
          ...where,
          tags: { some: { name: { contains: search.trim(), mode: "insensitive" } } },
        },
        select: { id: true },
      });
      const tagMatchIds = tagMatchPosts.map((p) => p.id);

      const mergedIds = [...new Set([...ftsIds, ...tagMatchIds])];
      if (mergedIds.length === 0 && ftsIds.length === 0 && tagMatchIds.length === 0) {
        const searchOr = [
          { title: { contains: search.trim(), mode: "insensitive" as const } },
          { content: { contains: search.trim(), mode: "insensitive" as const } },
          { description: { contains: search.trim(), mode: "insensitive" as const } },
          { tags: { some: { name: { contains: search.trim(), mode: "insensitive" as const } } } },
        ];
        const fallbackWhere: Prisma.PostWhereInput = Object.keys(where).length
          ? { AND: [where, { OR: searchOr }] }
          : { OR: searchOr };
        const posts = await prisma.post.findMany({
          where: fallbackWhere,
          include: { tags: true },
          orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        });
        return NextResponse.json(posts.map((post) => withPublicationState(post, now)), { status: 200 });
      }

      const orderMap = new Map(mergedIds.map((id, i) => [id, i]));
      const postWhere: { id: { in: string[] }; tags?: { some: { slug: string } } } = {
        id: { in: mergedIds },
      };
      if (tag) {
        postWhere.tags = {
          some: { slug: tag.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-") },
        };
      }
      const posts = await prisma.post.findMany({
        where: postWhere,
        include: { tags: true },
      });
      posts.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
      return NextResponse.json(posts.map((post) => withPublicationState(post, now)), { status: 200 });
    }

    const posts = await prisma.post.findMany({
      where,
      include: { tags: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(posts.map((post) => withPublicationState(post, now)), { status: 200 });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;
    const ip = getClientIP(request);
    const { ok: allowed, remaining } = await checkRateLimitAsync(ip, "posts_write");
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many post updates. Please try again in a minute." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "Retry-After": "60",
            "Cache-Control": "no-store, private",
          },
        }
      );
    }

    const body = await request.json();
    const { title, slug, content, description, published, publishedAt, tags, category } = body;

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: "Missing required fields: title, slug, content" },
        { status: 400 }
      );
    }

    const tagConnections = parseTagConnections(tags);
    const normalizedPublication = normalizePublicationInput({
      published: typeof published === "boolean" ? published : false,
      publishedAt:
        typeof publishedAt === "string" && publishedAt.trim().length > 0
          ? publishedAt
          : null,
    });

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content,
        description: description || null,
        published: normalizedPublication.published,
        publishedAt: normalizedPublication.publishedAt,
        category: category || null,
        tags: {
          connectOrCreate: tagConnections,
        },
      },
      include: {
        tags: true,
      },
    });

    revalidatePublicPostSurfaces(
      post.slug,
      post.tags.map((tag) => tag.slug)
    );
    await auditLog({
      action: "post.create",
      resourceType: "post",
      resourceId: post.id,
      details: post.slug,
      ip,
    });
    return NextResponse.json(withPublicationState(post), {
      status: 201,
      headers: { "X-RateLimit-Remaining": String(remaining) },
    });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
