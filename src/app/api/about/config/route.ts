import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_60 = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" };
const SECTION_TITLES_KEY = "__sectionTitles";
const DEFAULT_SECTION_TITLES = {
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  skills: "Technical Skills",
  achievements: "Achievements",
};

function parseSectionSettings(raw: string | null | undefined) {
  const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  const visibility: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key === SECTION_TITLES_KEY) continue;
    if (typeof value === "boolean") visibility[key] = value;
  }
  const rawTitles = parsed[SECTION_TITLES_KEY];
  const titles =
    rawTitles && typeof rawTitles === "object"
      ? {
          ...DEFAULT_SECTION_TITLES,
          ...(rawTitles as Record<string, string>),
        }
      : { ...DEFAULT_SECTION_TITLES };
  return { visibility, titles };
}

// GET: fetch about config
export async function GET() {
  try {
    let config = await prisma.aboutConfig.findFirst({ orderBy: { updatedAt: "desc" } });

    if (!config) {
      config = await prisma.aboutConfig.create({
        data: {
          profileImage: null,
          heroName: null,
          heroTagline: null,
          heroPhone: null,
          heroEmail: null,
          heroPortfolioLabel: null,
          heroPortfolioUrl: null,
          introText: null,
          aboutMainContent: null,
          educationBlocks: "[]",
          experienceBlocks: "[]",
          projectBlocks: "[]",
          schoolLogos: "[]",
          projectImages: "[]",
          companyLogos: "[]",
          contactLinks: "[]",
          technicalSkills: "[]",
          achievements: "[]",
        },
      });
    }

    const c = config as { introText?: string | null; aboutMainContent?: string | null; educationBlocks?: string | null; experienceBlocks?: string | null; projectBlocks?: string | null; contactLinks?: string | null; technicalSkills?: string | null; achievements?: string | null };
    const parseBlocks = (s: string | null | undefined) => {
      if (s == null || s === "") return [];
      try { return JSON.parse(s); } catch { return []; }
    };
    return NextResponse.json(
      {
        profileImage: config.profileImage ?? null,
        heroName: config.heroName ?? null,
        heroTagline: config.heroTagline ?? null,
        heroPhone: config.heroPhone ?? null,
        heroEmail: config.heroEmail ?? null,
        heroPortfolioLabel: config.heroPortfolioLabel ?? null,
        heroPortfolioUrl: config.heroPortfolioUrl ?? null,
        introText: c.introText ?? null,
        aboutMainContent: c.aboutMainContent ?? null,
        educationBlocks: parseBlocks(c.educationBlocks),
        experienceBlocks: parseBlocks(c.experienceBlocks),
        projectBlocks: parseBlocks(c.projectBlocks),
        schoolLogos: config.schoolLogos ? JSON.parse(config.schoolLogos) : [],
        projectImages: config.projectImages ? JSON.parse(config.projectImages) : [],
        companyLogos: config.companyLogos ? JSON.parse(config.companyLogos) : [],
        contactHeading: config.contactHeading ?? null,
        contactText: config.contactText ?? null,
        contactLinks: parseBlocks(c.contactLinks ?? config.contactLinks),
        technicalSkills: parseBlocks(c.technicalSkills ?? config.technicalSkills),
        achievements: parseBlocks(c.achievements ?? config.achievements),
        sectionOrder: (config as { sectionOrder?: string }).sectionOrder ? JSON.parse((config as { sectionOrder: string }).sectionOrder) : ["education", "experience", "projects", "skills", "achievements"],
        sectionVisibility: parseSectionSettings((config as { sectionVisibility?: string }).sectionVisibility).visibility,
        sectionTitles: parseSectionSettings((config as { sectionVisibility?: string }).sectionVisibility).titles,
      },
      { status: 200, headers: CACHE_60 }
    );
  } catch (error) {
    console.error("Error fetching about config:", error);
    if (error instanceof Error && error.message.includes("does not exist")) {
      return NextResponse.json(
        {
          profileImage: null,
          heroName: null,
          heroTagline: null,
          heroPhone: null,
          heroEmail: null,
          heroPortfolioLabel: null,
          heroPortfolioUrl: null,
          introText: null,
          aboutMainContent: null,
          educationBlocks: [],
          experienceBlocks: [],
          projectBlocks: [],
          schoolLogos: [],
          projectImages: [],
          companyLogos: [],
          contactHeading: null,
          contactText: null,
          contactLinks: [],
          technicalSkills: [],
          achievements: [],
          sectionOrder: ["education", "experience", "projects", "skills", "achievements"],
          sectionVisibility: {},
          sectionTitles: DEFAULT_SECTION_TITLES,
        },
        { status: 200, headers: CACHE_60 }
      );
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

// POST/PUT: update about config
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession();
    if ("unauthorized" in auth) return auth.unauthorized;

    const body = await request.json();
    const {
      profileImage,
      heroName,
      heroTagline,
      heroPhone,
      heroEmail,
      heroPortfolioLabel,
      heroPortfolioUrl,
      introText,
      aboutMainContent,
      educationBlocks,
      experienceBlocks,
      projectBlocks,
      schoolLogos,
      projectImages,
      companyLogos,
      contactHeading,
      contactText,
      contactLinks,
      technicalSkills,
      achievements,
      sectionOrder,
      sectionVisibility,
      sectionTitles,
    } = body;

    let config = await prisma.aboutConfig.findFirst();
    const cfg = config as { educationBlocks?: string; experienceBlocks?: string; projectBlocks?: string; introText?: string | null; aboutMainContent?: string | null };

    if (!config) {
      config = await prisma.aboutConfig.create({
        data: {
          profileImage: profileImage || null,
          heroName: heroName ?? null,
          heroTagline: heroTagline ?? null,
          heroPhone: heroPhone ?? null,
          heroEmail: heroEmail ?? null,
          heroPortfolioLabel: heroPortfolioLabel ?? null,
          heroPortfolioUrl: heroPortfolioUrl ?? null,
          introText: introText ?? null,
          aboutMainContent: aboutMainContent ?? null,
          educationBlocks: educationBlocks ? JSON.stringify(educationBlocks) : "[]",
          experienceBlocks: experienceBlocks ? JSON.stringify(experienceBlocks) : "[]",
          projectBlocks: projectBlocks ? JSON.stringify(projectBlocks) : "[]",
          schoolLogos: schoolLogos ? JSON.stringify(schoolLogos) : "[]",
          projectImages: projectImages ? JSON.stringify(projectImages) : "[]",
          companyLogos: companyLogos ? JSON.stringify(companyLogos) : "[]",
          contactHeading: contactHeading ?? null,
          contactText: contactText ?? null,
          contactLinks: contactLinks ? JSON.stringify(contactLinks) : "[]",
          technicalSkills: technicalSkills ? JSON.stringify(technicalSkills) : "[]",
          achievements: achievements ? JSON.stringify(achievements) : "[]",
          sectionOrder: typeof sectionOrder !== "undefined" ? JSON.stringify(sectionOrder) : '["education","experience","projects","skills","achievements"]',
          sectionVisibility: JSON.stringify({
            ...(typeof sectionVisibility === "object" && sectionVisibility ? sectionVisibility : {}),
            [SECTION_TITLES_KEY]: {
              ...DEFAULT_SECTION_TITLES,
              ...(typeof sectionTitles === "object" && sectionTitles ? sectionTitles : {}),
            },
          }),
        },
      });
    } else {
      const existingSectionSettings = parseSectionSettings((config as { sectionVisibility?: string }).sectionVisibility);
      config = await prisma.aboutConfig.update({
        where: { id: config.id },
        data: {
          profileImage: profileImage !== undefined ? profileImage : config.profileImage,
          heroName: heroName !== undefined ? heroName : config.heroName,
          heroTagline: heroTagline !== undefined ? heroTagline : config.heroTagline,
          heroPhone: heroPhone !== undefined ? heroPhone : config.heroPhone,
          heroEmail: heroEmail !== undefined ? heroEmail : config.heroEmail,
          heroPortfolioLabel: heroPortfolioLabel !== undefined ? heroPortfolioLabel : config.heroPortfolioLabel,
          heroPortfolioUrl: heroPortfolioUrl !== undefined ? heroPortfolioUrl : config.heroPortfolioUrl,
          introText: introText !== undefined ? introText : config.introText,
          aboutMainContent: aboutMainContent !== undefined ? aboutMainContent : cfg.aboutMainContent,
          educationBlocks: educationBlocks !== undefined ? JSON.stringify(educationBlocks) : (cfg.educationBlocks ?? "[]"),
          experienceBlocks: experienceBlocks !== undefined ? JSON.stringify(experienceBlocks) : (cfg.experienceBlocks ?? "[]"),
          projectBlocks: projectBlocks !== undefined ? JSON.stringify(projectBlocks) : (cfg.projectBlocks ?? "[]"),
          schoolLogos: schoolLogos !== undefined ? JSON.stringify(schoolLogos) : config.schoolLogos,
          projectImages: projectImages !== undefined ? JSON.stringify(projectImages) : config.projectImages,
          companyLogos: companyLogos !== undefined ? JSON.stringify(companyLogos) : (config.companyLogos || "[]"),
          contactHeading: contactHeading !== undefined ? contactHeading : config.contactHeading,
          contactText: contactText !== undefined ? contactText : config.contactText,
          contactLinks: contactLinks !== undefined ? JSON.stringify(contactLinks) : (config.contactLinks ?? "[]"),
          technicalSkills: technicalSkills !== undefined ? JSON.stringify(technicalSkills) : (config.technicalSkills ?? "[]"),
          achievements: achievements !== undefined ? JSON.stringify(achievements) : (config.achievements ?? "[]"),
          ...(sectionOrder !== undefined && { sectionOrder: JSON.stringify(sectionOrder) }),
          ...((sectionVisibility !== undefined || sectionTitles !== undefined) && {
            sectionVisibility: JSON.stringify({
              ...(sectionVisibility !== undefined
                ? (sectionVisibility as Record<string, boolean>)
                : existingSectionSettings.visibility),
              [SECTION_TITLES_KEY]: {
                ...existingSectionSettings.titles,
                ...(typeof sectionTitles === "object" && sectionTitles ? sectionTitles : {}),
              },
            }),
          }),
        },
      });
    }

    const out = config as { introText?: string | null; aboutMainContent?: string | null; educationBlocks?: string; experienceBlocks?: string; projectBlocks?: string; contactLinks?: string; technicalSkills?: string; achievements?: string };
    const parse = (s: string | null | undefined) => { if (s == null || s === "") return []; try { return JSON.parse(s); } catch { return []; } };
    return NextResponse.json({
      profileImage: config.profileImage ?? null,
      heroName: config.heroName ?? null,
      heroTagline: config.heroTagline ?? null,
      heroPhone: config.heroPhone ?? null,
      heroEmail: config.heroEmail ?? null,
      heroPortfolioLabel: config.heroPortfolioLabel ?? null,
      heroPortfolioUrl: config.heroPortfolioUrl ?? null,
      introText: out.introText ?? null,
      aboutMainContent: out.aboutMainContent ?? null,
      educationBlocks: parse(out.educationBlocks),
      experienceBlocks: parse(out.experienceBlocks),
      projectBlocks: parse(out.projectBlocks),
      schoolLogos: config.schoolLogos ? JSON.parse(config.schoolLogos) : [],
      projectImages: config.projectImages ? JSON.parse(config.projectImages) : [],
      companyLogos: config.companyLogos ? JSON.parse(config.companyLogos) : [],
      contactHeading: config.contactHeading ?? null,
      contactText: config.contactText ?? null,
      contactLinks: parse(out.contactLinks ?? config.contactLinks),
      technicalSkills: parse(out.technicalSkills ?? config.technicalSkills),
      achievements: parse(out.achievements ?? config.achievements),
      sectionOrder: (config as { sectionOrder?: string }).sectionOrder ? JSON.parse((config as { sectionOrder: string }).sectionOrder) : ["education", "experience", "projects", "skills", "achievements"],
      sectionVisibility: parseSectionSettings((config as { sectionVisibility?: string }).sectionVisibility).visibility,
      sectionTitles: parseSectionSettings((config as { sectionVisibility?: string }).sectionVisibility).titles,
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
