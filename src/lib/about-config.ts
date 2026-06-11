import { prisma } from "@/lib/prisma";

export interface SchoolLogo {
  school: string;
  logo: string;
}

export interface ProjectImage {
  project: string;
  image: string;
}

export interface CompanyLogo {
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

export interface AboutCustomSection {
  id: string;
  title: string;
  blocks: AboutBlockEntry[];
}

export interface ContactLink {
  label: string;
  url: string;
}

export interface TechnicalSkillGroup {
  category: string;
  items: string[];
}

export interface Achievement {
  title: string;
  organization: string;
  year: string;
}

export const DEFAULT_SECTION_TITLES = {
  education: "Education",
  experience: "Experience",
  volunteer: "Volunteer",
  projects: "Projects",
  skills: "Technical Skills",
  achievements: "Achievements",
};

const DEFAULT_SECTION_ORDER = ["education", "experience", "volunteer", "projects", "skills", "achievements"];
const KNOWN_SECTION_IDS = new Set(DEFAULT_SECTION_ORDER);

export interface AboutConfigData {
  profileImage: string | null;
  heroName: string | null;
  heroTagline: string | null;
  heroPhone: string | null;
  heroEmail: string | null;
  heroPortfolioLabel: string | null;
  heroPortfolioUrl: string | null;
  introText: string | null;
  aboutMainContent: string | null;
  educationBlocks: AboutBlockEntry[];
  experienceBlocks: AboutBlockEntry[];
  volunteerBlocks: AboutBlockEntry[];
  projectBlocks: AboutBlockEntry[];
  schoolLogos: SchoolLogo[];
  projectImages: ProjectImage[];
  companyLogos: CompanyLogo[];
  contactHeading: string | null;
  contactText: string | null;
  contactLinks: ContactLink[];
  technicalSkills: TechnicalSkillGroup[];
  achievements: Achievement[];
  customSections: AboutCustomSection[];
  sectionOrder: string[];
  sectionVisibility: Record<string, boolean>;
  sectionTitles: typeof DEFAULT_SECTION_TITLES;
  /** Pre-built lookup map for company logos (normalized name -> url). Built once at fetch time. */
  companyLogoIndex: Map<string, string>;
  /** Pre-normalized markdown content per block, keyed by section+index, computed once at fetch time. */
  normalizedBlockContent: Map<string, string>;
}

function emptyConfig(): AboutConfigData {
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
    educationBlocks: [],
    experienceBlocks: [],
    volunteerBlocks: [],
    projectBlocks: [],
    schoolLogos: [],
    projectImages: [],
    companyLogos: [],
    contactHeading: null,
    contactText: null,
    contactLinks: [],
    technicalSkills: [],
    achievements: [],
    customSections: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    sectionVisibility: {},
    sectionTitles: { ...DEFAULT_SECTION_TITLES },
    companyLogoIndex: new Map(),
    normalizedBlockContent: new Map(),
  };
}

function parseJsonField<T>(s: string | null | undefined, fallback: T): T {
  if (s == null || s === "") return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

const LIST_PREFIX_RE = /^\s*(?:[-*+]|\d+\.)\s+/m;

/**
 * Wrap every visible line as a list item — including the single-line case.
 * Previously a one-liner rendered as a plain paragraph, breaking the bulleted
 * look in Experience / Volunteer / Custom sections when an entry had only one
 * achievement.
 */
export function normalizeBlockMarkdown(content: string): string {
  const raw = (content || "").trim();
  if (!raw) return raw;
  if (LIST_PREFIX_RE.test(raw)) return raw;
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return raw;
  return lines.map((line) => `- ${line}`).join("\n");
}

function buildCompanyLogoIndex(companyLogos: CompanyLogo[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of companyLogos) {
    if (!entry?.company || !entry?.logo) continue;
    const key = entry.company.toLowerCase().trim();
    if (key && !map.has(key)) map.set(key, entry.logo);
  }
  return map;
}

function precomputeNormalizedBlocks(
  groups: Array<{ key: string; blocks: AboutBlockEntry[] }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const { key, blocks } of groups) {
    blocks.forEach((entry, i) => {
      if (entry?.content) {
        map.set(`${key}.${i}`, normalizeBlockMarkdown(entry.content));
      }
    });
  }
  return map;
}

