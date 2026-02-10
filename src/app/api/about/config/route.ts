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
          introText: null,
          schoolLogos: "[]",
          projectImages: "[]",
          companyLogos: "[]",
        },
      });
    }

    const c = config as { introText?: string | null; aboutMainContent?: string | null; educationBlocks?: string; experienceBlocks?: string; projectBlocks?: string };
    return NextResponse.json({
      profileImage: config.profileImage ?? null,
      introText: c.introText ?? null,
      aboutMainContent: c.aboutMainContent ?? null,
      educationBlocks: c.educationBlocks ? JSON.parse(c.educationBlocks) : [],
      experienceBlocks: c.experienceBlocks ? JSON.parse(c.experienceBlocks) : [],
      projectBlocks: c.projectBlocks ? JSON.parse(c.projectBlocks) : [],
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
        introText: null,
        aboutMainContent: null,
        educationBlocks: [],
        experienceBlocks: [],
        projectBlocks: [],
        schoolLogos: [],
        projectImages: [],
        companyLogos: [],
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
    const { profileImage, introText, aboutMainContent, educationBlocks, experienceBlocks, projectBlocks, schoolLogos, projectImages, companyLogos } = body;

    let config = await prisma.aboutConfig.findFirst();
    const cfg = config as { educationBlocks?: string; experienceBlocks?: string; projectBlocks?: string; introText?: string | null; aboutMainContent?: string | null };

    if (!config) {
      config = await prisma.aboutConfig.create({
        data: {
          profileImage: profileImage || null,
          introText: introText ?? null,
          aboutMainContent: aboutMainContent ?? null,
          educationBlocks: educationBlocks ? JSON.stringify(educationBlocks) : "[]",
          experienceBlocks: experienceBlocks ? JSON.stringify(experienceBlocks) : "[]",
          projectBlocks: projectBlocks ? JSON.stringify(projectBlocks) : "[]",
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
          introText: introText !== undefined ? introText : config.introText,
          aboutMainContent: aboutMainContent !== undefined ? aboutMainContent : cfg.aboutMainContent,
          educationBlocks: educationBlocks !== undefined ? JSON.stringify(educationBlocks) : (cfg.educationBlocks ?? "[]"),
          experienceBlocks: experienceBlocks !== undefined ? JSON.stringify(experienceBlocks) : (cfg.experienceBlocks ?? "[]"),
          projectBlocks: projectBlocks !== undefined ? JSON.stringify(projectBlocks) : (cfg.projectBlocks ?? "[]"),
          schoolLogos: schoolLogos !== undefined ? JSON.stringify(schoolLogos) : config.schoolLogos,
          projectImages: projectImages !== undefined ? JSON.stringify(projectImages) : config.projectImages,
          companyLogos: companyLogos !== undefined ? JSON.stringify(companyLogos) : (config.companyLogos || "[]"),
        },
      });
    }

    const out = config as { introText?: string | null; aboutMainContent?: string | null; educationBlocks?: string; experienceBlocks?: string; projectBlocks?: string };
    return NextResponse.json({
      profileImage: config.profileImage ?? null,
      introText: out.introText ?? null,
      aboutMainContent: out.aboutMainContent ?? null,
      educationBlocks: out.educationBlocks ? JSON.parse(out.educationBlocks) : [],
      experienceBlocks: out.experienceBlocks ? JSON.parse(out.experienceBlocks) : [],
      projectBlocks: out.projectBlocks ? JSON.parse(out.projectBlocks) : [],
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
