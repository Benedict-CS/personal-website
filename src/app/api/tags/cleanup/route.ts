import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;

    const allTags = await prisma.tag.findMany();

    const cleanedTags: Array<{ id: string; oldName: string; newName: string }> = [];
    const errors: string[] = [];

    for (const tag of allTags) {
      let cleanedName = tag.name.trim();
      cleanedName = cleanedName.replace(/^["']+/, "");
      cleanedName = cleanedName.replace(/["']+$/, "");
      
      if (cleanedName !== tag.name) {
        try {
          const newSlug = cleanedName
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");

          const existingTag = await prisma.tag.findUnique({
            where: { slug: newSlug },
          });

          if (existingTag && existingTag.id !== tag.id) {
            const postsWithOldTag = await prisma.post.findMany({
              where: {
                tags: {
                  some: {
                    id: tag.id,
                  },
                },
              },
            });

            for (const post of postsWithOldTag) {
              await prisma.post.update({
                where: { id: post.id },
                data: {
                  tags: {
                    disconnect: { id: tag.id },
                    connect: { id: existingTag.id },
                  },
                },
              });
            }

            await prisma.tag.delete({
              where: { id: tag.id },
            });

            cleanedTags.push({
              id: tag.id,
              oldName: tag.name,
              newName: existingTag.name,
            });
          } else {
            await prisma.tag.update({
              where: { id: tag.id },
              data: {
                name: cleanedName,
                slug: newSlug,
              },
            });

            cleanedTags.push({
              id: tag.id,
              oldName: tag.name,
              newName: cleanedName,
            });
          }
        } catch (error) {
          console.error(`Error cleaning tag ${tag.id}:`, error);
          errors.push(tag.name);
        }
      }
    }

    return NextResponse.json({
      cleanedCount: cleanedTags.length,
      cleanedTags,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully cleaned ${cleanedTags.length} tag(s)`,
    });
  } catch (error) {
    console.error("Error cleaning up tags:", error);
    return NextResponse.json(
      { error: "Failed to clean up tags" },
      { status: 500 }
    );
  }
}
