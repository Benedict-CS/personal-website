import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { countOccurrences, replaceAllInString, snippetAround } from "@/lib/post-content-replace";

const MAX_FIND = 500;
const MAX_REPLACE = 4000;
const MAX_POSTS = 2000;

type Body = {
  mode: "preview" | "apply";
  find: string;
  replace: string;
  matchCase?: boolean;
  postIds?: string[];
};

/**
 * X-factor: bulk literal find/replace across post bodies with preview and safe apply.
 * Degrades gracefully: validation errors return 400; DB errors return 500 without throwing to the client.
 */
export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const find = typeof body.find === "string" ? body.find : "";
  const replace = typeof body.replace === "string" ? body.replace : "";
  const matchCase = body.matchCase === true;
  const mode = body.mode === "apply" ? "apply" : "preview";
  const postIds = Array.isArray(body.postIds)
    ? body.postIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : undefined;

  if (find.length < 2) {
    return NextResponse.json({ error: "Find text must be at least 2 characters" }, { status: 400 });
  }
  if (find.length > MAX_FIND) {
    return NextResponse.json({ error: `Find text must be at most ${MAX_FIND} characters` }, { status: 400 });
  }
  if (replace.length > MAX_REPLACE) {
    return NextResponse.json({ error: `Replace text must be at most ${MAX_REPLACE} characters` }, { status: 400 });
  }

  try {
    const posts = await prisma.post.findMany({
      where: postIds && postIds.length > 0 ? { id: { in: postIds } } : {},
      select: { id: true, title: true, slug: true, content: true },
      take: MAX_POSTS,
      orderBy: { updatedAt: "desc" },
    });

    const matches: Array<{
      postId: string;
      title: string;
      slug: string;
      occurrences: number;
      snippet: string | null;
    }> = [];

    let totalOccurrences = 0;

    for (const p of posts) {
      const n = countOccurrences(p.content, find, matchCase);
      if (n === 0) continue;
      const idx = matchCase ? p.content.indexOf(find) : p.content.toLowerCase().indexOf(find.toLowerCase());
      const snippet = idx >= 0 ? snippetAround(p.content, idx, find.length) : null;
      matches.push({
        postId: p.id,
        title: p.title,
        slug: p.slug,
        occurrences: n,
        snippet,
      });
      totalOccurrences += n;
    }

    if (mode === "preview") {
      return NextResponse.json({
        ok: true,
        mode: "preview",
        totalPostsScanned: posts.length,
        affectedPosts: matches.length,
        totalOccurrences,
        matches,
      });
    }

    // apply
    let updatedPosts = 0;
    const revalidatedSlugs = new Set<string>();
    for (const m of matches) {
      const row = await prisma.post.findUnique({
        where: { id: m.postId },
        select: { id: true, content: true, slug: true },
      });
      if (!row) continue;
      const next = replaceAllInString(row.content, find, replace, matchCase);
      if (next === row.content) continue;
      await prisma.post.update({
        where: { id: row.id },
        data: { content: next },
      });
      updatedPosts++;
      revalidatedSlugs.add(row.slug);
    }

    revalidatePath("/blog");
    revalidatePath("/dashboard/posts");
    for (const s of revalidatedSlugs) {
      revalidatePath(`/blog/${s}`);
    }

    return NextResponse.json({
      ok: true,
      mode: "apply",
      updatedPosts,
      totalOccurrences,
    });
  } catch (e) {
    console.error("content-replace:", e);
    return NextResponse.json(
      { error: "Content replace failed. The database or cache may be temporarily unavailable." },
      { status: 500 }
    );
  }
}
