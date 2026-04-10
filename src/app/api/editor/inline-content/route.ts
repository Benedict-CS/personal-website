import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type HomeContent = {
  heroTitle?: string;
  heroSubtitle?: string;
  ctaPrimaryText?: string;
  ctaSecondaryText?: string;
  ctaContactText?: string;
  sectionTitleLatestPosts?: string;
  sectionTitleSkills?: string;
};

type ContactContent = {
  [key: string]: unknown;
  title?: string;
  intro?: string;
  formNote?: string;
};

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  const body = await request.json();
  const slug = typeof body.slug === "string" ? body.slug : "";
  const textEdits = asRecord(body.textEdits);
  const imageEdits = asRecord(body.imageEdits);

  if (!slug) {
    return NextResponse.json({ ok: false, error: "Invalid slug" }, { status: 400 });
  }

  if (slug === "home") {
    const row = await prisma.sitePageContent.findUnique({ where: { page: "home" } });
    const current = ((row?.content as HomeContent | null) ?? {}) as HomeContent;
    const next: HomeContent = {
      ...current,
      ...(textEdits["home.heroTitle"] ? { heroTitle: textEdits["home.heroTitle"] } : {}),
      ...(textEdits["home.heroSubtitle"] ? { heroSubtitle: textEdits["home.heroSubtitle"] } : {}),
      ...(textEdits["home.ctaPrimaryText"] ? { ctaPrimaryText: textEdits["home.ctaPrimaryText"] } : {}),
      ...(textEdits["home.ctaSecondaryText"] ? { ctaSecondaryText: textEdits["home.ctaSecondaryText"] } : {}),
      ...(textEdits["home.ctaContactText"] ? { ctaContactText: textEdits["home.ctaContactText"] } : {}),
      ...(textEdits["home.sectionTitleLatestPosts"] ? { sectionTitleLatestPosts: textEdits["home.sectionTitleLatestPosts"] } : {}),
      ...(textEdits["home.sectionTitleSkills"] ? { sectionTitleSkills: textEdits["home.sectionTitleSkills"] } : {}),
    };

    const saved = await prisma.sitePageContent.upsert({
      where: { page: "home" },
      create: { page: "home", content: next as object },
      update: { content: next as object },
    });
    return NextResponse.json({
      ok: true,
      persisted: true,
      publishRequested: Boolean(body.publish),
      page: "home",
      content: saved.content,
      updatedAt: saved.updatedAt,
    });
  }

  if (slug === "contact") {
    const row = await prisma.sitePageContent.findUnique({ where: { page: "contact" } });
    const current = ((row?.content as ContactContent | null) ?? {}) as ContactContent;
    const next: ContactContent = {
      ...current,
      ...(textEdits["contact.title"] ? { title: textEdits["contact.title"] } : {}),
      ...(textEdits["contact.intro"] ? { intro: textEdits["contact.intro"] } : {}),
      ...(textEdits["contact.formNote"] ? { formNote: textEdits["contact.formNote"] } : {}),
      ...(imageEdits["contact.heroImage"] ? { heroImage: imageEdits["contact.heroImage"] } : {}),
    };
    const saved = await prisma.sitePageContent.upsert({
      where: { page: "contact" },
      create: { page: "contact", content: next as object },
      update: { content: next as object },
    });
    return NextResponse.json({
      ok: true,
      persisted: true,
      publishRequested: Boolean(body.publish),
      page: "contact",
      content: saved.content,
      updatedAt: saved.updatedAt,
    });
  }

  return NextResponse.json({ ok: true, persisted: false, publishRequested: Boolean(body.publish) });
}
