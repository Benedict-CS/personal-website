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

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // 檢查檔案類型是否為 PDF
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF files are allowed." },
        { status: 400 }
      );
    }

    // 確保 public 資料夾存在
    const publicDir = path.join(process.cwd(), "public");
    if (!existsSync(publicDir)) {
      await mkdir(publicDir, { recursive: true });
    }

    // 儲存為 cv.pdf（直接覆蓋）
    const filePath = path.join(publicDir, "cv.pdf");

    // 將檔案轉換為 Buffer 並寫入
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    try {
      await writeFile(filePath, buffer);
    } catch (writeError: unknown) {
      // 如果寫入失敗，可能是權限問題，嘗試修改權限
      console.error("Write error:", writeError);
      const err = writeError as { code?: string };
      if (err.code === "EACCES" || err.code === "EPERM") {
        // 在 Docker 中，如果 volume 掛載有權限問題，需要確保主機目錄權限正確
        throw new Error("Permission denied. Please check public directory permissions.");
      }
      throw writeError;
    }

    return NextResponse.json(
      { message: "CV uploaded successfully", url: "/cv.pdf" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading CV:", error);
    return NextResponse.json(
      { error: "Failed to upload CV" },
      { status: 500 }
    );
  }
}
