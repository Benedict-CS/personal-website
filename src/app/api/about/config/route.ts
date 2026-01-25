import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 獲取 about 配置
export async function GET() {
  try {
    let config = await prisma.aboutConfig.findFirst();

    // 如果沒有配置，創建一個預設的
    if (!config) {
      config = await prisma.aboutConfig.create({
        data: {
          profileImage: null,
          schoolLogos: "[]",
          projectImages: "[]",
          companyLogos: "[]",
        },
      });
    }

    // 解析 JSON 字符串並返回
    return NextResponse.json({
      ...config,
      schoolLogos: config.schoolLogos ? JSON.parse(config.schoolLogos) : [],
      projectImages: config.projectImages ? JSON.parse(config.projectImages) : [],
      companyLogos: config.companyLogos ? JSON.parse(config.companyLogos) : [],
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching about config:", error);
    // 如果表不存在，返回空配置而不是錯誤
    if (error instanceof Error && error.message.includes("does not exist")) {
      return NextResponse.json({
        profileImage: null,
        schoolLogos: [],
        projectImages: [],
      }, { status: 200 });
    }
    return NextResponse.json(
      { 
        error: "Failed to fetch about config",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// POST/PUT: 更新 about 配置
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

    const body = await request.json();
    const { profileImage, schoolLogos, projectImages, companyLogos } = body;

    // 獲取或創建配置
    let config = await prisma.aboutConfig.findFirst();

    if (!config) {
      config = await prisma.aboutConfig.create({
        data: {
          profileImage: profileImage || null,
          schoolLogos: schoolLogos ? JSON.stringify(schoolLogos) : "[]",
          projectImages: projectImages ? JSON.stringify(projectImages) : "[]",
          companyLogos: companyLogos ? JSON.stringify(companyLogos) : "[]",
        },
      });
    } else {
      config = await prisma.aboutConfig.update({
        where: { id: config.id },
        data: {
          profileImage: profileImage !== undefined ? profileImage : config.profileImage,
          schoolLogos: schoolLogos !== undefined ? JSON.stringify(schoolLogos) : config.schoolLogos,
          projectImages: projectImages !== undefined ? JSON.stringify(projectImages) : config.projectImages,
          companyLogos: companyLogos !== undefined ? JSON.stringify(companyLogos) : (config.companyLogos || "[]"),
        },
      });
    }

    // 返回解析後的 JSON
    return NextResponse.json({
      ...config,
      schoolLogos: config.schoolLogos ? JSON.parse(config.schoolLogos) : [],
      projectImages: config.projectImages ? JSON.parse(config.projectImages) : [],
      companyLogos: config.companyLogos ? JSON.parse(config.companyLogos) : [],
    }, { status: 200 });
  } catch (error) {
    console.error("Error updating about config:", error);
    return NextResponse.json(
      { 
        error: "Failed to update about config",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
