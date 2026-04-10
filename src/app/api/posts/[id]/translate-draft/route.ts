import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { buildTranslatedDraftScaffold, type SupportedTranslationLocale } from "@/lib/content-translator";
import { checkRateLimitAsync, getClientIP } from "@/lib/rate-limit";

const ALLOWED_LOCALES: SupportedTranslationLocale[] = ["zh-TW", "ja", "es"];

function normalizeLocale(input: unknown): SupportedTranslationLocale | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim() as SupportedTranslationLocale;
  return ALLOWED_LOCALES.includes(trimmed) ? trimmed : null;
}

async function buildUniqueSlug(baseSlug: string): Promise<string> {
  let nextSlug = baseSlug;
  let suffix = 1;
  // Bounded loop to avoid accidental infinite cycle on DB issues.
  while (suffix < 200) {
    const exists = await prisma.post.findUnique({ where: { slug: nextSlug }, select: { id: true } });
    if (!exists) return nextSlug;
    suffix += 1;
    nextSlug = `${baseSlug}-${suffix}`;
  }
  return `${baseSlug}-${Date.now()}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;

    const ip = getClientIP(request);
    const { ok: allowed, remaining } = await checkRateLimitAsync(ip, "posts_translate_write");
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many translation draft requests. Please try again in a minute." },
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

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const locale = normalizeLocale((body as { locale?: unknown }).locale);
    if (!locale) {
      return NextResponse.json({ error: "Invalid locale. Use zh-TW, ja, or es." }, { status: 400 });
    }

    const source = await prisma.post.findUnique({
      where: { id },
      include: { tags: true },
    });
    if (!source) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const scaffold = buildTranslatedDraftScaffold({
      title: source.title,
      description: source.description ?? "",
      content: source.content,
      locale,
    });

    const uniqueSlug = await buildUniqueSlug(`${source.slug}-${locale.toLowerCase()}`);
    const created = await prisma.post.create({
      data: {
        title: scaffold.translatedTitle,
        slug: uniqueSlug,
        content: scaffold.translatedContent,
        description: scaffold.translatedDescription || source.description,
        published: false,
        pinned: false,
        category: source.category,
        order: source.order,
        tags: {
          connect: source.tags.map((tag) => ({ id: tag.id })),
          connectOrCreate: [
            {
              where: { slug: `lang-${locale.toLowerCase()}` },
              create: { slug: `lang-${locale.toLowerCase()}`, name: `lang-${locale.toLowerCase()}` },
            },
          ],
        },
      },
      select: { id: true, slug: true, title: true },
    });

    await auditLog({
      action: "post.create",
      resourceType: "post",
      resourceId: created.id,
      details: JSON.stringify({
        sourcePostId: source.id,
        sourceSlug: source.slug,
        translationLocale: locale,
        generatedFrom: "api.posts.translate-draft",
      }),
      ip,
    });

    return NextResponse.json(
      { id: created.id, slug: created.slug, title: created.title },
      { status: 201, headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  } catch (error) {
    console.error("Error creating translated draft:", error);
    return NextResponse.json({ error: "Failed to create translated draft" }, { status: 500 });
  }
}
