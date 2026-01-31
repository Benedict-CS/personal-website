import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const published = searchParams.get("published");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");

    const where: Record<string, unknown> = {};
    if (published !== null) {
      where.published = published === "true";
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
      const publishedOnly = published === "true";

      let ftsIds: string[] = [];
      try {
        const q =
          publishedOnly
            ? Prisma.sql`SELECT id FROM "Post" WHERE published = true AND search_vector @@ plainto_tsquery('english', ${searchTerm}) ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${searchTerm})) DESC`
            : Prisma.sql`SELECT id FROM "Post" WHERE search_vector @@ plainto_tsquery('english', ${searchTerm}) ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${searchTerm})) DESC`;
        const rows = await prisma.$queryRaw<{ id: string }[]>(q);
        ftsIds = rows.map((r) => r.id);
      } catch {
        // search_vector column may not exist yet; fallback to Prisma contains below
      }

      const tagMatchPosts = await prisma.post.findMany({
        where: {
          ...(publishedOnly ? { published: true } : {}),
          ...where,
          tags: { some: { name: { contains: search.trim(), mode: "insensitive" } } },
        },
        select: { id: true },
      });
      const tagMatchIds = tagMatchPosts.map((p) => p.id);

      const mergedIds = [...new Set([...ftsIds, ...tagMatchIds])];
      if (mergedIds.length === 0 && ftsIds.length === 0 && tagMatchIds.length === 0) {
        const fallbackWhere = {
          ...where,
          ...(publishedOnly ? { published: true } : {}),
          OR: [
            { title: { contains: search.trim(), mode: "insensitive" as const } },
            { content: { contains: search.trim(), mode: "insensitive" as const } },
            { description: { contains: search.trim(), mode: "insensitive" as const } },
            { tags: { some: { name: { contains: search.trim(), mode: "insensitive" as const } } } },
          ],
        };
        const posts = await prisma.post.findMany({
          where: fallbackWhere,
          include: { tags: true },
          orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        });
        return NextResponse.json(posts, { status: 200 });
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
      return NextResponse.json(posts, { status: 200 });
    }

    const posts = await prisma.post.findMany({
      where,
      include: { tags: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(posts, { status: 200 });
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
    // 檢查登入狀態
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 解析 request body
    const body = await request.json();
    const { title, slug, content, description, published, tags, category } = body;

    // 驗證必要欄位
    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: "Missing required fields: title, slug, content" },
        { status: 400 }
      );
    }

    // 處理 tags：將逗號分隔的字串轉換為 connectOrCreate 陣列
    const tagConnections = tags
      ? tags
          .split(",")
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag.length > 0)
          .map((tagName: string) => {
            // 去除標籤名稱前後的引號（單引號和雙引號）
            let cleanedTagName = tagName.trim();
            // 去除開頭的引號
            cleanedTagName = cleanedTagName.replace(/^["']+/, "");
            // 去除結尾的引號
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
          })
      : [];

    // 建立新文章
    // @ts-ignore - category and description fields added via migration
    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content,
        // @ts-ignore
        description: description || null,
        published: published ?? false,
        // @ts-ignore
        category: category || null,
        tags: {
          connectOrCreate: tagConnections,
        },
      },
      include: {
        tags: true,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