export async function getAboutConfig(): Promise<AboutConfigData> {
  try {
    const config = await prisma.aboutConfig.findFirst();
    if (!config) return emptyConfig();

    // All JSON columns are typed as TEXT in the schema, so the Prisma row exposes
    // them as strings. Cast once here so every parse below shares the same view.
    const c = config as unknown as {
      profileImage: string | null;
      introText?: string | null;
      aboutMainContent?: string | null;
      educationBlocks?: string;
      experienceBlocks?: string;
      volunteerBlocks?: string;
      projectBlocks?: string;
      schoolLogos?: string;
      projectImages?: string;
      companyLogos?: string;
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

    const rawSectionVisibility = parseJsonField<Record<string, unknown>>(c.sectionVisibility, {});
    const sectionVisibility = Object.fromEntries(
      Object.entries(rawSectionVisibility).filter(
        ([key, value]) => key !== "__sectionTitles" && typeof value === "boolean"
      )
    ) as Record<string, boolean>;
    const sectionTitles = {
      ...DEFAULT_SECTION_TITLES,
      ...((rawSectionVisibility["__sectionTitles"] as Record<string, string> | undefined) ?? {}),
    };

    const educationBlocks = parseJsonField<AboutBlockEntry[]>(c.educationBlocks, []);
    const experienceBlocks = parseJsonField<AboutBlockEntry[]>(c.experienceBlocks, []);
    const volunteerBlocks = parseJsonField<AboutBlockEntry[]>(c.volunteerBlocks, []);
    const projectBlocks = parseJsonField<AboutBlockEntry[]>(c.projectBlocks, []);
    const schoolLogos = parseJsonField<SchoolLogo[]>(c.schoolLogos, []);
    const projectImages = parseJsonField<ProjectImage[]>(c.projectImages, []);
    const companyLogos = parseJsonField<CompanyLogo[]>(c.companyLogos, []);
    const customSections = parseJsonField<AboutCustomSection[]>(c.customSections, []);

    const rawSectionOrder = parseJsonField<unknown[]>(c.sectionOrder, [...DEFAULT_SECTION_ORDER]);
    const sectionOrder = rawSectionOrder.filter(
      (id): id is string =>
        typeof id === "string" && (KNOWN_SECTION_IDS.has(id) || id.startsWith("custom:"))
    );

    const companyLogoIndex = buildCompanyLogoIndex(companyLogos);

    const customBlockGroups = customSections.map((section, sectionIndex) => ({
      key: `customSections.${sectionIndex}.blocks`,
      blocks: Array.isArray(section.blocks) ? section.blocks : [],
    }));
    const normalizedBlockContent = precomputeNormalizedBlocks([
      { key: "educationBlocks", blocks: educationBlocks },
      { key: "experienceBlocks", blocks: experienceBlocks },
      { key: "volunteerBlocks", blocks: volunteerBlocks },
      { key: "projectBlocks", blocks: projectBlocks },
      ...customBlockGroups,
    ]);

    return {
      profileImage: c.profileImage,
      heroName: c.heroName ?? null,
      heroTagline: c.heroTagline ?? null,
      heroPhone: c.heroPhone ?? null,
      heroEmail: c.heroEmail ?? null,
      heroPortfolioLabel: c.heroPortfolioLabel ?? null,
      heroPortfolioUrl: c.heroPortfolioUrl ?? null,
      introText: c.introText ?? null,
      aboutMainContent: c.aboutMainContent ?? null,
      educationBlocks,
      experienceBlocks,
      volunteerBlocks,
      projectBlocks,
      schoolLogos,
      projectImages,
      companyLogos,
      contactHeading: c.contactHeading ?? null,
      contactText: c.contactText ?? null,
      contactLinks: parseJsonField<ContactLink[]>(c.contactLinks, []),
      technicalSkills: parseJsonField<TechnicalSkillGroup[]>(c.technicalSkills, []),
      achievements: parseJsonField<Achievement[]>(c.achievements, []),
      customSections,
      sectionOrder,
      sectionVisibility,
      sectionTitles,
      companyLogoIndex,
      normalizedBlockContent,
    };
  } catch (error) {
    console.error("Error loading about config:", error);
    return emptyConfig();
  }
}

export function getSchoolLogo(schoolLogos: SchoolLogo[], schoolName: string): string | null {
  if (!schoolLogos || schoolLogos.length === 0) return null;
  const normalizedSchoolName = schoolName.toLowerCase().trim();
  const logo = schoolLogos.find((l) => {
    const normalizedLogoName = l.school.toLowerCase().trim();
    if (normalizedLogoName === normalizedSchoolName) return true;
    if (normalizedSchoolName.includes(normalizedLogoName) || normalizedLogoName.includes(normalizedSchoolName)) return true;
    if (
      (normalizedSchoolName.includes("nycu") || normalizedSchoolName.includes("yang ming")) &&
      (normalizedLogoName.includes("nycu") || normalizedLogoName.includes("yang ming"))
    )
      return true;
    if (
      (normalizedSchoolName.includes("ntut") || normalizedSchoolName.includes("taipei tech")) &&
      (normalizedLogoName.includes("ntut") || normalizedLogoName.includes("taipei tech"))
    )
      return true;
    return false;
  });
  return logo?.logo || null;
}

export function getProjectImage(projectImages: ProjectImage[], projectName: string): string | null {
  if (!projectImages || projectImages.length === 0) return null;
  const normalizedProjectName = projectName.toLowerCase().trim();
  const image = projectImages.find((p) => {
    const normalizedImageName = p.project.toLowerCase().trim();
    if (normalizedImageName === normalizedProjectName) return true;
    if (normalizedProjectName.includes(normalizedImageName) || normalizedImageName.includes(normalizedProjectName)) return true;
    if (
      (normalizedProjectName.includes("ci/cd") || normalizedProjectName.includes("cicd") || normalizedProjectName.includes("zero downtime")) &&
      (normalizedImageName.includes("ci/cd") || normalizedImageName.includes("cicd") || normalizedImageName.includes("zero downtime"))
    )
      return true;
    if (
      (normalizedProjectName.includes("kubernetes") || normalizedProjectName.includes("k8s") || normalizedProjectName.includes("multi-cluster")) &&
      (normalizedImageName.includes("kubernetes") || normalizedImageName.includes("k8s") || normalizedImageName.includes("multi-cluster"))
    )
      return true;
    return false;
  });
  return image?.image || null;
}

export function getCompanyLogo(companyLogos: CompanyLogo[], companyName: string): string | null {
  if (!companyLogos || companyLogos.length === 0) return null;
  const normalizedCompanyName = companyName.toLowerCase().trim();
  const logo = companyLogos.find((c) => {
    const normalizedLogoName = c.company.toLowerCase().trim();
    if (normalizedLogoName === normalizedCompanyName) return true;
    if (normalizedCompanyName.includes(normalizedLogoName) || normalizedLogoName.includes(normalizedCompanyName)) return true;
    if (
      (normalizedCompanyName.includes("nycu") || normalizedCompanyName.includes("yang ming")) &&
      (normalizedLogoName.includes("nycu") || normalizedLogoName.includes("yang ming"))
    )
      return true;
    if (normalizedCompanyName.includes("makalot") && normalizedLogoName.includes("makalot")) return true;
    if (normalizedCompanyName.includes("iscom") && normalizedLogoName.includes("iscom")) return true;
    if (normalizedCompanyName.includes("must") && normalizedLogoName.includes("must")) return true;
    if (
      (normalizedCompanyName.includes("ntut") || normalizedCompanyName.includes("taipei tech")) &&
      (normalizedLogoName.includes("ntut") || normalizedLogoName.includes("taipei tech"))
    )
      return true;
    return false;
  });
  return logo?.logo || null;
}

export function getEducationLogoFallback(
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

const COUNTRY_HINTS: Array<[string, string]> = [
  ["taiwan", "TW"],
  ["malaysia", "MY"],
  ["malaysian", "MY"],
  ["nycu", "TW"],
  ["ntut", "TW"],
  ["taipei tech", "TW"],
  ["must", "TW"],
  ["minghsin", "TW"],
  ["nthu", "TW"],
  ["ncku", "TW"],
  ["united states", "US"],
  ["usa", "US"],
  ["japan", "JP"],
];

export function inferCountryCodeFromOrganization(name: string): string | null {
  if (!name) return null;
  const normalized = name.toLowerCase();
  for (const [needle, code] of COUNTRY_HINTS) {
    if (normalized.includes(needle)) return code;
  }
  return null;
}
