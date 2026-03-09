import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listS3Objects } from "@/lib/s3";

function suggestAltFromFilename(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "");
  const normalized = base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return "Image";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export async function GET() {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  const [posts, siteConfig, aboutConfig, objects] = await Promise.all([
    prisma.post.findMany({ select: { content: true } }),
    prisma.siteConfig.findUnique({ where: { id: 1 } }),
    prisma.aboutConfig.findFirst(),
    listS3Objects(),
  ]);

  const allContent = posts.map((p) => p.content).join("\n");
  const urlStrings: string[] = [
    siteConfig?.logoUrl ?? "",
    siteConfig?.faviconUrl ?? "",
    siteConfig?.ogImageUrl ?? "",
    aboutConfig?.profileImage ?? "",
    aboutConfig?.schoolLogos ?? "",
    aboutConfig?.companyLogos ?? "",
    aboutConfig?.projectImages ?? "",
    aboutConfig?.educationBlocks ?? "",
    aboutConfig?.experienceBlocks ?? "",
    aboutConfig?.projectBlocks ?? "",
    aboutConfig?.volunteerBlocks ?? "",
  ].filter(Boolean);

  const usedKeys = new Set<string>();
  for (const s of urlStrings) {
    const matches = s.matchAll(/\/api\/media\/serve\/([^/?]+)/g);
    for (const m of matches) if (m[1]) usedKeys.add(m[1]);
  }
  usedKeys.add("cv.pdf");

  const files = objects.filter((obj) => obj.Key).map((obj) => obj.Key!);
  const usedFiles: string[] = [];
  const unusedFiles: string[] = [];
  const altSuggestions: Array<{ key: string; alt: string }> = [];

  for (const key of files) {
    const inPosts =
      allContent.includes(key) ||
      allContent.includes(`/api/media/serve/${key}`) ||
      allContent.includes(`api/media/serve/${key}`);
    const isAboutAsset = key.startsWith("about-");
    const isUsed = inPosts || usedKeys.has(key) || isAboutAsset;
    if (isUsed) usedFiles.push(key);
    else unusedFiles.push(key);
    if (/\.(png|jpe?g|webp|gif|svg)$/i.test(key)) {
      altSuggestions.push({ key, alt: suggestAltFromFilename(key) });
    }
  }

  return NextResponse.json({
    total: files.length,
    usedCount: usedFiles.length,
    unusedCount: unusedFiles.length,
    usedFiles,
    unusedFiles,
    altSuggestions,
  });
}

