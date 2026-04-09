import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Linkedin, Github, GraduationCap, Briefcase, HeartHandshake, Award, Trophy, Download, Code, Network } from "lucide-react";
import { getSiteConfigForRender } from "@/lib/site-config";
import { prisma } from "@/lib/prisma";
import { AboutHighlightScroll } from "@/components/about-highlight-scroll";
import { MarkdownBodyServer } from "@/components/markdown/markdown-body-server";
import {
  markdownArticleClassNameProseSm,
  markdownArticleClassNameProseSlate,
} from "@/lib/markdown-pipeline";
import { CountryFlag } from "@/components/country-flag";
import { PublicBreadcrumbs } from "@/components/public-breadcrumbs";
import { AboutSkillsAchievementsEditor } from "@/components/about-skills-achievements-editor";
import { Suspense } from "react";
import { getCvDownloadFilename } from "@/lib/cv-download-filename";
import { AboutPrintToolbar } from "@/components/about-print-toolbar";
import { PublicPageShell } from "@/components/public/public-layout";

export const revalidate = 30;
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfigForRender();
  const base = config.url.replace(/\/$/, "");
  const desc =
    "Learn more about the site owner, background, projects, and work experience.";
  const ogUrl = config.ogImageUrl
    ? (config.ogImageUrl.startsWith("http") ? config.ogImageUrl : new URL(config.ogImageUrl, config.url).toString())
    : undefined;
  return {
    title: "About Me",
    description: desc,
    alternates: { canonical: `${base}/about` },
    openGraph: {
      title: "About Me",
      description: desc,
      url: `${base}/about`,
      type: "website",
      ...(ogUrl && { images: [ogUrl] }),
    },
    twitter: {
      card: "summary_large_image",
      title: "About Me",
      description: desc,
      ...(ogUrl && { images: [ogUrl] }),
    },
  };
}

interface SchoolLogo {
  school: string;
  logo: string;
}

interface ProjectImage {
  project: string;
  image: string;
}

interface CompanyLogo {
  company: string;
  logo: string;
}

interface AboutCustomSection {
  id: string;
  title: string;
  blocks: AboutBlockEntry[];
}

export interface AboutBlockEntry {
  title: string;
  logoUrl?: string | null;
  organization: string;
  /** ISO 3166-1 alpha-2 country code (e.g. TW, US) for Education; shown as flag after school name */
  countryCode?: string | null;
  dateRange: string;
  content: string;
}

const DEFAULT_SECTION_TITLES = {
  education: "Education",
  experience: "Experience",
  volunteer: "Volunteer",
  projects: "Projects",
  skills: "Technical Skills",
  achievements: "Achievements",
};

async function getAboutConfig() {
  try {
    const config = await prisma.aboutConfig.findFirst();
    if (!config) {
      return {
        profileImage: null,
        heroName: null,
        heroTagline: null,
        heroPhone: null,
        heroEmail: null,
        heroPortfolioLabel: null,
        heroPortfolioUrl: null,
        introText: null,
        aboutMainContent: null,
        educationBlocks: [] as AboutBlockEntry[],
        experienceBlocks: [] as AboutBlockEntry[],
        volunteerBlocks: [] as AboutBlockEntry[],
        projectBlocks: [] as AboutBlockEntry[],
        schoolLogos: [] as SchoolLogo[],
        projectImages: [] as ProjectImage[],
        companyLogos: [] as CompanyLogo[],
        contactHeading: null,
        contactText: null,
        contactLinks: [] as { label: string; url: string }[],
        technicalSkills: [] as { category: string; items: string[] }[],
        achievements: [] as { title: string; organization: string; year: string }[],
        customSections: [] as AboutCustomSection[],
        sectionOrder: ["education", "experience", "volunteer", "projects", "skills", "achievements"],
        sectionVisibility: {} as Record<string, boolean>,
        sectionTitles: { ...DEFAULT_SECTION_TITLES },
      };
    }
    const c = config as {
      introText?: string | null;
      aboutMainContent?: string | null;
      educationBlocks?: string;
      experienceBlocks?: string;
      volunteerBlocks?: string;
      projectBlocks?: string;
      heroName?: string | null;
      heroTagline?: string | null;
      heroPhone?: string | null;
      heroEmail?: string | null;
      heroPortfolioLabel?: string | null;
      heroPortfolioUrl?: string | null;
      contactHeading?: string | null;
      contactText?: string | null;
      contactLinks?: string | null;
      technicalSkills?: string | null;
      achievements?: string | null;
      customSections?: string | null;
      sectionOrder?: string;
      sectionVisibility?: string;
    };
    const parseJson = (s: string | null | undefined, fallback: unknown): unknown => {
      if (s == null || s === "") return fallback;
      try { return JSON.parse(s); } catch { return fallback; }
    };
    const rawSectionVisibility = parseJson(c.sectionVisibility, {}) as Record<string, unknown>;
    const sectionVisibility = Object.fromEntries(
      Object.entries(rawSectionVisibility).filter(([key, value]) => key !== "__sectionTitles" && typeof value === "boolean")
    ) as Record<string, boolean>;
    const sectionTitles = {
      ...DEFAULT_SECTION_TITLES,
      ...((rawSectionVisibility["__sectionTitles"] as Record<string, string> | undefined) ?? {}),
    };
    return {
      profileImage: config.profileImage,
      heroName: c.heroName ?? null,
      heroTagline: c.heroTagline ?? null,
      heroPhone: c.heroPhone ?? null,
      heroEmail: c.heroEmail ?? null,
      heroPortfolioLabel: c.heroPortfolioLabel ?? null,
      heroPortfolioUrl: c.heroPortfolioUrl ?? null,
      introText: c.introText ?? null,
      aboutMainContent: c.aboutMainContent ?? null,
      educationBlocks: parseJson(c.educationBlocks, []) as AboutBlockEntry[],
      experienceBlocks: parseJson(c.experienceBlocks, []) as AboutBlockEntry[],
      volunteerBlocks: parseJson(c.volunteerBlocks, []) as AboutBlockEntry[],
      projectBlocks: parseJson(c.projectBlocks, []) as AboutBlockEntry[],
      schoolLogos: config.schoolLogos ? (JSON.parse(config.schoolLogos) as SchoolLogo[]) : [],
      projectImages: config.projectImages ? (JSON.parse(config.projectImages) as ProjectImage[]) : [],
      companyLogos: config.companyLogos ? (JSON.parse(config.companyLogos) as CompanyLogo[]) : [],
      contactHeading: c.contactHeading ?? null,
      contactText: c.contactText ?? null,
      contactLinks: (parseJson(c.contactLinks ?? (config as { contactLinks?: string }).contactLinks, []) as { label: string; url: string }[]),
      technicalSkills: (parseJson(c.technicalSkills ?? (config as { technicalSkills?: string }).technicalSkills, []) as { category: string; items: string[] }[]),
      achievements: (parseJson(c.achievements ?? (config as { achievements?: string }).achievements, []) as { title: string; organization: string; year: string }[]),
      customSections: (parseJson(c.customSections ?? (config as { customSections?: string }).customSections, []) as AboutCustomSection[]),
      sectionOrder: (parseJson(c.sectionOrder, ["education", "experience", "volunteer", "projects", "skills", "achievements"]) as string[]).filter((id) => ["education", "experience", "volunteer", "projects", "skills", "achievements"].includes(id) || String(id).startsWith("custom:")),
      sectionVisibility,
      sectionTitles,
    };
  } catch (error) {
    console.error("Error loading about config:", error);
    return {
      profileImage: null,
      heroName: null,
      heroTagline: null,
      heroPhone: null,
      heroEmail: null,
      heroPortfolioLabel: null,
      heroPortfolioUrl: null,
      introText: null,
      aboutMainContent: null,
      educationBlocks: [] as AboutBlockEntry[],
      experienceBlocks: [] as AboutBlockEntry[],
      volunteerBlocks: [] as AboutBlockEntry[],
      projectBlocks: [] as AboutBlockEntry[],
      schoolLogos: [] as SchoolLogo[],
      projectImages: [] as ProjectImage[],
      companyLogos: [] as CompanyLogo[],
      contactHeading: null,
      contactText: null,
      contactLinks: [] as { label: string; url: string }[],
      technicalSkills: [] as { category: string; items: string[] }[],
      achievements: [] as { title: string; organization: string; year: string }[],
      customSections: [] as AboutCustomSection[],
      sectionOrder: ["education", "experience", "volunteer", "projects", "skills", "achievements"],
      sectionVisibility: {} as Record<string, boolean>,
      sectionTitles: { ...DEFAULT_SECTION_TITLES },
    };
  }
}

