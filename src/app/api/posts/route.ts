import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const published = searchParams.get("published");
    const search = searchParams.get("search"); // 搜尋關鍵字
    const tag = searchParams.get("tag"); // 標籤過濾

    // 建立 where 條件
    const where: any = {};
    
    if (published !== null) {
      where.published = published === "true";
    }

    // 標籤過濾
    if (tag) {
      where.tags = {
        some: {
          slug: tag.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-"),
        },
      };
    }

    // 搜尋：標題、內容、標籤名稱（case-insensitive）
    if (search) {
      const searchTerm = search.trim();
      const orConditions: any[] = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { content: { contains: searchTerm, mode: "insensitive" } },
        {
          tags: {
            some: {
              name: { contains: searchTerm, mode: "insensitive" },
            },
          },
        },
      ];
      // @ts-ignore - description field
      orConditions.push({ description: { contains: searchTerm, mode: "insensitive" } });
      where.OR = orConditions;
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        tags: true,
      },
      orderBy: [
        { pinned: "desc" },
        { createdAt: "desc" },
      ],
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
