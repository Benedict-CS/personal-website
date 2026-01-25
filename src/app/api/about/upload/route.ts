import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // 檢查是否已登入
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "profile" | "school" | "project" | "company"
    const name = formData.get("name") as string | null; // 名稱（用於生成固定檔名）

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!type || !["profile", "school", "project", "company"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'profile', 'school', 'project', or 'company'" },
        { status: 400 }
      );
    }

    // 檢查檔案類型是否為圖片
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only images are allowed." },
        { status: 400 }
      );
    }

    // 確保 public/about 資料夾存在
    const aboutDir = path.join(process.cwd(), "public", "about");
    if (!existsSync(aboutDir)) {
      await mkdir(aboutDir, { recursive: true });
    }

    // 根據類型決定檔名（使用固定檔名以便覆蓋）
    let fileName: string;
    if (type === "profile") {
      fileName = "profile.jpg";
    } else if (name) {
      // 使用名稱生成固定檔名（覆蓋模式）
      const sanitizedName = name.toLowerCase().replace(/[^a-zA-Z0-9]/g, "-");
      const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const ext = path.extname(originalName) || ".jpg";
      fileName = `${type}-${sanitizedName}${ext}`;
    } else {
      // 如果沒有名稱，使用時間戳記（向後兼容）
      const timestamp = Date.now();
      const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const ext = path.extname(originalName) || ".jpg";
      fileName = `${type}-${timestamp}${ext}`;
    }

    const filePath = path.join(aboutDir, fileName);

    // 將檔案轉換為 Buffer 並寫入
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    try {
      await writeFile(filePath, buffer);
    } catch (writeError: unknown) {
      console.error("Write error:", writeError);
      const err = writeError as { code?: string };
      if (err.code === "EACCES" || err.code === "EPERM") {
        throw new Error("Permission denied. Please check public directory permissions.");
      }
      throw writeError;
    }

    // 使用 API 路由來服務圖片，而不是直接使用靜態文件路徑
    const url = `/api/about/serve/${fileName}`;

    return NextResponse.json(
      { message: "File uploaded successfully", url, fileName },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { 
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