function getSchoolLogo(schoolLogos: SchoolLogo[], schoolName: string): string | null {
  if (!schoolLogos || schoolLogos.length === 0) return null;
  
  const normalizedSchoolName = schoolName.toLowerCase().trim();
  const logo = schoolLogos.find((l) => {
    const normalizedLogoName = l.school.toLowerCase().trim();
    if (normalizedLogoName === normalizedSchoolName) return true;
    if (normalizedSchoolName.includes(normalizedLogoName) || normalizedLogoName.includes(normalizedSchoolName)) return true;
    if ((normalizedSchoolName.includes("nycu") || normalizedSchoolName.includes("yang ming")) && 
        (normalizedLogoName.includes("nycu") || normalizedLogoName.includes("yang ming"))) return true;
    if ((normalizedSchoolName.includes("ntut") || normalizedSchoolName.includes("taipei tech")) && 
        (normalizedLogoName.includes("ntut") || normalizedLogoName.includes("taipei tech"))) return true;
    return false;
  });
  return logo?.logo || null;
}

function getProjectImage(projectImages: ProjectImage[], projectName: string): string | null {
  if (!projectImages || projectImages.length === 0) return null;
  
  const normalizedProjectName = projectName.toLowerCase().trim();
  const image = projectImages.find((p) => {
    const normalizedImageName = p.project.toLowerCase().trim();
    if (normalizedImageName === normalizedProjectName) return true;
    if (normalizedProjectName.includes(normalizedImageName) || normalizedImageName.includes(normalizedProjectName)) return true;
    if ((normalizedProjectName.includes("ci/cd") || normalizedProjectName.includes("cicd") || normalizedProjectName.includes("zero downtime")) && 
        (normalizedImageName.includes("ci/cd") || normalizedImageName.includes("cicd") || normalizedImageName.includes("zero downtime"))) return true;
    if ((normalizedProjectName.includes("kubernetes") || normalizedProjectName.includes("k8s") || normalizedProjectName.includes("multi-cluster")) && 
        (normalizedImageName.includes("kubernetes") || normalizedImageName.includes("k8s") || normalizedImageName.includes("multi-cluster"))) return true;
    return false;
  });
  return image?.image || null;
}

function getCompanyLogo(companyLogos: CompanyLogo[], companyName: string): string | null {
  if (!companyLogos || companyLogos.length === 0) return null;
  
  const normalizedCompanyName = companyName.toLowerCase().trim();
  const logo = companyLogos.find((c) => {
    const normalizedLogoName = c.company.toLowerCase().trim();
    if (normalizedLogoName === normalizedCompanyName) return true;
    if (normalizedCompanyName.includes(normalizedLogoName) || normalizedLogoName.includes(normalizedCompanyName)) return true;
    if ((normalizedCompanyName.includes("nycu") || normalizedCompanyName.includes("yang ming")) && 
        (normalizedLogoName.includes("nycu") || normalizedLogoName.includes("yang ming"))) return true;
    if ((normalizedCompanyName.includes("makalot")) && normalizedLogoName.includes("makalot")) return true;
    if ((normalizedCompanyName.includes("iscom")) && normalizedLogoName.includes("iscom")) return true;
    if ((normalizedCompanyName.includes("must")) && normalizedLogoName.includes("must")) return true;
    if ((normalizedCompanyName.includes("ntut") || normalizedCompanyName.includes("taipei tech")) && 
        (normalizedLogoName.includes("ntut") || normalizedLogoName.includes("taipei tech"))) return true;
    return false;
  });
  return logo?.logo || null;
}

