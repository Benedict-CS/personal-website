import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export async function POST(_request: NextRequest) {
  try {
    // 檢查登入狀態
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 1. 從資料庫獲取所有使用的圖片 URL
    const config = await prisma.aboutConfig.findFirst();
    if (!config) {
      return NextResponse.json({
        deletedCount: 0,
        deletedFiles: [],
        message: "No config found, nothing to clean",
      });
    }

    // Only URLs under /api/about/serve/ refer to local public/about files (S3 URLs are not in this dir)
    const usedFiles = new Set<string>();
    const addIfLocal = (url: string) => {
      if (!url?.startsWith("/api/about/serve/")) return;
      const fileName = url.replace("/api/about/serve/", "").split("?")[0];
      if (fileName) usedFiles.add(fileName);
    };

    if (config.profileImage) addIfLocal(config.profileImage);
    try {
      if (config.schoolLogos) {
        (JSON.parse(config.schoolLogos) as Array<{ logo: string }>).forEach((l) => addIfLocal(l.logo));
      }
      if (config.projectImages) {
        (JSON.parse(config.projectImages) as Array<{ image: string }>).forEach((p) => addIfLocal(p.image));
      }
      if (config.companyLogos) {
        (JSON.parse(config.companyLogos) as Array<{ logo: string }>).forEach((l) => addIfLocal(l.logo));
      }
    } catch (e) {
      console.error("Error parsing About config JSON:", e);
    }

    // 2. 讀取 public/about 目錄中的所有文件
    const aboutDir = path.join(process.cwd(), "public", "about");
    if (!existsSync(aboutDir)) {
      return NextResponse.json({
        deletedCount: 0,
        deletedFiles: [],
        message: "About directory does not exist",
      });
    }

    const files = await readdir(aboutDir);
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
    });

    // 3. 找出未使用的文件
    const unusedFiles = imageFiles.filter((file) => !usedFiles.has(file));

    // 4. 刪除未使用的文件
    const deletedFiles: string[] = [];
    const errors: string[] = [];

    for (const fileName of unusedFiles) {
      try {
        const filePath = path.join(aboutDir, fileName);
        await unlink(filePath);
        deletedFiles.push(fileName);
      } catch (error) {
        console.error(`Error deleting file ${fileName}:`, error);
        errors.push(fileName);
      }
    }

    return NextResponse.json({
      deletedCount: deletedFiles.length,
      deletedFiles,
      totalFiles: imageFiles.length,
      usedFiles: usedFiles.size,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error cleaning up about images:", error);
    return NextResponse.json(
      { 
        error: "Failed to clean up about images",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
