import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function toFrontmatterValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map((item) => JSON.stringify(String(item))).join(", ")}]`;
  return JSON.stringify(String(value));
}

function toSafeFileName(name: string): string {
  const sanitized = name.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "untitled";
}

function buildPostMdx(post: {
  title: string;
  slug: string;
  description: string | null;
  published: boolean;
  publishedAt: Date | null;
  category: string | null;
  tags: { name: string }[];
  content: string;
}): string {
  const frontmatterEntries: Array<[string, unknown]> = [
    ["title", post.title],
    ["slug", post.slug],
    ["description", post.description],
    ["published", post.published],
    ["publishedAt", post.publishedAt ? post.publishedAt.toISOString() : null],
    ["category", post.category],
    ["tags", post.tags.map((tag) => tag.name)],
  ];
  const frontmatter = frontmatterEntries
    .map(([key, value]) => `${key}: ${toFrontmatterValue(value)}`)
    .join("\n");
  return `---\n${frontmatter}\n---\n\n${post.content.trimEnd()}\n`;
}

async function exportPostsZip(): Promise<Response> {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      published: true,
      publishedAt: true,
      category: true,
      tags: { select: { name: true } },
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const zip = new JSZip();
  const postsFolder = zip.folder("posts");
  if (!postsFolder) {
    throw new Error("Could not create posts folder in ZIP");
  }

  for (const post of posts) {
    const name = `${toSafeFileName(post.slug || post.title || post.id)}.mdx`;
    postsFolder.file(name, buildPostMdx(post));
  }

  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalPosts: posts.length,
        files: posts.map((post) => ({
          fileName: `${toSafeFileName(post.slug || post.title || post.id)}.mdx`,
          id: post.id,
          slug: post.slug,
          title: post.title,
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        })),
      },
      null,
      2
    )
  );

  const content = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return new NextResponse(Buffer.from(content), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="cms-posts-${new Date().toISOString().slice(0, 10)}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}

async function buildSystemPayload() {
  const [siteConfig, aboutConfig, customPages, sitePages, pageViews, accessBlocked] = await Promise.all([
    prisma.siteConfig.findUnique({ where: { id: 1 } }),
    prisma.aboutConfig.findFirst(),
    prisma.customPage.findMany({ orderBy: { order: "asc" } }),
    prisma.sitePageContent.findMany({ orderBy: { page: "asc" } }),
    prisma.pageView.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.accessBlockLog.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    siteConfig,
    aboutConfig,
    customPages,
    sitePages,
    analytics: {
      pageViews,
      accessBlocked,
    },
  };
}

async function exportSystemJson(): Promise<Response> {
  const payload = await buildSystemPayload();
  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="cms-system-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

async function exportBundleZip(): Promise<Response> {
  const [posts, system] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        published: true,
        publishedAt: true,
        category: true,
        tags: { select: { name: true } },
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    buildSystemPayload(),
  ]);

  const zip = new JSZip();
  const postsFolder = zip.folder("posts");
  if (!postsFolder) throw new Error("Could not create posts folder in bundle ZIP");
  for (const post of posts) {
    const name = `${toSafeFileName(post.slug || post.title || post.id)}.mdx`;
    postsFolder.file(name, buildPostMdx(post));
  }

  zip.file("system/cms-system-export.json", JSON.stringify(system, null, 2));
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        contents: {
          postsCount: posts.length,
          includes: ["posts/*.mdx", "system/cms-system-export.json"],
        },
      },
      null,
      2
    )
  );

  const content = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return new NextResponse(Buffer.from(content), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="cms-full-bundle-${new Date().toISOString().slice(0, 10)}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * GET /api/data-liberation/export?target=posts|system|bundle
 */
export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  const target = request.nextUrl.searchParams.get("target")?.trim().toLowerCase();
  try {
    if (target === "posts") return await exportPostsZip();
    if (target === "system") return await exportSystemJson();
    if (target === "bundle") return await exportBundleZip();
    return NextResponse.json(
      { error: "Invalid target. Use target=posts, target=system, or target=bundle." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[data-liberation/export]", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