function getEducationLogoFallback(
  schoolLogos: SchoolLogo[],
  companyLogos: CompanyLogo[],
  entry: AboutBlockEntry
): string | null {
  if (entry.logoUrl?.trim()) return entry.logoUrl.trim();
  if (entry.logoUrl === "") return null;

  const org = entry.organization?.trim() || "";
  const title = entry.title?.trim() || "";
  const bySchool =
    (org ? getSchoolLogo(schoolLogos, org) : null) ||
    (title ? getSchoolLogo(schoolLogos, title) : null);
  if (bySchool) return bySchool;

  // Legacy data sometimes stores school logos in companyLogos.
  const byCompany =
    (org ? getCompanyLogo(companyLogos, org) : null) ||
    (title ? getCompanyLogo(companyLogos, title) : null);
  return byCompany;
}

function inferCountryCodeFromOrganization(name: string): string | null {
  const normalized = name.toLowerCase();
  if (normalized.includes("taiwan")) return "TW";
  if (normalized.includes("malaysia") || normalized.includes("malaysian")) return "MY";
  if (normalized.includes("nycu")) return "TW";
  if (normalized.includes("ntut")) return "TW";
  if (normalized.includes("taipei tech")) return "TW";
  if (normalized.includes("must")) return "TW";
  if (normalized.includes("minghsin")) return "TW";
  if (normalized.includes("nthu")) return "TW";
  if (normalized.includes("ncku")) return "TW";
  if (normalized.includes("united states") || normalized.includes("usa")) return "US";
  if (normalized.includes("japan")) return "JP";
  return null;
}

