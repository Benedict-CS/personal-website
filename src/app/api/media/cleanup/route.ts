import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listS3Objects, deleteFromS3 } from "@/lib/s3";
import { auditLog } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;
    const body = await request.json().catch(() => ({}));
    const dryRun = body?.dryRun !== false;

    // 1. Gather all "used" references: posts + SiteConfig (logo, favicon, OG) + AboutConfig (any /api/media/serve/ URLs)
    const [posts, siteConfig, aboutConfig] = await Promise.all([
      prisma.post.findMany({ select: { content: true } }),
      prisma.siteConfig.findUnique({ where: { id: 1 } }),
      prisma.aboutConfig.findFirst(),
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
    ].filter(Boolean);

    // Extract S3 key from any URL like /api/media/serve/<key>
    const usedKeys = new Set<string>();
    for (const s of urlStrings) {
      const matches = s.matchAll(/\/api\/media\/serve\/([^/?]+)/g);
      for (const m of matches) if (m[1]) usedKeys.add(m[1]);
    }
    usedKeys.add("cv.pdf"); // CV is always "used", never delete

    // 2. From RustFS (S3) list all files
    const objects = await listS3Objects();
    const files = objects.filter((obj) => obj.Key).map((obj) => obj.Key!);

    // 3. Delete only if not referenced in posts, SiteConfig, or AboutConfig
    const deletedFiles: string[] = [];
    const errors: string[] = [];

    const unusedFiles: string[] = [];
    for (const fileName of files) {
      const inPosts =
        allContent.includes(fileName) ||
        allContent.includes(`/api/media/serve/${fileName}`) ||
        allContent.includes(`api/media/serve/${fileName}`);
      const isAboutAsset = fileName.startsWith("about-"); // About uploads (profile, school, company) — never delete
      const isReferenced = inPosts || usedKeys.has(fileName) || isAboutAsset;

      if (!isReferenced) {
        unusedFiles.push(fileName);
        if (dryRun) continue;
        // 4. Delete from RustFS if not referenced
        try {
          await deleteFromS3(fileName);
          deletedFiles.push(fileName);
        } catch (error) {
          console.error(`Error deleting file ${fileName} from RustFS:`, error);
          errors.push(fileName);
        }
      }
    }

    await auditLog({
      action: "media.cleanup",
      resourceType: "media",
      resourceId: null,
      details: JSON.stringify({
        dryRun,
        scanned: files.length,
        unused: unusedFiles.length,
        deleted: deletedFiles.length,
      }),
      ip: request.headers.get("x-forwarded-for") ?? null,
    });

    return NextResponse.json({
      dryRun,
      scannedFiles: files.length,
      unusedCount: unusedFiles.length,
      unusedFiles,
      deletedCount: deletedFiles.length,
      deletedFiles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error cleaning up media files:", error);
    return NextResponse.json(
      { error: "Failed to clean up media files" },
      { status: 500 }
    );
  }
}
