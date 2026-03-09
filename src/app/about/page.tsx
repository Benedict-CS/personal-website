import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Linkedin, Github, GraduationCap, Briefcase, Award, Trophy, Download, Code, Network } from "lucide-react";
import { getSiteConfigForRender } from "@/lib/site-config";
import { prisma } from "@/lib/prisma";
import { AboutHighlightScroll } from "@/components/about-highlight-scroll";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { CountryFlag } from "@/components/country-flag";
import { PublicBreadcrumbs } from "@/components/public-breadcrumbs";
import { Suspense } from "react";

export const revalidate = 30;
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfigForRender();
  const ogUrl = config.ogImageUrl
    ? (config.ogImageUrl.startsWith("http") ? config.ogImageUrl : new URL(config.ogImageUrl, config.url).toString())
    : undefined;
  return {
    title: "About Me",
    description:
      "Learn more about the site owner, background, projects, and work experience.",
    openGraph: {
      title: "About Me",
      description:
        "Learn more about the site owner, background, projects, and work experience.",
      url: `${config.url}/about`,
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

export interface AboutBlockEntry {
  title: string;
  logoUrl?: string | null;
  organization: string;
  /** ISO 3166-1 alpha-2 country code (e.g. TW, US) for Education; shown as flag after school name */
  countryCode?: string | null;
  dateRange: string;
  content: string;
}

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
        projectBlocks: [] as AboutBlockEntry[],
        schoolLogos: [] as SchoolLogo[],
        projectImages: [] as ProjectImage[],
        companyLogos: [] as CompanyLogo[],
        contactHeading: null,
        contactText: null,
        contactLinks: [] as { label: string; url: string }[],
        technicalSkills: [] as { category: string; items: string[] }[],
        achievements: [] as { title: string; organization: string; year: string }[],
        sectionOrder: ["education", "experience", "projects", "skills", "achievements"],
        sectionVisibility: {} as Record<string, boolean>,
      };
    }
    const c = config as {
      introText?: string | null;
      aboutMainContent?: string | null;
      educationBlocks?: string;
      experienceBlocks?: string;
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
      sectionOrder?: string;
      sectionVisibility?: string;
    };
    const parseJson = (s: string | null | undefined, fallback: unknown): unknown => {
      if (s == null || s === "") return fallback;
      try { return JSON.parse(s); } catch { return fallback; }
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
      projectBlocks: parseJson(c.projectBlocks, []) as AboutBlockEntry[],
      schoolLogos: config.schoolLogos ? (JSON.parse(config.schoolLogos) as SchoolLogo[]) : [],
      projectImages: config.projectImages ? (JSON.parse(config.projectImages) as ProjectImage[]) : [],
      companyLogos: config.companyLogos ? (JSON.parse(config.companyLogos) as CompanyLogo[]) : [],
      contactHeading: c.contactHeading ?? null,
      contactText: c.contactText ?? null,
      contactLinks: (parseJson(c.contactLinks ?? (config as { contactLinks?: string }).contactLinks, []) as { label: string; url: string }[]),
      technicalSkills: (parseJson(c.technicalSkills ?? (config as { technicalSkills?: string }).technicalSkills, []) as { category: string; items: string[] }[]),
      achievements: (parseJson(c.achievements ?? (config as { achievements?: string }).achievements, []) as { title: string; organization: string; year: string }[]),
      sectionOrder: (parseJson(c.sectionOrder, ["education", "experience", "projects", "skills", "achievements"]) as string[]).filter((id) => ["education", "experience", "projects", "skills", "achievements"].includes(id)),
      sectionVisibility: (parseJson(c.sectionVisibility, {}) as Record<string, boolean>),
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
      projectBlocks: [] as AboutBlockEntry[],
      schoolLogos: [] as SchoolLogo[],
      projectImages: [] as ProjectImage[],
      companyLogos: [] as CompanyLogo[],
      contactHeading: null,
      contactText: null,
      contactLinks: [] as { label: string; url: string }[],
      technicalSkills: [] as { category: string; items: string[] }[],
      achievements: [] as { title: string; organization: string; year: string }[],
      sectionOrder: ["education", "experience", "projects", "skills", "achievements"],
      sectionVisibility: {} as Record<string, boolean>,
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

export default async function AboutPage() {
  const config = await getAboutConfig();
  const { profileImage, heroName, heroTagline, introText, aboutMainContent, educationBlocks, experienceBlocks, projectBlocks, schoolLogos, projectImages, companyLogos, technicalSkills, achievements, sectionVisibility } = config;
  const aboutVisible = (id: string) => sectionVisibility?.[id] !== false;
  const useStructuredBlocks = educationBlocks.length > 0 || experienceBlocks.length > 0 || projectBlocks.length > 0;

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
    <div className="container mx-auto max-w-5xl px-6 py-12">
      <PublicBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />
      <Suspense fallback={null}>
        <AboutHighlightScroll />
      </Suspense>
      <div className="space-y-8" data-about-content>
        {/* Hero: profile card (name, tagline, contact, CV) — first thing visitors see */}
        {/* Hero + Intro merged into one card for a tighter, less empty layout */}
        <Card className="shadow-lg">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              {profileImage ? (
                <div className="mb-6 inline-block">
                  <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-slate-200 shadow-md mx-auto">
                    <Image
                      src={profileImage}
                      alt={heroName?.trim() || "Profile"}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-6 inline-flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-5xl font-bold text-white shadow-md">
                  {(heroName?.trim() || "B")[0]}
                </div>
              )}
              <h1 className="mb-2 text-4xl font-bold text-slate-900">
                {heroName?.trim() || "Your Name"}
              </h1>
              {(heroTagline?.trim()) ? (
                <p className="mb-2 text-lg text-slate-600">
                  {heroTagline}
                </p>
              ) : (
                <p className="mb-2 text-lg text-slate-600">
                  Builder Owner | Product Creator
                </p>
              )}
              <div className="flex justify-center gap-3 mt-6">
                <Link href="/api/cv/download" download="site-owner-cv.pdf" prefetch={false}>
                  <Button variant="default" className="gap-2 shadow-md">
                    <Download className="h-4 w-4" />
                    Download CV (PDF)
                  </Button>
                </Link>
              </div>
            </div>
            {introText && introText.trim() && (
              <div className="mt-8 pt-6 border-t border-slate-200 text-left max-w-4xl mx-auto px-0">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{introText}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Structured blocks from dashboard (Education, Experience, Projects) - template: title, logo, org, date, content */}
        {useStructuredBlocks && (
          <>
            {aboutVisible("education") && educationBlocks.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <GraduationCap className="h-5 w-5" />
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {educationBlocks.map((entry, i) => {
                      const entryLogo = (entry.logoUrl && entry.logoUrl.trim()) ? entry.logoUrl : (entry.logoUrl === "" ? null : getSchoolLogo(schoolLogos, entry.organization));
                      return (
                      <div key={i} className="border-l-4 border-blue-500 pl-3">
                        <div className="flex gap-2">
                          {entryLogo && (
                            <div className="relative h-16 w-16 flex-shrink-0">
                              <Image src={entryLogo} alt="" fill unoptimized className="object-contain" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5">
                            <div>
                              <h3 className="font-semibold text-slate-900 text-lg mb-0.5">{entry.title}</h3>
                              {entry.organization && (
                                <p className="text-base font-semibold text-slate-700 flex items-center gap-1.5 flex-wrap">
                                  <span>{entry.organization}</span>
                                  {entry.countryCode?.trim() && (
                                    <CountryFlag countryCode={entry.countryCode} />
                                  )}
                                </p>
                              )}
                            </div>
                            {entry.dateRange && (
                              <Badge variant="secondary" className="shrink-0 text-slate-600 font-normal">{entry.dateRange}</Badge>
                            )}
                          </div>
                        </div>
                        {entry.content && (
                          <div className="mt-0.5">
                            <div className="prose prose-slate prose-sm max-w-none text-sm">
                              <MarkdownRenderer content={entry.content} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
            {aboutVisible("experience") && experienceBlocks.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Briefcase className="h-5 w-5" />
                    Experience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {experienceBlocks.map((entry, i) => {
                      const entryLogo = (entry.logoUrl && entry.logoUrl.trim()) ? entry.logoUrl : (entry.logoUrl === "" ? null : getCompanyLogo(companyLogos, entry.organization));
                      return (
                      <div key={i} className="border-l-4 border-green-500 pl-3">
                        <div className="flex gap-2">
                          {entryLogo && (
                            <div className="relative h-16 w-16 flex-shrink-0">
                              <Image src={entryLogo} alt="" fill unoptimized className="object-contain" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5">
                            <div>
                              <h3 className="font-semibold text-slate-900 text-lg mb-0.5">{entry.title}</h3>
                              {entry.organization && (
                                <p className="text-base font-semibold text-slate-700">{entry.organization}</p>
                              )}
                            </div>
                            {entry.dateRange && (
                              <Badge variant="secondary" className="shrink-0 text-slate-600 font-normal">{entry.dateRange}</Badge>
                            )}
                          </div>
                        </div>
                        {entry.content && (
                          <div className="mt-0.5">
                            <div className="prose prose-slate prose-sm max-w-none text-sm">
                              <MarkdownRenderer content={entry.content} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
            {aboutVisible("projects") && projectBlocks.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Code className="h-5 w-5" />
                    Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projectBlocks.map((entry, i) => (
                      <div key={i} className="border-l-4 border-purple-500 pl-3 relative">
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5">
                              <div>
                                <h3 className="font-semibold text-slate-900 text-lg mb-0.5">{entry.title}</h3>
                                {entry.organization && (
                                  <p className="text-base font-semibold text-slate-700">{entry.organization}</p>
                                )}
                              </div>
                              {entry.dateRange && (
                                <Badge variant="secondary" className="shrink-0 text-slate-600 font-normal">{entry.dateRange}</Badge>
                              )}
                            </div>
                            {entry.content && (
                              <div className="mt-0.5">
                                <div className="prose prose-slate prose-sm max-w-none text-sm">
                                  <MarkdownRenderer content={entry.content} />
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Technical Skills — from config or default when empty */}
            {aboutVisible("skills") && (() => {
              const skills = technicalSkills.length > 0 ? technicalSkills : [
                { category: "Cloud Native & K8s", items: ["Kubernetes (K8s)", "Docker", "Helm", "Cilium (Service Mesh)", "Karmada", "Harbor", "Linux Containers (LXC)"] },
                { category: "CI/CD & GitOps", items: ["Jenkins", "GitLab CI/CD", "GitHub Actions", "ArgoCD", "Flux CD", "GitOps Workflow", "Git"] },
                { category: "Observability", items: ["Prometheus", "Grafana", "Thanos", "Monitoring & Logging"] },
                { category: "Infrastructure & Networking", items: ["Google Cloud Platform (GCP)", "Proxmox VE", "Ansible", "Linux Networking", "SSL/TLS Management"] },
              ];
              return (
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <Network className="h-5 w-5" />
                      Technical Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {skills.map((section, i) => (
                        <div key={i}>
                          <h3 className="mb-2 text-sm font-semibold text-slate-800">{section.category}</h3>
                          <div className="flex flex-wrap gap-2">
                            {section.items.map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Achievements — from config or default when empty */}
            {aboutVisible("achievements") && (() => {
              const list = achievements.length > 0 ? achievements : [
                { title: "National Makerthon: Good Health and Well‑Being - 1st Place", organization: "Ministry of Education 2022", year: "2022" },
                { title: "Vision Get Wild XR Social Welfare Potential Award", organization: "Meta XR Hub Taiwan 2023", year: "2023" },
                { title: "Intel® DevCup x OpenVINO™ Toolkit Competition - Shortlisted", organization: "Intel Corporation 2021", year: "2021" },
                { title: "5G Mobileheroes - Shortlisted", organization: "Industrial Development Administration 2021", year: "2021" },
              ];
              return (
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <Trophy className="h-5 w-5" />
                      Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {list.map((a, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <Award className="mt-0.5 h-4 w-4 text-slate-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-800">{a.title}</p>
                            <p className="text-xs text-slate-500">{a.organization}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

          </>
        )}

        {/* Legacy: one markdown block when no structured blocks */}
        {!useStructuredBlocks && aboutMainContent && aboutMainContent.trim() && (
          <Card className="shadow-lg">
            <CardContent className="pt-6 pb-6 prose prose-slate max-w-none">
              <MarkdownRenderer content={aboutMainContent} />
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
                      <h3 className="font-semibold text-slate-900 text-lg flex-1">
                        M.S. in Computer Science
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Sep 2023 - Jan 2026
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-0.5">
                      National Yang Ming Chiao Tung University (NYCU), Taiwan
                    </p>
                    <ul className="space-y-0.5 text-sm text-slate-700 -mt-0.5">
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
                      <h3 className="font-semibold text-slate-900 text-lg flex-1">
                        B.S. in Interaction Design (Media Design Division)
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0 whitespace-nowrap">
                        Sep 2019 - Jun 2023
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-0.5">
                      National Taipei University of Technology (NTUT), Taiwan
                    </p>
                    <ul className="space-y-0.5 text-sm text-slate-700 -mt-0.5">
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
    </div>
  );
}
