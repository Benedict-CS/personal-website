import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { getClientIP } from "@/lib/rate-limit";

type ExportPost = {
  title: string;
  slug: string;
  content: string;
  description?: string | null;
  published?: boolean;
  pinned?: boolean;
  tags?: string[];
};

type ExportPage = {
  slug: string;
  title: string;
  content?: string;
  order?: number;
  published?: boolean;
};

/**
 * POST /api/import — import posts (and optionally custom pages) from JSON (auth required).
 * Body: { posts?: ExportPost[], customPages?: ExportPage[] }
 * Creates posts and pages; tags are connectOrCreate by name.
 */
export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  try {
    const body = await request.json();
    const postsInput = Array.isArray(body.posts) ? body.posts : [];
    const pagesInput = Array.isArray(body.customPages) ? body.customPages : [];

    const created: { posts: number; pages: number; errors: string[] } = {
      posts: 0,
      pages: 0,
      errors: [],
    };

    for (const p of postsInput) {
      if (!p?.title || !p?.slug) {
        created.errors.push(`Post missing title/slug: ${JSON.stringify(p)}`);
        continue;
      }
      const slug = String(p.slug).trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-");
      if (!slug) {
        created.errors.push(`Invalid slug for: ${p.title}`);
        continue;
      }
      try {
        const tagConnections = (Array.isArray(p.tags) ? p.tags : [])
          .map((t: string) => String(t).trim())
          .filter(Boolean)
          .map((tagName: string) => {
            const tagSlug = tagName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
            return { where: { slug: tagSlug }, create: { name: tagName, slug: tagSlug } };
          });
        await prisma.post.create({
          data: {
            title: p.title,
            slug,
            content: p.content ?? "",
            description: p.description ?? null,
            published: Boolean(p.published),
            pinned: Boolean(p.pinned),
            tags: { connectOrCreate: tagConnections },
          },
        });
        created.posts++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        created.errors.push(`Post "${p.title}": ${msg}`);
      }
    }

    for (const p of pagesInput) {
      if (!p?.slug || !p?.title) {
        created.errors.push(`Page missing slug/title: ${JSON.stringify(p)}`);
        continue;
      }
      const slug = String(p.slug).trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-");
      if (!slug) {
        created.errors.push(`Invalid slug for: ${p.title}`);
        continue;
      }
      try {
        const maxOrder = await prisma.customPage.aggregate({ _max: { order: true } });
        await prisma.customPage.create({
          data: {
            slug,
            title: p.title,
            content: p.content ?? "",
            order: typeof p.order === "number" ? p.order : (maxOrder._max.order ?? -1) + 1,
            published: Boolean(p.published),
          },
        });
        created.pages++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        created.errors.push(`Page "${p.title}": ${msg}`);
      }
    }

    await auditLog({
      action: "import",
      resourceType: "import",
      details: `${created.posts} posts, ${created.pages} pages`,
      ip: getClientIP(request),
    });

    return NextResponse.json({
      ok: true,
      created: `${created.posts} posts, ${created.pages} pages`,
      ...created,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