function normalizeBlockMarkdown(content: string): string {
  const raw = (content || "").trim();
  if (!raw) return raw;
  const hasListSyntax = /^\s*[-*+]\s+/m.test(raw) || /^\s*\d+\.\s+/m.test(raw);
  if (hasListSyntax) return raw;
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return raw;
  return lines.map((line) => `- ${line}`).join("\n");
}

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ print?: string | string[] }>;
}) {
  const sp = await searchParams;
  const printRaw = sp?.print;
  const printParam = Array.isArray(printRaw) ? printRaw[0] : printRaw;
  const isPrintMode = printParam === "1" || printParam === "true";

  const config = await getAboutConfig();
  const { profileImage, heroName, heroTagline, heroPortfolioLabel, heroPortfolioUrl, introText, aboutMainContent, educationBlocks, experienceBlocks, volunteerBlocks, projectBlocks, schoolLogos, projectImages, companyLogos, technicalSkills, achievements, customSections, sectionOrder, sectionVisibility, sectionTitles } = config;
  const downloadCvLabel = heroPortfolioLabel?.trim() || "Download CV (PDF)";
  const rawCvHref = heroPortfolioUrl?.trim() || "";
  const cvPath =
    rawCvHref.startsWith("http://") || rawCvHref.startsWith("https://")
      ? (() => {
          try {
            return new URL(rawCvHref).pathname;
          } catch {
            return rawCvHref;
          }
        })()
      : rawCvHref;
  const isOurServeCv = cvPath === "/api/media/serve/cv.pdf";
  const downloadCvHref = rawCvHref && !isOurServeCv ? rawCvHref : "/api/cv/download";
  const cvDownloadFilename = getCvDownloadFilename();
  const aboutVisible = (id: string) => sectionVisibility?.[id] !== false;
  const customSectionIds = (Array.isArray(customSections) ? customSections : [])
    .map((section) => `custom:${String(section.id ?? "").trim()}`)
    .filter((id) => id !== "custom:");
  const allSectionIds = ["education", "experience", "volunteer", "projects", "skills", "achievements", ...customSectionIds] as const;
  const resolvedSectionOrder = Array.isArray(sectionOrder) ? sectionOrder : [];
  const normalizedSectionOrder = [
    ...resolvedSectionOrder.filter((id) => allSectionIds.includes(id as (typeof allSectionIds)[number])),
    ...allSectionIds.filter((id) => !resolvedSectionOrder.includes(id)),
  ];
  const sectionOrderIndex = (id: (typeof allSectionIds)[number]) => {
    const idx = normalizedSectionOrder.indexOf(id);
    return idx === -1 ? normalizedSectionOrder.length : idx;
  };
  const useStructuredBlocks = educationBlocks.length > 0 || experienceBlocks.length > 0 || volunteerBlocks.length > 0 || projectBlocks.length > 0 || customSections.length > 0;

  if (process.env.NODE_ENV === "development") {
    console.log("About page config:", {
      profileImage,
      schoolLogosCount: schoolLogos?.length || 0,
      projectImagesCount: projectImages?.length || 0,
      schoolLogos,
      projectImages,
    });
  }

  if (process.env.NODE_ENV === "development") {
    console.log("Available school logos:", schoolLogos);
    console.log("Available project images:", projectImages);
  }

  let nycuLogo: string | null = null;
  if (schoolLogos && schoolLogos.length > 0) {
    nycuLogo = getSchoolLogo(schoolLogos, "NYCU") || 
               getSchoolLogo(schoolLogos, "National Yang Ming Chiao Tung University") ||
               getSchoolLogo(schoolLogos, "Yang Ming");
    if (!nycuLogo) {
      nycuLogo = schoolLogos[0].logo;
    }
  }
  
  let ntutLogo: string | null = null;
  if (schoolLogos && schoolLogos.length > 0) {
    const possibleNtutLogos = schoolLogos.filter(l => {
      const name = l.school.toLowerCase();
      return name.includes("ntut") || name.includes("taipei tech") || name.includes("taipei university");
    });
    if (possibleNtutLogos.length > 0) {
      ntutLogo = possibleNtutLogos[0].logo;
    } else if (schoolLogos.length > 1 && schoolLogos[1].logo !== nycuLogo) {
      ntutLogo = schoolLogos[1].logo;
    } else if (schoolLogos.length > 0 && schoolLogos[0].logo !== nycuLogo) {
      ntutLogo = schoolLogos[0].logo;
    }
  }
  
  // Project 1 - CI/CD Framework
  let project1Image: string | null = null;
  if (projectImages && projectImages.length > 0) {
    project1Image = getProjectImage(projectImages, "CI/CD Framework") ||
                    getProjectImage(projectImages, "Zero Downtime") ||
                    getProjectImage(projectImages, "CI/CD") ||
                    getProjectImage(projectImages, "cicd");
    if (!project1Image) {
      project1Image = projectImages[0].image;
    }
  }
  
  let project2Image: string | null = null;
  if (projectImages && projectImages.length > 0) {
    const possibleK8sImages = projectImages.filter(p => {
      const name = p.project.toLowerCase();
      return name.includes("kubernetes") || name.includes("k8s") || name.includes("multi-cluster") || name.includes("cluster");
    });
    if (possibleK8sImages.length > 0) {
      project2Image = possibleK8sImages[0].image;
    } else if (projectImages.length > 1 && projectImages[1].image !== project1Image) {
      project2Image = projectImages[1].image;
    } else if (projectImages.length > 0 && projectImages[0].image !== project1Image) {
      project2Image = projectImages[0].image;
    }
  }

  return (
    <PublicPageShell maxWidth="5xl" className="py-12">
      {isPrintMode && <AboutPrintToolbar />}
      {!isPrintMode && (
        <PublicBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />
      )}
      <Suspense fallback={null}>
        <AboutHighlightScroll />
      </Suspense>
      <div className="flex flex-col space-y-8" data-about-content>
        {/* Hero: profile card (name, tagline, contact, CV) — first thing visitors see */}
        {/* Hero + Intro merged into one card for a tighter, less empty layout */}
        <Card className="shadow-lg">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              {profileImage ? (
                <div className="mb-6 inline-block" data-about-profile-image>
                  <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-slate-200 shadow-md mx-auto">
                    <Image
                      src={profileImage}
                      alt={heroName?.trim() || "Profile"}
                      fill
                      unoptimized
                      data-about-profile-img
                      className="object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-6 inline-flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-5xl font-bold text-white shadow-md">
                  {(heroName?.trim() || "B")[0]}
                </div>
              )}
              <h1 className="mb-2 text-4xl font-bold text-slate-900" data-about-edit="heroName">
                {heroName?.trim() || "Your Name"}
              </h1>
              {(heroTagline?.trim()) ? (
                <p className="mb-2 text-lg text-slate-600" data-about-edit="heroTagline">
                  {heroTagline}
                </p>
              ) : (
                <p className="mb-2 text-lg text-slate-600" data-about-edit="heroTagline">
                  Builder Owner | Product Creator
                </p>
              )}
              <div className="flex justify-center gap-3 mt-6">
                <a
                  href={downloadCvHref}
                  download={downloadCvHref === "/api/cv/download" ? cvDownloadFilename : undefined}
                  data-editor-button="about.downloadCv"
                >
                  <Button variant="default" className="gap-2 shadow-md">
                    <Download className="h-4 w-4" />
                    <span data-editor-button-label>{downloadCvLabel}</span>
                  </Button>
                </a>
              </div>
            </div>
            {introText && introText.trim() && (
              <div className="mt-8 pt-6 border-t border-slate-200 text-left max-w-4xl mx-auto px-0">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed" data-about-edit="introText">{introText}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Structured blocks from dashboard (Education, Experience, Projects) - template: title, logo, org, date, content */}
        {useStructuredBlocks && (
          <>
            {educationBlocks.length > 0 && (
              <div
                data-about-section="education"
                style={{ order: sectionOrderIndex("education"), display: aboutVisible("education") ? undefined : "none" }}
              >
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <GraduationCap className="h-5 w-5" />
                    <span data-about-edit="sectionTitles.education">{sectionTitles.education}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {educationBlocks.map((entry, i) => {
                      const entryLogo = getEducationLogoFallback(schoolLogos, companyLogos, entry);
                      const countryCode =
                        entry.countryCode?.trim() ||
                        inferCountryCodeFromOrganization(entry.organization || "") ||
                        inferCountryCodeFromOrganization(entry.title || "");
                      return (
                      <div
                        key={i}
                        className="border-l-4 border-blue-500 pl-3"
                        data-about-block-root
                        data-about-block-section="education"
                        data-about-block-group="education"
                        data-about-block-index={i}
                      >
                        <div className="flex gap-2">
                          {entryLogo ? (
                            <div
                              className="relative h-16 w-16 flex-shrink-0"
                              data-about-logo-key={`educationBlocks.${i}.logoUrl`}
                              data-about-logo-kind="education"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic CMS URL, not known at build time */}
                              <img src={entryLogo} alt="" className="h-full w-full object-contain" data-about-logo-img />
                            </div>
                          ) : (
                            <div
                              className="hidden h-16 w-16 flex-shrink-0 items-center justify-center rounded border-2 border-dashed border-slate-300 text-[11px] text-slate-500"
                              data-about-logo-key={`educationBlocks.${i}.logoUrl`}
                              data-about-logo-kind="education"
                              data-about-logo-empty
                            >
                              + Logo
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5">
                            <div>
                              <h3 className="font-semibold text-slate-900 text-lg mb-0.5" data-about-edit={`educationBlocks.${i}.title`}>{entry.title}</h3>
                              {entry.organization && (
                                <p className="text-base font-semibold text-slate-700 flex items-center gap-1.5 flex-wrap" data-about-edit={`educationBlocks.${i}.organization`}>
                                  <span>{entry.organization}</span>
                                  {countryCode && (
                                    <CountryFlag countryCode={countryCode} />
                                  )}
                                </p>
                              )}
                            </div>
                            {entry.dateRange && (
                              <Badge variant="secondary" className="shrink-0 text-slate-600 font-normal" data-about-edit={`educationBlocks.${i}.dateRange`}>{entry.dateRange}</Badge>
                            )}
                          </div>
                        </div>
                        {entry.content && (
                          <div className="mt-0.5" data-about-edit={`educationBlocks.${i}.content`}>
                            <MarkdownBodyServer
                              content={normalizeBlockMarkdown(entry.content)}
                              className={markdownArticleClassNameProseSm}
                            />
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                </CardContent>
              </Card>
              </div>
            )}
            {experienceBlocks.length > 0 && (
              <div
                data-about-section="experience"
                style={{ order: sectionOrderIndex("experience"), display: aboutVisible("experience") ? undefined : "none" }}
              >
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Briefcase className="h-5 w-5" />
                    <span data-about-edit="sectionTitles.experience">{sectionTitles.experience}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {experienceBlocks.map((entry, i) => {
                      const entryLogo = (entry.logoUrl && entry.logoUrl.trim()) ? entry.logoUrl : (entry.logoUrl === "" ? null : getCompanyLogo(companyLogos, entry.organization));
                      return (
                      <div
                        key={i}
                        className="border-l-4 border-green-500 pl-3"
                        data-about-block-root
                        data-about-block-section="experience"
                        data-about-block-group="experience"
                        data-about-block-index={i}
                      >
                        <div className="flex gap-2">
                          {entryLogo ? (
                            <div
                              className="relative h-16 w-16 flex-shrink-0"
                              data-about-logo-key={`experienceBlocks.${i}.logoUrl`}
                              data-about-logo-kind="experience"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic CMS URL, not known at build time */}
                              <img src={entryLogo} alt="" className="h-full w-full object-contain" data-about-logo-img />
                            </div>
                          ) : (
                            <div
                              className="hidden h-16 w-16 flex-shrink-0 items-center justify-center rounded border-2 border-dashed border-slate-300 text-[11px] text-slate-500"
                              data-about-logo-key={`experienceBlocks.${i}.logoUrl`}
                              data-about-logo-kind="experience"
                              data-about-logo-empty
                            >
                              + Logo
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5">
                            <div>
                              <h3 className="font-semibold text-slate-900 text-lg mb-0.5" data-about-edit={`experienceBlocks.${i}.title`}>{entry.title}</h3>
                              {entry.organization && (
                                <p className="text-base font-semibold text-slate-700" data-about-edit={`experienceBlocks.${i}.organization`}>{entry.organization}</p>
                              )}
                            </div>
                            {entry.dateRange && (
                              <Badge variant="secondary" className="shrink-0 text-slate-600 font-normal" data-about-edit={`experienceBlocks.${i}.dateRange`}>{entry.dateRange}</Badge>
                            )}
                          </div>
                        </div>
                        {entry.content && (
                          <div className="mt-0.5" data-about-edit={`experienceBlocks.${i}.content`}>
                            <MarkdownBodyServer
                              content={normalizeBlockMarkdown(entry.content)}
                              className={markdownArticleClassNameProseSm}
                            />
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                </CardContent>
              </Card>
              </div>
            )}
            {aboutVisible("volunteer") && (
              <div
                data-about-section="volunteer"
                style={{ order: sectionOrderIndex("volunteer"), display: aboutVisible("volunteer") ? undefined : "none" }}
              >
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <HeartHandshake className="h-5 w-5" />
                    <span data-about-edit="sectionTitles.volunteer">{sectionTitles.volunteer ?? "Volunteer"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {volunteerBlocks.length > 0 ? (
                  <div className="space-y-4">
                    {volunteerBlocks.map((entry, i) => {
                      const entryLogo = (entry.logoUrl && entry.logoUrl.trim()) ? entry.logoUrl : (entry.logoUrl === "" ? null : getCompanyLogo(companyLogos, entry.organization));
                      return (
                      <div
                        key={i}
                        className="border-l-4 border-amber-500 pl-3"
                        data-about-block-root
                        data-about-block-section="volunteer"
                        data-about-block-group="volunteer"
                        data-about-block-index={i}
                      >
                        <div className="flex gap-2">
                          {entryLogo ? (
                            <div
                              className="relative h-16 w-16 flex-shrink-0"
                              data-about-logo-key={`volunteerBlocks.${i}.logoUrl`}
                              data-about-logo-kind="volunteer"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic CMS URL, not known at build time */}
                              <img src={entryLogo} alt="" className="h-full w-full object-contain" data-about-logo-img />
                            </div>
                          ) : (
                            <div
                              className="hidden h-16 w-16 flex-shrink-0 items-center justify-center rounded border-2 border-dashed border-slate-300 text-[11px] text-slate-500"
                              data-about-logo-key={`volunteerBlocks.${i}.logoUrl`}
                              data-about-logo-kind="volunteer"
                              data-about-logo-empty
                            >
                              + Logo
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5">
                            <div>
                              <h3 className="font-semibold text-slate-900 text-lg mb-0.5" data-about-edit={`volunteerBlocks.${i}.title`}>{entry.title}</h3>
                              {entry.organization && (
                                <p className="text-base font-semibold text-slate-700" data-about-edit={`volunteerBlocks.${i}.organization`}>{entry.organization}</p>
                              )}
                            </div>
                            {entry.dateRange && (
                              <Badge variant="secondary" className="shrink-0 text-slate-600 font-normal" data-about-edit={`volunteerBlocks.${i}.dateRange`}>{entry.dateRange}</Badge>
                            )}
                          </div>
                        </div>
                        {entry.content && (
                          <div className="mt-0.5" data-about-edit={`volunteerBlocks.${i}.content`}>
                            <MarkdownBodyServer
                              content={normalizeBlockMarkdown(entry.content)}
                              className={markdownArticleClassNameProseSm}
                            />
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                  ) : (
                    <p className="text-sm text-slate-500">No volunteer entries yet.</p>
                  )}
                </CardContent>
              </Card>
              </div>
            )}
            {customSections.map((section, sectionIndex) => {
              const sectionId = `custom:${section.id}`;
              const sectionBlocks = Array.isArray(section.blocks) ? section.blocks : [];
              return (
                <div
                  key={sectionId}
                  data-about-section={sectionId}
                  data-about-custom-section-id={section.id}
                  style={{ order: sectionOrderIndex(sectionId), display: aboutVisible(sectionId) ? undefined : "none" }}
                >
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-slate-900">
                        <Code className="h-5 w-5" />
                        <span data-about-edit={`customSections.${sectionIndex}.title`}>
                          {section.title || "Custom section"}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {sectionBlocks.map((entry, i) => {
                          const entryLogo = (entry.logoUrl && entry.logoUrl.trim()) ? entry.logoUrl : null;
                          const blockPrefix = `customSections.${sectionIndex}.blocks`;
                          return (
                            <div
                              key={`${sectionId}-${i}`}
                              className="border-l-4 border-slate-400 pl-3"
                              data-about-block-root
                              data-about-block-section="custom"
                              data-about-block-group={sectionId}
                              data-about-block-prefix={blockPrefix}
                              data-about-block-index={i}
                            >
                              <div className="flex gap-2">
                                {entryLogo ? (
                                  <div
                                    className="relative h-16 w-16 flex-shrink-0"
                                    data-about-logo-key={`${blockPrefix}.${i}.logoUrl`}
                                    data-about-logo-kind="custom"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element -- dynamic CMS URL, not known at build time */}
                              <img src={entryLogo} alt="" className="h-full w-full object-contain" data-about-logo-img />
                                  </div>
                                ) : (
                                  <div
                                    className="hidden h-16 w-16 flex-shrink-0 items-center justify-center rounded border-2 border-dashed border-slate-300 text-[11px] text-slate-500"
                                    data-about-logo-key={`${blockPrefix}.${i}.logoUrl`}
                                    data-about-logo-kind="custom"
                                    data-about-logo-empty
                                  >
                                    + Logo
                                  </div>
                                )}
                                <div className="flex-1 min-w-0 flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5">
                                  <div>
                                    <h3 className="font-semibold text-slate-900 text-lg mb-0.5" data-about-edit={`${blockPrefix}.${i}.title`}>{entry.title}</h3>
                                    {entry.organization && (
                                      <p className="text-base font-semibold text-slate-700" data-about-edit={`${blockPrefix}.${i}.organization`}>{entry.organization}</p>
                                    )}
                                  </div>
                                  {entry.dateRange && (
                                    <Badge variant="secondary" className="shrink-0 text-slate-600 font-normal" data-about-edit={`${blockPrefix}.${i}.dateRange`}>{entry.dateRange}</Badge>
                                  )}
                                </div>
                              </div>
                              {entry.content && (
                                <div className="mt-0.5" data-about-edit={`${blockPrefix}.${i}.content`}>
                                  <MarkdownBodyServer
                                    content={normalizeBlockMarkdown(entry.content)}
                                    className={markdownArticleClassNameProseSm}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
            {projectBlocks.length > 0 && (
              <div
                data-about-section="projects"
                style={{ order: sectionOrderIndex("projects"), display: aboutVisible("projects") ? undefined : "none" }}
              >
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Code className="h-5 w-5" />
                    <span data-about-edit="sectionTitles.projects">{sectionTitles.projects}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projectBlocks.map((entry, i) => (
                      <div
                        key={i}
                        className="border-l-4 border-purple-500 pl-3 relative"
                        data-about-block-root
                        data-about-block-section="project"
                        data-about-block-group="projects"
                        data-about-block-index={i}
                      >
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5">
                              <div>
                                <h3 className="font-semibold text-slate-900 text-lg mb-0.5" data-about-edit={`projectBlocks.${i}.title`}>{entry.title}</h3>
                                {entry.organization && (
                                  <p className="text-base font-semibold text-slate-700" data-about-edit={`projectBlocks.${i}.organization`}>{entry.organization}</p>
                                )}
                              </div>
                              {entry.dateRange && (
                                <Badge variant="secondary" className="shrink-0 text-slate-600 font-normal" data-about-edit={`projectBlocks.${i}.dateRange`}>{entry.dateRange}</Badge>
                              )}
                            </div>
                            {entry.content && (
                              <div className="mt-0.5" data-about-edit={`projectBlocks.${i}.content`}>
                                <MarkdownBodyServer
                                  content={normalizeBlockMarkdown(entry.content)}
                                  className={markdownArticleClassNameProseSm}
                                />
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              </div>
            )}

            <div
              data-about-section="skills"
              style={{ order: sectionOrderIndex("skills"), display: aboutVisible("skills") ? undefined : "none" }}
            >
              <AboutSkillsAchievementsEditor
                mode="skills"
                initialSkills={technicalSkills}
                initialAchievements={[]}
                initialSectionTitles={sectionTitles}
              />
            </div>
            <div
              data-about-section="achievements"
              style={{ order: sectionOrderIndex("achievements"), display: aboutVisible("achievements") ? undefined : "none" }}
            >
              <AboutSkillsAchievementsEditor
                mode="achievements"
                initialSkills={[]}
                initialAchievements={achievements}
                initialSectionTitles={sectionTitles}
              />
            </div>

          </>
        )}

        {/* Legacy: one markdown block when no structured blocks */}
        {!useStructuredBlocks && aboutMainContent && aboutMainContent.trim() && (
          <Card className="shadow-lg">
            <CardContent className="pt-6 pb-6">
              <MarkdownBodyServer content={aboutMainContent} className={markdownArticleClassNameProseSlate} />
            </CardContent>
          </Card>
        )}

        {/* Hardcoded Education/Projects/Experience - only when no structured blocks and no main content */}
        {!useStructuredBlocks && (!aboutMainContent || !aboutMainContent.trim()) && (
        <>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <GraduationCap className="h-5 w-5" />
              Education
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-3 relative">
                <div className="flex items-start gap-2">
                  {nycuLogo && (
                    <div className="relative h-16 w-16 flex-shrink-0 mt-0.5">
                      <Image src={nycuLogo} alt="NYCU Logo" fill unoptimized className="object-contain" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-0.5">
                      <h3 className="font-semibold text-slate-900 text-lg flex-1" data-about-edit="educationBlocks.0.title">
                        M.S. in Computer Science
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap" data-about-edit="educationBlocks.0.dateRange">
                        Sep 2023 - Jan 2026
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-0.5" data-about-edit="educationBlocks.0.organization">
                      National Yang Ming Chiao Tung University (NYCU), Taiwan
                    </p>
                    <ul className="space-y-0.5 text-sm text-slate-700 -mt-0.5" data-about-edit="educationBlocks.0.content">
                      <li>• <strong>Thesis:</strong> A CI/CD Framework for Zero Downtime Deployment in Wi‑Fi Mesh Networks</li>
                      <li>• <strong>Research Focus:</strong> Network Function Virtualization (NFV), CI/CD, DevOps, Kubernetes, and Cloud‑Native Technologies</li>
                      <li>• <strong>Advisor:</strong> Prof. Chien‑Chao Tseng (Wireless Internet Laboratory, WinLab)</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="border-l-4 border-green-500 pl-3 relative">
                <div className="flex items-start gap-2">
                  {ntutLogo && (
                    <div className="relative h-16 w-16 flex-shrink-0 mt-0.5">
                      <Image src={ntutLogo} alt="NTUT Logo" fill unoptimized className="object-contain" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-0.5">
                      <h3 className="font-semibold text-slate-900 text-lg flex-1" data-about-edit="educationBlocks.1.title">
                        B.S. in Interaction Design (Media Design Division)
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap" data-about-edit="educationBlocks.1.dateRange">
                        Sep 2019 - Jun 2023
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-0.5" data-about-edit="educationBlocks.1.organization">
                      National Taipei University of Technology (NTUT), Taiwan
                    </p>
                    <ul className="space-y-0.5 text-sm text-slate-700 -mt-0.5" data-about-edit="educationBlocks.1.content">
                      <li>• <strong>Award:</strong> Outstanding Overseas Chinese Graduate of the Year, Presidential Award (3 Semesters)</li>
                      <li>• <strong>Graduation Project:</strong> A Location‑Based AR System for Urban Exploration and Infrastructure Maintenance</li>
                      <li>• <strong>Research Focus:</strong> IoT, Embedded Systems, Full‑Stack Development, AR/VR, Human‑Computer Interaction (HCI)</li>
                      <li>• <strong>Advisor:</strong> Prof. Lydia Hsiao‑Mei Lin</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Code className="h-5 w-5" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-l-4 border-purple-500 pl-3 relative">
                <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                  {project1Image && (
                    <div className="relative w-full md:w-64 h-48 flex-shrink-0 rounded-lg overflow-hidden shadow-md">
                      <Image
                        src={project1Image}
                        alt="CI/CD Framework Project"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-0.5">
                      <h3 className="font-semibold text-slate-900 text-lg flex-1">
                        A CI/CD Framework for Zero Downtime Deployment in Wi‑Fi Mesh Networks
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Feb 2025 - Jan 2026
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-0.5">
                      Master&apos;s Thesis / Industry‑Academia Collaboration with Wistron NeWeb Corporation (WNC)
                    </p>
                    <ul className="space-y-0.5 text-sm text-slate-700 -mt-0.5">
                      <li>• Integrated GitHub Actions with USP APIs to automate cloud‑to‑edge container delivery to Root AP via TR‑369 (USP) standards</li>
                      <li>• Developed a C‑based Controller bridging USP Agent (via UDS) to Extender APs (via TCP) for synchronized mesh updates</li>
                      <li>• Engineered Linux iptables steering to achieve zero packet loss and zero downtime during Blue‑Green/Canary deployments</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="border-l-4 border-orange-500 pl-3 relative">
                <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                  {project2Image && (
                    <div className="relative w-full md:w-64 h-48 flex-shrink-0 rounded-lg overflow-hidden shadow-md">
                      <Image
                        src={project2Image}
                        alt="Kubernetes Multi-Cluster Project"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-0.5">
                      <h3 className="font-semibold text-slate-900 text-lg flex-1">
                        Kubernetes‑based Multi‑Cluster Hybrid Cloud Management System
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Apr 2024 - Sep 2024
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-0.5">
                      Industry‑Academia Collaboration with Iscom Online International Info. Inc.
                    </p>
                    <ul className="space-y-0.5 text-sm text-slate-700 -mt-0.5">
                      <li>• Orchestrated public cloud and on‑premises clusters using Karmada and GitOps (ArgoCD/FluxCD) for automated service propagation</li>
                      <li>• Implemented Cilium Cluster Mesh and HAProxy to enable global traffic steering, cross‑cluster failover, and firewall security policies</li>
                      <li>• Engineered a unified observability stack integrating Thanos, Prometheus, and Grafana for centralized health monitoring</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Experience */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Briefcase className="h-5 w-5" />
              Work Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-l-2 border-slate-300 pl-3">
                <div className="flex items-start gap-2">
                  {getCompanyLogo(companyLogos, "NYCU") && (
                    <div className="relative h-12 w-12 flex-shrink-0 mt-0.5">
                      <Image src={getCompanyLogo(companyLogos, "NYCU") || ""} alt="NYCU Logo" fill unoptimized className="object-contain" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-0.5">
                      <h3 className="font-semibold text-slate-900 flex-1">
                        SDN/NFV Teaching Assistant
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Jul 2023 - Jan 2024
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-0.5">
                      Department of Computer Science, NYCU
                    </p>
                    <ul className="space-y-0.5 text-sm text-slate-700 -mt-0.5">
                      <li>• Refined labs for ONOS SDN modules to implement L2/L3 protocols, including Learning Bridge, Proxy ARP, and Unicast DHCP</li>
                      <li>• Led NFV labs on Docker‑based routing (BGP) and guided final projects on VLAN‑based Segment Routing</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="border-l-2 border-slate-300 pl-3">
                <div className="flex items-start gap-2">
                  {getCompanyLogo(companyLogos, "Makalot") && (
                    <div className="relative h-12 w-12 flex-shrink-0 mt-0.5">
                      <Image src={getCompanyLogo(companyLogos, "Makalot") || ""} alt="Makalot Logo" fill unoptimized className="object-contain" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-0.5">
                      <h3 className="font-semibold text-slate-900 flex-1">
                        Software Engineer Intern
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Jul 2022 - Jun 2023
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-0.5">
                      IT Department, Makalot Industrial Co., Ltd.
                    </p>
                    <ul className="space-y-0.5 text-sm text-slate-700 -mt-0.5">
                      <li>• Developed a Full‑Stack dashboard using Vue.js and ASP.NET Web API to streamline RBAC and system configurations</li>
                      <li>• Engineered a Dockerized OAuth 2.0 Authentication Service with JWT and Dapper ORM to secure cross‑platform ERP API access</li>
                      <li>• Implemented RPA workflows via Power Automate to trigger Microsoft Teams and Outlook alerts, reducing manual effort</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="border-l-2 border-slate-300 pl-3">
                <div className="flex items-start gap-2">
                  {getCompanyLogo(companyLogos, "MUST") && (
                    <div className="relative h-12 w-12 flex-shrink-0 mt-0.5">
                      <Image src={getCompanyLogo(companyLogos, "MUST") || ""} alt="MUST Logo" fill unoptimized className="object-contain" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-0.5">
                      <h3 className="font-semibold text-slate-900 flex-1">
                        Unity Software Engineer (Research Assistant)
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Jan 2022 - Jun 2022
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-0.5">
                      Department of Multimedia & Game Development, MUST
                    </p>
                    <ul className="space-y-0.5 text-sm text-slate-700 -mt-0.5">
                      <li>• Developed an NSTC project using Unity and C#, engineering a cross‑platform system featuring 5 distinct motion‑sensing games</li>
                      <li>• Integrated Google Firebase for real‑time data synchronization to support bilingual (English/Chinese) content and learning analysis</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="border-l-2 border-slate-300 pl-3">
                <div className="flex items-start gap-2">
                  {getCompanyLogo(companyLogos, "NTUT") && (
                    <div className="relative h-12 w-12 flex-shrink-0 mt-0.5">
                      <Image src={getCompanyLogo(companyLogos, "NTUT") || ""} alt="NTUT Logo" fill unoptimized className="object-contain" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-0.5">
                      <h3 className="font-semibold text-slate-900 flex-1">
                        IT Support (Work‑Study)
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Jun 2021 - Jun 2023
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-0.5">
                      Computer and Network Center, NTUT
                    </p>
                    <ul className="space-y-0.5 text-sm text-slate-700 -mt-0.5">
                      <li>• Provided technical support to faculty members, handling PC assembly, OS installation, and troubleshooting campus network issues</li>
                      <li>• Participated in the frontend development of the campus Authorized Software Portal, improving the UI/UX to streamline software downloads</li>
                      <li>• Maintained lab servers and network infrastructure</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Network className="h-5 w-5" />
              Technical Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">
                  Cloud Native & K8s
                </h3>
                <div className="flex flex-wrap gap-2">
                  {["Kubernetes (K8s)", "Docker", "Helm", "Cilium (Service Mesh)", "Karmada", "Harbor", "Linux Containers (LXC)"].map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">
                  CI/CD & GitOps
                </h3>
                <div className="flex flex-wrap gap-2">
                  {["Jenkins", "GitLab CI/CD", "GitHub Actions", "ArgoCD", "Flux CD", "GitOps Workflow", "Git"].map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">
                  Observability
                </h3>
                <div className="flex flex-wrap gap-2">
                  {["Prometheus", "Grafana", "Thanos", "Monitoring & Logging"].map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">
                  Infrastructure & Networking
                </h3>
                <div className="flex flex-wrap gap-2">
                  {["Google Cloud Platform (GCP)", "Proxmox VE", "Ansible", "Linux Networking", "SSL/TLS Management"].map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Trophy className="h-5 w-5" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Award className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    National Makerthon: Good Health and Well‑Being - 1st Place
                  </p>
                  <p className="text-xs text-slate-500">Ministry of Education 2022</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Award className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Vision Get Wild XR Social Welfare Potential Award
                  </p>
                  <p className="text-xs text-slate-500">Meta XR Hub Taiwan 2023</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Award className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Intel® DevCup x OpenVINO™ Toolkit Competition - Shortlisted
                  </p>
                  <p className="text-xs text-slate-500">Intel Corporation 2021</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Award className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    5G Mobileheroes - Shortlisted
                  </p>
                  <p className="text-xs text-slate-500">Industrial Development Administration 2021</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-900">Let&apos;s Connect</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-slate-700">
              I&apos;m always open to discussing new opportunities, collaborations, or just having 
              a conversation about technology. Feel free to reach out!
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="mailto:hello@example.com">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
              </Link>
              <Link
                href="https://www.linkedin.com/company/your-brand"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full sm:w-auto">
                  <Linkedin className="mr-2 h-4 w-4" />
                  LinkedIn
                </Button>
              </Link>
              <Link
                href="https://github.com/your-org"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full sm:w-auto">
                  <Github className="mr-2 h-4 w-4" />
                  GitHub
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        </>
        )}
      </div>
    </PublicPageShell>
  );
}
