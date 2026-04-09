"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  Eye,
  LayoutPanelTop,
  Smartphone,
  Monitor,
  ImagePlus,
  Upload,
  Save,
  Download,
  FileUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { InsertMediaModal } from "@/components/insert-media-modal";
import { useToast } from "@/contexts/toast-context";
import {
  formFieldsToMarkdown,
  parseFormFieldsText,
  parseProjectsText,
  parseSkillsText,
  parseTimelineText,
  projectsToMarkdown,
  skillsToMarkdown,
  timelineToMarkdown,
} from "@/lib/personal-brand-blocks";
import { SkillBlockIcon } from "@/components/personal-brand/skill-block-icon";

type BlockType =
  | "hero"
  | "professionalHero"
  | "resumeTimeline"
  | "projectShowcase"
  | "skillGrid"
  | "contactFormModular"
  | "codeSnippet"
  | "githubStats"
  | "leetcodeStats"
  | "text"
  | "gallery"
  | "cta"
  | "faq"
  | "pricing"
  | "video"
  | "columns"
  | "testimonials"
  | "stats"
  | "logoCloud"
  | "team"
  | "comparison";
type SiteTheme = "clean" | "soft" | "bold";
type StylePreset = "minimal" | "card" | "highlight";
type SpacingPreset = "compact" | "normal" | "spacious";
type RadiusPreset = "none" | "sm" | "md" | "lg";
type ShadowPreset = "none" | "sm" | "md";
type TextAlignPreset = "left" | "center";

type SiteBlock = {
  id: string;
  type: BlockType;
  stylePreset?: StylePreset;
  spacing?: SpacingPreset;
  radius?: RadiusPreset;
  shadow?: ShadowPreset;
  align?: TextAlignPreset;
  title?: string;
  subtitle?: string;
  markdown?: string;
  buttonText?: string;
  buttonUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
  linksText?: string;
  qaText?: string;
  plansText?: string;
  videoUrl?: string;
  caption?: string;
  columnsCount?: 2 | 3;
  columnsText?: string;
  mobileBehavior?: "stack" | "scroll";
  testimonialsText?: string;
  statsText?: string;
  logosText?: string;
  teamText?: string;
  comparisonText?: string;
  /** Professional hero: headshot URL from Media library */
  profileImageUrl?: string;
  tagline?: string;
  /** One line per entry: Period|Role|Organization|Description */
  timelineText?: string;
  /** One line per project: Title|Summary|URL|Image URL */
  projectsText?: string;
  /** One line per skill: Name|icon-key|level */
  skillsText?: string;
  /** One line per field: Label|text|email|textarea|tel|url|required */
  formFieldsText?: string;
  /** Syntax-highlighted code (developer block) */
  codeText?: string;
  codeLanguage?: string;
  codeFilename?: string;
  githubUsername?: string;
  /** repos = repository list; overview = profile + streak card */
  githubStatsVariant?: "repos" | "overview";
  leetcodeUsername?: string;
};

type SavedTemplate = {
  id: string;
  name: string;
  theme: SiteTheme;
  blocks: SiteBlock[];
  createdAt: string;
};

type ReusableComponent = {
  id: string;
  name: string;
  block: SiteBlock;
  createdAt: string;
};

type BrandConfig = {
  brandName: string;
  brandLogoUrl: string;
  primaryColor: string;
  accentColor: string;
};

const TEMPLATE_STORAGE_KEY = "site-builder-templates-v1";
const COMPONENT_STORAGE_KEY = "site-builder-components-v1";

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `block_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function withBaseStyle(block: SiteBlock): SiteBlock {
  return {
    stylePreset: block.stylePreset ?? "minimal",
    spacing: block.spacing ?? "normal",
    radius: block.radius ?? "md",
    shadow: block.shadow ?? "none",
    align: block.align ?? "left",
    ...block,
  };
}

function createBlock(type: BlockType): SiteBlock {
  if (type === "hero") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Your main headline",
      subtitle: "Short supporting paragraph that explains your value clearly.",
      buttonText: "Get started",
      buttonUrl: "#",
      secondaryButtonText: "Learn more",
      secondaryButtonUrl: "#",
      stylePreset: "highlight",
      align: "center",
      shadow: "sm",
    });
  }
  if (type === "professionalHero") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Your name",
      tagline: "Role · Focus area",
      subtitle: "One or two sentences about what you do and who you help.",
      profileImageUrl: "",
      buttonText: "Get in touch",
      buttonUrl: "#contact",
      secondaryButtonText: "View work",
      secondaryButtonUrl: "#",
      align: "center",
      stylePreset: "card",
      shadow: "sm",
    });
  }
  if (type === "resumeTimeline") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Experience",
      timelineText:
        "2023–Present|Staff Engineer|Example Corp|Shipped core platform APIs and mentored engineers.\n2020–2023|Software Developer|Startup Labs|Full-stack product delivery.",
      stylePreset: "minimal",
    });
  }
  if (type === "projectShowcase") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Selected projects",
      projectsText:
        "Portfolio site|Personal brand and blog|https://example.com|https://placehold.co/400x240\nOpen toolkit|CLI utilities|https://github.com|https://placehold.co/400x240",
      stylePreset: "card",
    });
  }
  if (type === "skillGrid") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Skills",
      skillsText: "TypeScript|code|Strong\nReact|layers|Advanced\nWriting|pen-line|Solid",
      stylePreset: "minimal",
      align: "center",
    });
  }
  if (type === "contactFormModular") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Contact",
      subtitle: "Messages go to your site contact endpoint when wired to a form handler.",
      formFieldsText: "Full name|text|required\nEmail|email|required\nMessage|textarea|required",
      stylePreset: "card",
    });
  }
  if (type === "codeSnippet") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Code snippet",
      codeLanguage: "typescript",
      codeFilename: "example.ts",
      codeText: 'import { greet } from "./hello";\n\ngreet("world");',
      stylePreset: "minimal",
    });
  }
  if (type === "githubStats") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "GitHub",
      githubUsername: "octocat",
      githubStatsVariant: "overview",
      stylePreset: "minimal",
    });
  }
  if (type === "leetcodeStats") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "LeetCode",
      leetcodeUsername: "",
      stylePreset: "minimal",
    });
  }
  if (type === "gallery") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Gallery",
      linksText: "https://example.com/image-1.jpg\nhttps://example.com/image-2.jpg",
      stylePreset: "card",
    });
  }
  if (type === "cta") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Ready to get started?",
      subtitle: "Build your website and publish in minutes.",
      buttonText: "Start now",
      buttonUrl: "#",
      stylePreset: "highlight",
      align: "center",
    });
  }
  if (type === "faq") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Frequently asked questions",
      qaText:
        "What problem does this solve?|It helps non-technical users build a polished website quickly.\nHow long does setup take?|Most users can publish in under one hour.",
      stylePreset: "minimal",
    });
  }
  if (type === "pricing") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Pricing",
      plansText:
        "Starter|$9/mo|1 website;Basic analytics;Email support\nPro|$29/mo|Unlimited pages;Advanced analytics;Priority support",
      stylePreset: "card",
    });
  }
  if (type === "video") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Product walkthrough",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      caption: "Short caption for context.",
      stylePreset: "card",
    });
  }
  if (type === "columns") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Multi-column highlights",
      columnsCount: 2,
      mobileBehavior: "stack",
      columnsText:
        "Column 1 title\n- Point one\n- Point two\n---\nColumn 2 title\n- Point one\n- Point two",
      stylePreset: "card",
    });
  }
  if (type === "testimonials") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Testimonials",
      testimonialsText:
        "Alex Chen|Founder @ Acme|This platform saved us days of setup.\nMaya Liu|Product Designer|The builder is intuitive and fast.",
      stylePreset: "card",
    });
  }
  if (type === "stats") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Impact in numbers",
      statsText: "Projects delivered|120+\nCustomer satisfaction|98%\nAverage launch time|< 1 hour",
      stylePreset: "highlight",
      align: "center",
    });
  }
  if (type === "logoCloud") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Trusted by teams",
      logosText: "https://example.com/logo1.png\nhttps://example.com/logo2.png\nhttps://example.com/logo3.png",
      stylePreset: "minimal",
      align: "center",
    });
  }
  if (type === "team") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Team",
      teamText:
        "Alex|Founder|Builds product and platform.|https://example.com/avatar-1.jpg\nJamie|Design Lead|Owns UX and visual quality.|https://example.com/avatar-2.jpg",
      stylePreset: "card",
    });
  }
  if (type === "comparison") {
    return withBaseStyle({
      id: makeId(),
      type,
      title: "Feature comparison",
      comparisonText:
        "Feature|Starter|Pro\nCustom domain|No|Yes\nAnalytics|Basic|Advanced\nPriority support|No|Yes",
      stylePreset: "minimal",
    });
  }
  return withBaseStyle({
    id: makeId(),
    type: "text",
    markdown: "## Section title\n\nWrite your content here.",
  });
}

function splitColumns(text: string, desiredCount: number): string[] {
  const parts = text
    .split("\n---\n")
    .map((p) => p.trim())
    .filter(Boolean);
  const safe = parts.slice(0, desiredCount);
  while (safe.length < desiredCount) safe.push(`Column ${safe.length + 1}`);
  return safe;
}

function applyStyleWrappers(markdown: string, block: SiteBlock): string {
  const cls = [
    `preset-${block.stylePreset ?? "minimal"}`,
    `spacing-${block.spacing ?? "normal"}`,
    `radius-${block.radius ?? "md"}`,
    `shadow-${block.shadow ?? "none"}`,
    `align-${block.align ?? "left"}`,
  ].join(" ");
  return `<div class="${cls}">\n\n${markdown}\n\n</div>`;
}

function parseBuilderMeta(value: string): {
  theme: SiteTheme;
  brand: BrandConfig;
  body: string;
} {
  const themeMatch = value.match(/^<!--\s*site-theme:(clean|soft|bold)\s*-->\s*\n?/i);
  const theme = (themeMatch?.[1]?.toLowerCase() as SiteTheme) || "clean";
  const withoutTheme = themeMatch ? value.replace(themeMatch[0], "") : value;

  const brandMatch = withoutTheme.match(/^<!--\s*site-brand:(\{[\s\S]*?\})\s*-->\s*\n?/i);
  let brand: BrandConfig = {
    brandName: "",
    brandLogoUrl: "",
    primaryColor: "#0f172a",
    accentColor: "#334155",
  };
  if (brandMatch) {
    try {
      const parsed = JSON.parse(brandMatch[1]) as Partial<BrandConfig>;
      brand = {
        brandName: parsed.brandName ?? "",
        brandLogoUrl: parsed.brandLogoUrl ?? "",
        primaryColor: parsed.primaryColor ?? "#0f172a",
        accentColor: parsed.accentColor ?? "#334155",
      };
    } catch {
      // ignore invalid brand json
    }
  }
  const body = brandMatch ? withoutTheme.replace(brandMatch[0], "") : withoutTheme;
  return { theme, brand, body };
}

function blocksToMarkdown(blocks: SiteBlock[], theme: SiteTheme, brand: BrandConfig): string {
  const body = blocks
    .map((b) => {
      if (b.type === "hero") {
        const title = (b.title || "").trim();
        const subtitle = (b.subtitle || "").trim();
        const primary = (b.buttonText || "").trim();
        const primaryUrl = (b.buttonUrl || "").trim();
        const secondary = (b.secondaryButtonText || "").trim();
        const secondaryUrl = (b.secondaryButtonUrl || "").trim();
        const ctas = [
          primary && primaryUrl ? `[${primary}](${primaryUrl})` : "",
          secondary && secondaryUrl ? `[${secondary}](${secondaryUrl})` : "",
        ]
          .filter(Boolean)
          .join(" · ");
        return applyStyleWrappers([`# ${title || "Hero title"}`, subtitle, ctas].filter(Boolean).join("\n\n"), b);
      }
      if (b.type === "professionalHero") {
        const title = (b.title || "").trim();
        const tagline = (b.tagline || "").trim();
        const subtitle = (b.subtitle || "").trim();
        const img = (b.profileImageUrl || "").trim();
        const primary = (b.buttonText || "").trim();
        const primaryUrl = (b.buttonUrl || "").trim();
        const secondary = (b.secondaryButtonText || "").trim();
        const secondaryUrl = (b.secondaryButtonUrl || "").trim();
        const imageMd = img ? `![Profile](${img})` : "";
        const ctas = [
          primary && primaryUrl ? `[${primary}](${primaryUrl})` : "",
          secondary && secondaryUrl ? `[${secondary}](${secondaryUrl})` : "",
        ]
          .filter(Boolean)
          .join(" · ");
        const body = [imageMd, `# ${title || "Your name"}`, tagline ? `*${tagline}*` : "", subtitle, ctas]
          .filter(Boolean)
          .join("\n\n");
        return applyStyleWrappers(body, b);
      }
      if (b.type === "resumeTimeline") {
        const title = (b.title || "").trim();
        const entries = parseTimelineText(b.timelineText || "");
        const md = timelineToMarkdown(entries);
        return applyStyleWrappers([`## ${title || "Experience"}`, md].filter(Boolean).join("\n\n"), b);
      }
      if (b.type === "projectShowcase") {
        const title = (b.title || "").trim();
        const entries = parseProjectsText(b.projectsText || "");
        const md = projectsToMarkdown(entries);
        return applyStyleWrappers([`## ${title || "Projects"}`, md].filter(Boolean).join("\n\n"), b);
      }
      if (b.type === "skillGrid") {
        const title = (b.title || "").trim();
        const entries = parseSkillsText(b.skillsText || "");
        const md = skillsToMarkdown(entries);
        return applyStyleWrappers([`## ${title || "Skills"}`, md].filter(Boolean).join("\n\n"), b);
      }
      if (b.type === "contactFormModular") {
        const title = (b.title || "").trim();
        const subtitle = (b.subtitle || "").trim();
        const entries = parseFormFieldsText(b.formFieldsText || "");
        const md = formFieldsToMarkdown(entries);
        return applyStyleWrappers(
          [`## ${title || "Contact"}`, subtitle, "_Form fields (connect to your contact workflow):_", md]
            .filter(Boolean)
            .join("\n\n"),
          b
        );
      }
      if (b.type === "codeSnippet") {
        const title = (b.title || "").trim();
        const fn = (b.codeFilename || "").trim();
        const lang = (b.codeLanguage || "text").trim();
        const body = (b.codeText || "").trim();
        const fileLine = fn ? `_File: \`${fn}\`_\n\n` : "";
        return applyStyleWrappers(
          [`## ${title || "Code snippet"}`, `${fileLine}\`\`\`${lang}\n${body}\n\`\`\``].filter(Boolean).join("\n\n"),
          b
        );
      }
      if (b.type === "githubStats") {
        const title = (b.title || "").trim();
        const u = (b.githubUsername || "").trim();
        const v = b.githubStatsVariant === "repos" ? "repos" : "overview";
        return applyStyleWrappers(
          [`## ${title || "GitHub"}`, `<!-- embed:github:${v}:${u} -->`].filter(Boolean).join("\n\n"),
          b
        );
      }
      if (b.type === "leetcodeStats") {
        const title = (b.title || "").trim();
        const u = (b.leetcodeUsername || "").trim();
        return applyStyleWrappers(
          [`## ${title || "LeetCode"}`, u ? `<!-- embed:leetcode:${u} -->` : "_Set LeetCode username in the block._"].join(
            "\n\n"
          ),
          b
        );
      }
      if (b.type === "text") return (b.markdown || "").trim();
      if (b.type === "gallery") {
        const title = (b.title || "").trim();
        const links = (b.linksText || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        const images = links.map((url, idx) => `![Gallery image ${idx + 1}](${url})`).join("\n\n");
        return applyStyleWrappers([`## ${title || "Gallery"}`, images].filter(Boolean).join("\n\n"), b);
      }
      if (b.type === "cta") {
        const title = (b.title || "").trim();
        const subtitle = (b.subtitle || "").trim();
        const bt = (b.buttonText || "").trim();
        const bu = (b.buttonUrl || "").trim();
        const btn = bt && bu ? `[${bt}](${bu})` : "";
        return applyStyleWrappers(
          ["---", `## ${title || "Call to action"}`, subtitle, btn].filter(Boolean).join("\n\n"),
          b
        );
      }
      if (b.type === "faq") {
        const title = (b.title || "").trim();
        const qaLines = (b.qaText || "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [q, a] = line.split("|");
            return [`### ${(q || "Question").trim()}`, (a || "").trim()].filter(Boolean).join("\n");
          });
        return applyStyleWrappers([`## ${title || "FAQ"}`, qaLines.join("\n\n")].filter(Boolean).join("\n\n"), b);
      }
      if (b.type === "pricing") {
        const title = (b.title || "").trim();
        const plans = (b.plansText || "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [name, price, featuresRaw] = line.split("|");
            const features = (featuresRaw || "")
              .split(";")
              .map((f) => f.trim())
              .filter(Boolean)
              .map((f) => `- ${f}`)
              .join("\n");
            return [`### ${(name || "Plan").trim()}${price ? ` — ${price.trim()}` : ""}`, features]
              .filter(Boolean)
              .join("\n");
          });
        return applyStyleWrappers([`## ${title || "Pricing"}`, plans.join("\n\n")].filter(Boolean).join("\n\n"), b);
      }
      if (b.type === "columns") {
        const title = (b.title || "").trim();
        const count = b.columnsCount ?? 2;
        const cols = splitColumns(b.columnsText || "", count).map((col) => col.replace(/\n/g, "<br/>"));
        const header = `| ${Array.from({ length: count }, (_, i) => `Column ${i + 1}`).join(" | ")} |`;
        const sep = `| ${Array.from({ length: count }, () => "---").join(" | ")} |`;
        const row = `| ${cols.join(" | ")} |`;
        return applyStyleWrappers([`## ${title || "Highlights"}`, header, sep, row].join("\n"), b);
      }
      if (b.type === "testimonials") {
        const title = (b.title || "").trim();
        const rows = (b.testimonialsText || "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [name, role, quote] = line.split("|");
            return [
              `### ${(name || "Customer").trim()}`,
              role ? `*${role.trim()}*` : "",
              quote ? `> ${quote.trim()}` : "",
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n");
        return applyStyleWrappers([`## ${title || "Testimonials"}`, rows].filter(Boolean).join("\n\n"), b);
      }
      if (b.type === "stats") {
        const title = (b.title || "").trim();
        const statsRows = (b.statsText || "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [label, value] = line.split("|");
            return `- **${(value || "").trim()}** ${(label || "").trim()}`;
          })
          .join("\n");
        return applyStyleWrappers([`## ${title || "Stats"}`, statsRows].filter(Boolean).join("\n\n"), b);
      }
      if (b.type === "logoCloud") {
        const title = (b.title || "").trim();
        const logos = (b.logosText || "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((url, idx) => `![Logo ${idx + 1}](${url})`)
          .join("\n\n");
        return applyStyleWrappers([`## ${title || "Logo cloud"}`, logos].filter(Boolean).join("\n\n"), b);
      }
      if (b.type === "team") {
        const title = (b.title || "").trim();
        const members = (b.teamText || "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [name, role, bio, image] = line.split("|");
            return [
              image ? `![${(name || "Member").trim()}](${image.trim()})` : "",
              `### ${(name || "Member").trim()}`,
              role ? `*${role.trim()}*` : "",
              bio ? bio.trim() : "",
            ]
              .filter(Boolean)
              .join("\n\n");
          })
          .join("\n\n");
        return applyStyleWrappers([`## ${title || "Team"}`, members].filter(Boolean).join("\n\n"), b);
      }
      if (b.type === "comparison") {
        const title = (b.title || "").trim();
        const rows = (b.comparisonText || "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const header = rows[0] || "Feature|Plan A|Plan B";
        const headers = header.split("|").map((h) => h.trim());
        const sep = headers.map(() => "---").join("|");
        const bodyRows = rows.slice(1);
        const table = [headers.join("|"), sep, ...bodyRows].join("\n");
        return applyStyleWrappers([`## ${title || "Comparison"}`, table].join("\n\n"), b);
      }
      const title = (b.title || "").trim();
      const url = (b.videoUrl || "").trim();
      const caption = (b.caption || "").trim();
      return applyStyleWrappers(
        [`## ${title || "Video"}`, url ? `[Watch video](${url})` : "", caption ? `> ${caption}` : ""]
          .filter(Boolean)
          .join("\n\n"),
        b
      );
    })
    .filter((s) => s.trim().length > 0)
    .join("\n\n");

  const brandJson = JSON.stringify(brand);
  return `<!-- site-theme:${theme} -->\n<!-- site-brand:${brandJson} -->\n\n${body}`.trim();
}

function blockTypeLabel(type: BlockType): string {
  return {
    hero: "Hero",
    professionalHero: "Professional hero",
    resumeTimeline: "Resume timeline",
    projectShowcase: "Project showcase",
    skillGrid: "Skill grid",
    contactFormModular: "Contact form",
    codeSnippet: "Code snippet",
    githubStats: "GitHub stats",
    leetcodeStats: "LeetCode stats",
    text: "Text",
    gallery: "Gallery",
    cta: "CTA",
    faq: "FAQ",
    pricing: "Pricing",
    video: "Video",
    columns: "Columns",
    testimonials: "Testimonials",
    stats: "Stats",
    logoCloud: "Logo Cloud",
    team: "Team",
    comparison: "Comparison",
  }[type];
}

function SkillPreviewIcon({ iconKey }: { iconKey: string }) {
  return <SkillBlockIcon iconKey={iconKey} className="h-4 w-4 shrink-0 text-slate-500" />;
}

function themeClasses(theme: SiteTheme): string {
  if (theme === "soft") return "bg-slate-50 border-slate-200 text-slate-700";
  /** Strong contrast while staying light-only (no dark mode). */
  if (theme === "bold") return "bg-slate-100 border-slate-300 text-slate-900";
  return "bg-white border-slate-200 text-slate-800";
}

function stylePreviewClasses(block: SiteBlock): string {
  const preset =
    block.stylePreset === "highlight"
      ? "bg-blue-50 border-blue-200"
      : block.stylePreset === "card"
        ? "bg-white border-slate-200"
        : "bg-transparent border-slate-200";
  const spacing =
    block.spacing === "compact" ? "p-2" : block.spacing === "spacious" ? "p-6" : "p-4";
  const radius =
    block.radius === "none"
      ? "rounded-none"
      : block.radius === "sm"
        ? "rounded"
        : block.radius === "lg"
          ? "rounded-xl"
          : "rounded-lg";
  const shadow =
    block.shadow === "none" ? "" : block.shadow === "md" ? "shadow-md" : "shadow-sm";
  const align = block.align === "center" ? "text-center" : "text-left";
  return `${preset} ${spacing} ${radius} ${shadow} ${align}`;
}

function BlockPreview({
  block,
  device,
  theme,
}: {
  block: SiteBlock;
  device: "desktop" | "mobile";
  theme: SiteTheme;
}) {
  const base = `rounded-lg border p-4 ${themeClasses(theme)}`;
  const titleClass = "text-slate-900";
  const muted = theme === "bold" ? "text-slate-600" : "text-slate-600";
  const styleClass = stylePreviewClasses(block);

  if (block.type === "hero") {
    return (
      <div className={`${base} ${styleClass}`}>
        <h3 className={`text-2xl font-bold ${titleClass}`}>{block.title || "Hero title"}</h3>
        <p className={`mt-2 ${muted}`}>{block.subtitle}</p>
      </div>
    );
  }

  if (block.type === "professionalHero") {
    const img = (block.profileImageUrl || "").trim();
    return (
      <div className={`${base} ${styleClass}`}>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div
            className={`h-24 w-24 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 sm:h-28 sm:w-28 ${
              img ? "" : "flex items-center justify-center text-xs text-slate-400"
            }`}
            style={img ? { backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            {!img ? "Photo" : null}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h3 className={`text-2xl font-bold tracking-tight ${titleClass}`}>{block.title || "Your name"}</h3>
            {block.tagline ? <p className={`mt-1 text-sm font-medium text-slate-700`}>{block.tagline}</p> : null}
            {block.subtitle ? <p className={`mt-2 text-sm leading-relaxed ${muted}`}>{block.subtitle}</p> : null}
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                {block.buttonText || "Primary"}
              </span>
              {block.secondaryButtonText ? (
                <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-800">
                  {block.secondaryButtonText}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (block.type === "resumeTimeline") {
    const rows = parseTimelineText(block.timelineText || "");
    return (
      <div className={`${base} ${styleClass}`}>
        <h4 className={`font-semibold ${titleClass}`}>{block.title || "Experience"}</h4>
        <ul className="mt-3 space-y-3 border-l-2 border-slate-200 pl-4">
          {rows.slice(0, 4).map((r, i) => (
            <li key={`${r.period}-${i}`} className="relative">
              <span className="absolute -left-[1.15rem] top-1.5 h-2 w-2 rounded-full bg-slate-400" />
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{r.period}</p>
              <p className="font-medium text-slate-900">{r.title}</p>
              <p className="text-sm text-slate-600">{r.organization}</p>
              {r.description ? <p className="mt-1 text-xs text-slate-600">{r.description}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (block.type === "projectShowcase") {
    const projects = parseProjectsText(block.projectsText || "");
    return (
      <div className={`${base} ${styleClass}`}>
        <h4 className={`font-semibold ${titleClass}`}>{block.title || "Projects"}</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {projects.slice(0, 4).map((p, i) => (
            <div
              key={`${p.title}-${i}`}
              className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <div
                className="h-24 bg-slate-100 bg-cover bg-center"
                style={p.imageUrl ? { backgroundImage: `url(${p.imageUrl})` } : undefined}
              />
              <div className="p-3">
                <p className="font-medium text-slate-900">{p.title || "Project"}</p>
                <p className="mt-1 text-xs text-slate-600 line-clamp-2">{p.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "skillGrid") {
    const skills = parseSkillsText(block.skillsText || "");
    return (
      <div className={`${base} ${styleClass}`}>
        <h4 className={`font-semibold ${titleClass}`}>{block.title || "Skills"}</h4>
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          {skills.slice(0, 12).map((s, i) => (
            <span
              key={`${s.name}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm"
            >
              <SkillPreviewIcon iconKey={s.iconKey} />
              {s.name}
              {s.level ? <span className="text-slate-500">· {s.level}</span> : null}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "contactFormModular") {
    const fields = parseFormFieldsText(block.formFieldsText || "");
    return (
      <div className={`${base} ${styleClass}`}>
        <h4 className={`font-semibold ${titleClass}`}>{block.title || "Contact"}</h4>
        {block.subtitle ? <p className={`mt-1 text-sm ${muted}`}>{block.subtitle}</p> : null}
        <div className="mt-3 space-y-2">
          {fields.slice(0, 6).map((f, i) => (
            <div key={`${f.label}-${i}`} className="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
              {f.label}
              {f.required ? <span className="text-red-500"> *</span> : null}
              <span className="ml-2 text-xs text-slate-400">({f.fieldType})</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "codeSnippet") {
    const preview = (block.codeText || "").split("\n").slice(0, 6).join("\n");
    return (
      <div className={`${base} ${styleClass}`}>
        <h4 className={`font-semibold ${titleClass}`}>{block.title || "Code"}</h4>
        <p className={`mt-1 text-xs ${muted}`}>
          {(block.codeFilename || "snippet") + (block.codeLanguage ? ` · ${block.codeLanguage}` : "")}
        </p>
        <pre className="mt-2 max-h-32 overflow-hidden rounded border border-slate-200 bg-slate-900/5 p-2 text-left font-mono text-[11px] leading-relaxed text-slate-800">
          {preview}
          {(block.codeText || "").split("\n").length > 6 ? "\n…" : ""}
        </pre>
      </div>
    );
  }

  if (block.type === "githubStats") {
    return (
      <div className={`${base} ${styleClass}`}>
        <h4 className={`font-semibold ${titleClass}`}>{block.title || "GitHub"}</h4>
        <p className={`mt-2 text-sm ${muted}`}>@{block.githubUsername || "username"}</p>
        <p className="mt-1 text-xs text-slate-500">
          {block.githubStatsVariant === "repos" ? "Repository list" : "Profile + streak"}
        </p>
      </div>
    );
  }

  if (block.type === "leetcodeStats") {
    return (
      <div className={`${base} ${styleClass}`}>
        <h4 className={`font-semibold ${titleClass}`}>{block.title || "LeetCode"}</h4>
        <p className={`mt-2 text-sm ${muted}`}>@{block.leetcodeUsername?.trim() || "your-username"}</p>
      </div>
    );
  }

  if (block.type === "gallery") {
    const urls = (block.linksText || "").split("\n").map((s) => s.trim()).filter(Boolean);
    return (
      <div className={`${base} ${styleClass}`}>
        <h4 className={`font-semibold ${titleClass}`}>{block.title || "Gallery"}</h4>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {urls.slice(0, 4).map((u, i) => (
            <div key={`${u}-${i}`} className="h-16 rounded bg-slate-200/70" title={u} />
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "columns") {
    const count = block.columnsCount ?? 2;
    const cols = splitColumns(block.columnsText || "", count);
    const shouldStack = device === "mobile" && block.mobileBehavior !== "scroll";
    return (
      <div className={`${base} ${styleClass}`}>
        <h4 className={`font-semibold ${titleClass}`}>{block.title || "Columns"}</h4>
        <div
          className={`mt-3 gap-2 ${
            shouldStack ? "grid grid-cols-1" : `grid ${count === 3 ? "grid-cols-3" : "grid-cols-2"}`
          }`}
        >
          {cols.map((c, i) => (
            <div key={`${c}-${i}`} className="rounded border border-slate-300/50 bg-white/60 p-2 text-xs text-slate-700">
              {c.split("\n")[0]}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "stats") {
    const stats = (block.statsText || "").split("\n").map((s) => s.trim()).filter(Boolean);
    return (
      <div className={`${base} ${styleClass}`}>
        <h4 className={`font-semibold ${titleClass}`}>{block.title || "Stats"}</h4>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {stats.slice(0, 4).map((s, i) => {
            const [label, value] = s.split("|");
            return (
              <div key={`${s}-${i}`} className="rounded border border-slate-300/40 bg-white/70 p-2">
                <p className="text-lg font-semibold text-slate-900">{value?.trim() || "-"}</p>
                <p className="text-xs text-slate-600">{label?.trim() || "Metric"}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === "testimonials") {
    const rows = (block.testimonialsText || "").split("\n").map((s) => s.trim()).filter(Boolean);
    return (
      <div className={`${base} ${styleClass}`}>
        <h4 className={`font-semibold ${titleClass}`}>{block.title || "Testimonials"}</h4>
        <div className="mt-3 space-y-2">
          {rows.slice(0, 3).map((r, i) => {
            const [name, role, quote] = r.split("|");
            return (
              <div key={`${r}-${i}`} className="rounded border border-slate-300/40 bg-white/70 p-2">
                <p className="text-sm text-slate-700">&quot;{quote?.trim() || "Great experience."}&quot;</p>
                <p className="mt-1 text-xs font-medium text-slate-900">
                  {name?.trim() || "Customer"} {role ? `· ${role.trim()}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === "logoCloud") {
    const logos = (block.logosText || "").split("\n").map((s) => s.trim()).filter(Boolean);
    return (
      <div className={`${base} ${styleClass}`}>
        <h4 className={`font-semibold ${titleClass}`}>{block.title || "Logo Cloud"}</h4>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {logos.slice(0, 6).map((logo, i) => (
            <div key={`${logo}-${i}`} className="h-10 rounded border border-slate-300/40 bg-white/70" />
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "team") {
    const rows = (block.teamText || "").split("\n").map((s) => s.trim()).filter(Boolean);
    return (
      <div className={`${base} ${styleClass}`}>
        <h4 className={`font-semibold ${titleClass}`}>{block.title || "Team"}</h4>
        <div className="mt-3 space-y-2">
          {rows.slice(0, 3).map((r, i) => {
            const [name, role] = r.split("|");
            return (
              <div key={`${r}-${i}`} className="flex items-center gap-2 rounded border border-slate-300/40 bg-white/70 p-2">
                <div className="h-8 w-8 rounded-full bg-slate-300/60" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{name?.trim() || "Member"}</p>
                  <p className="text-xs text-slate-600">{role?.trim() || "Role"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === "comparison") {
    return (
      <div className={`${base} ${styleClass}`}>
        <h4 className={`font-semibold ${titleClass}`}>{block.title || "Comparison"}</h4>
        <div className="mt-3 h-20 rounded border border-slate-300/40 bg-white/70" />
      </div>
    );
  }

  return (
    <div className={`${base} ${styleClass}`}>
      <h4 className={`font-semibold ${titleClass}`}>{block.title || blockTypeLabel(block.type)}</h4>
      <p className={`mt-2 text-sm ${muted}`}>Preview for {blockTypeLabel(block.type)} block</p>
    </div>
  );
}

function SortableBlockCard({
  block,
  onChange,
  onDelete,
  onDuplicate,
  onOpenMedia,
  onSaveComponent,
  onToggleCollapse,
  collapsed,
}: {
  block: SiteBlock;
  onChange: (next: SiteBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onOpenMedia: (
    field: "gallery" | "video" | "text" | "columns" | "logoCloud" | "team" | "professionalHero"
  ) => void;
  onSaveComponent: () => void;
  onToggleCollapse: () => void;
  collapsed: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? "border-slate-400 shadow-md" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="cursor-grab rounded border border-slate-200 p-1.5 text-slate-500 hover:text-slate-700"
              aria-label="Drag block"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <CardTitle className="text-base">{blockTypeLabel(block.type)} block</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onToggleCollapse} className="gap-1">
              {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              {collapsed ? "Expand" : "Collapse"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onSaveComponent} className="gap-1">
              <Save className="h-3.5 w-3.5" />
              Save as component
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onDuplicate} className="gap-1">
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onDelete} className="gap-1 text-red-600">
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        </div>
      </CardHeader>
      {!collapsed && <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-5">
          <label className="text-xs text-slate-600">
            Style
            <select
              className="mt-1 block w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={block.stylePreset ?? "minimal"}
              onChange={(e) => onChange({ ...block, stylePreset: e.target.value as StylePreset })}
            >
              <option value="minimal">Minimal</option>
              <option value="card">Card</option>
              <option value="highlight">Highlight</option>
            </select>
          </label>
          <label className="text-xs text-slate-600">
            Spacing
            <select
              className="mt-1 block w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={block.spacing ?? "normal"}
              onChange={(e) => onChange({ ...block, spacing: e.target.value as SpacingPreset })}
            >
              <option value="compact">Compact</option>
              <option value="normal">Normal</option>
              <option value="spacious">Spacious</option>
            </select>
          </label>
          <label className="text-xs text-slate-600">
            Align
            <select
              className="mt-1 block w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={block.align ?? "left"}
              onChange={(e) => onChange({ ...block, align: e.target.value as TextAlignPreset })}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
            </select>
          </label>
          <label className="text-xs text-slate-600">
            Radius
            <select
              className="mt-1 block w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={block.radius ?? "md"}
              onChange={(e) => onChange({ ...block, radius: e.target.value as RadiusPreset })}
            >
              <option value="none">None</option>
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </label>
          <label className="text-xs text-slate-600">
            Shadow
            <select
              className="mt-1 block w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={block.shadow ?? "none"}
              onChange={(e) => onChange({ ...block, shadow: e.target.value as ShadowPreset })}
            >
              <option value="none">None</option>
              <option value="sm">Small</option>
              <option value="md">Medium</option>
            </select>
          </label>
        </div>

        {block.type === "hero" && (
          <>
            <Input placeholder="Headline" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Textarea
              placeholder="Supporting paragraph"
              value={block.subtitle ?? ""}
              onChange={(e) => onChange({ ...block, subtitle: e.target.value })}
              rows={3}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Primary button text" value={block.buttonText ?? ""} onChange={(e) => onChange({ ...block, buttonText: e.target.value })} />
              <Input placeholder="Primary button URL" value={block.buttonUrl ?? ""} onChange={(e) => onChange({ ...block, buttonUrl: e.target.value })} />
              <Input
                placeholder="Secondary button text"
                value={block.secondaryButtonText ?? ""}
                onChange={(e) => onChange({ ...block, secondaryButtonText: e.target.value })}
              />
              <Input
                placeholder="Secondary button URL"
                value={block.secondaryButtonUrl ?? ""}
                onChange={(e) => onChange({ ...block, secondaryButtonUrl: e.target.value })}
              />
            </div>
          </>
        )}

        {block.type === "professionalHero" && (
          <>
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => onOpenMedia("professionalHero")}>
              <ImagePlus className="h-4 w-4" />
              Profile image from Media
            </Button>
            <Input
              placeholder="Profile image URL"
              value={block.profileImageUrl ?? ""}
              onChange={(e) => onChange({ ...block, profileImageUrl: e.target.value })}
            />
            <Input placeholder="Your name" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Input placeholder="Tagline (role · focus)" value={block.tagline ?? ""} onChange={(e) => onChange({ ...block, tagline: e.target.value })} />
            <Textarea
              placeholder="Short bio"
              value={block.subtitle ?? ""}
              onChange={(e) => onChange({ ...block, subtitle: e.target.value })}
              rows={3}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Primary button" value={block.buttonText ?? ""} onChange={(e) => onChange({ ...block, buttonText: e.target.value })} />
              <Input placeholder="Primary URL" value={block.buttonUrl ?? ""} onChange={(e) => onChange({ ...block, buttonUrl: e.target.value })} />
              <Input placeholder="Secondary button" value={block.secondaryButtonText ?? ""} onChange={(e) => onChange({ ...block, secondaryButtonText: e.target.value })} />
              <Input placeholder="Secondary URL" value={block.secondaryButtonUrl ?? ""} onChange={(e) => onChange({ ...block, secondaryButtonUrl: e.target.value })} />
            </div>
          </>
        )}

        {block.type === "resumeTimeline" && (
          <>
            <Input placeholder="Section title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Textarea
              placeholder={"One line per role:\nPeriod|Job title|Organization|Short description"}
              value={block.timelineText ?? ""}
              onChange={(e) => onChange({ ...block, timelineText: e.target.value })}
              rows={10}
              className="font-mono text-sm"
            />
          </>
        )}

        {block.type === "projectShowcase" && (
          <>
            <Input placeholder="Section title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Textarea
              placeholder={"One line per project:\nTitle|Summary|Link|Thumbnail URL"}
              value={block.projectsText ?? ""}
              onChange={(e) => onChange({ ...block, projectsText: e.target.value })}
              rows={10}
              className="font-mono text-sm"
            />
          </>
        )}

        {block.type === "skillGrid" && (
          <>
            <Input placeholder="Section title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <p className="text-xs text-slate-600">
              Icon keys: code, layers, pen-line, briefcase, circle (see Lucide icon names).
            </p>
            <Textarea
              placeholder={"One line per skill:\nName|icon-key|Level label"}
              value={block.skillsText ?? ""}
              onChange={(e) => onChange({ ...block, skillsText: e.target.value })}
              rows={8}
              className="font-mono text-sm"
            />
          </>
        )}

        {block.type === "contactFormModular" && (
          <>
            <Input placeholder="Section title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Textarea placeholder="Intro text (optional)" value={block.subtitle ?? ""} onChange={(e) => onChange({ ...block, subtitle: e.target.value })} rows={2} />
            <Textarea
              placeholder={"One field per line:\nFull name|text|required\nEmail|email|required\nWebsite|url|optional"}
              value={block.formFieldsText ?? ""}
              onChange={(e) => onChange({ ...block, formFieldsText: e.target.value })}
              rows={8}
              className="font-mono text-sm"
            />
          </>
        )}

        {block.type === "codeSnippet" && (
          <>
            <Input placeholder="Section title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="File name (e.g. main.ts)"
                value={block.codeFilename ?? ""}
                onChange={(e) => onChange({ ...block, codeFilename: e.target.value })}
              />
              <Input
                placeholder="Language (typescript, python, …)"
                value={block.codeLanguage ?? ""}
                onChange={(e) => onChange({ ...block, codeLanguage: e.target.value })}
              />
            </div>
            <Textarea
              placeholder="Source code"
              value={block.codeText ?? ""}
              onChange={(e) => onChange({ ...block, codeText: e.target.value })}
              rows={14}
              className="font-mono text-sm"
            />
          </>
        )}

        {block.type === "githubStats" && (
          <>
            <Input placeholder="Section title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Input
              placeholder="GitHub username"
              value={block.githubUsername ?? ""}
              onChange={(e) => onChange({ ...block, githubUsername: e.target.value })}
            />
            <label className="text-xs text-slate-600">
              Layout
              <select
                className="mt-1 block w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
                value={block.githubStatsVariant ?? "overview"}
                onChange={(e) =>
                  onChange({ ...block, githubStatsVariant: e.target.value === "repos" ? "repos" : "overview" })
                }
              >
                <option value="overview">Profile + contribution streak</option>
                <option value="repos">Top repositories</option>
              </select>
            </label>
          </>
        )}

        {block.type === "leetcodeStats" && (
          <>
            <Input placeholder="Section title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Input
              placeholder="LeetCode username"
              value={block.leetcodeUsername ?? ""}
              onChange={(e) => onChange({ ...block, leetcodeUsername: e.target.value })}
            />
          </>
        )}

        {block.type === "text" && (
          <>
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => onOpenMedia("text")}>
              <ImagePlus className="h-4 w-4" />
              Insert image from Media
            </Button>
            <Textarea
              placeholder="Markdown text block"
              value={block.markdown ?? ""}
              onChange={(e) => onChange({ ...block, markdown: e.target.value })}
              rows={10}
              className="font-mono text-sm"
            />
          </>
        )}

        {block.type === "gallery" && (
          <>
            <Input placeholder="Section title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => onOpenMedia("gallery")}>
              <ImagePlus className="h-4 w-4" />
              Add image from Media
            </Button>
            <Textarea
              placeholder="One image URL per line"
              value={block.linksText ?? ""}
              onChange={(e) => onChange({ ...block, linksText: e.target.value })}
              rows={6}
              className="font-mono text-sm"
            />
          </>
        )}

        {block.type === "cta" && (
          <>
            <Input placeholder="CTA title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Textarea
              placeholder="CTA description"
              value={block.subtitle ?? ""}
              onChange={(e) => onChange({ ...block, subtitle: e.target.value })}
              rows={3}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Button text" value={block.buttonText ?? ""} onChange={(e) => onChange({ ...block, buttonText: e.target.value })} />
              <Input placeholder="Button URL" value={block.buttonUrl ?? ""} onChange={(e) => onChange({ ...block, buttonUrl: e.target.value })} />
            </div>
          </>
        )}

        {block.type === "faq" && (
          <>
            <Input placeholder="FAQ title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Textarea
              placeholder={"Use one line per item:\nQuestion|Answer"}
              value={block.qaText ?? ""}
              onChange={(e) => onChange({ ...block, qaText: e.target.value })}
              rows={7}
              className="font-mono text-sm"
            />
          </>
        )}

        {block.type === "pricing" && (
          <>
            <Input placeholder="Pricing title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Textarea
              placeholder={"Use one line per plan:\nPlan|Price|Feature 1;Feature 2;Feature 3"}
              value={block.plansText ?? ""}
              onChange={(e) => onChange({ ...block, plansText: e.target.value })}
              rows={7}
              className="font-mono text-sm"
            />
          </>
        )}

        {block.type === "video" && (
          <>
            <Input placeholder="Video section title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => onOpenMedia("video")}>
              <ImagePlus className="h-4 w-4" />
              Pick from Media
            </Button>
            <Input placeholder="Video URL (YouTube or Vimeo)" value={block.videoUrl ?? ""} onChange={(e) => onChange({ ...block, videoUrl: e.target.value })} />
            <Textarea placeholder="Caption (optional)" value={block.caption ?? ""} onChange={(e) => onChange({ ...block, caption: e.target.value })} rows={3} />
          </>
        )}

        {block.type === "columns" && (
          <>
            <Input placeholder="Section title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-slate-600">
                Columns
                <select
                  className="mt-1 block w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
                  value={block.columnsCount ?? 2}
                  onChange={(e) => onChange({ ...block, columnsCount: Number(e.target.value) as 2 | 3 })}
                >
                  <option value={2}>Two columns</option>
                  <option value={3}>Three columns</option>
                </select>
              </label>
              <label className="text-xs text-slate-600">
                Mobile behavior
                <select
                  className="mt-1 block w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
                  value={block.mobileBehavior ?? "stack"}
                  onChange={(e) => onChange({ ...block, mobileBehavior: e.target.value as "stack" | "scroll" })}
                >
                  <option value="stack">Stack</option>
                  <option value="scroll">Horizontal scroll</option>
                </select>
              </label>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => onOpenMedia("columns")}>
              <ImagePlus className="h-4 w-4" />
              Insert image into columns
            </Button>
            <Textarea
              placeholder={"Separate columns with a line containing only ---\nColumn 1 content\n---\nColumn 2 content"}
              value={block.columnsText ?? ""}
              onChange={(e) => onChange({ ...block, columnsText: e.target.value })}
              rows={8}
              className="font-mono text-sm"
            />
          </>
        )}

        {block.type === "testimonials" && (
          <>
            <Input placeholder="Section title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Textarea
              placeholder={"Use one line per testimonial:\nName|Role|Quote"}
              value={block.testimonialsText ?? ""}
              onChange={(e) => onChange({ ...block, testimonialsText: e.target.value })}
              rows={7}
              className="font-mono text-sm"
            />
          </>
        )}

        {block.type === "stats" && (
          <>
            <Input placeholder="Section title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Textarea
              placeholder={"Use one line per stat:\nLabel|Value"}
              value={block.statsText ?? ""}
              onChange={(e) => onChange({ ...block, statsText: e.target.value })}
              rows={6}
              className="font-mono text-sm"
            />
          </>
        )}

        {block.type === "logoCloud" && (
          <>
            <Input placeholder="Section title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => onOpenMedia("logoCloud")}>
              <ImagePlus className="h-4 w-4" />
              Add logo from Media
            </Button>
            <Textarea
              placeholder="One logo URL per line"
              value={block.logosText ?? ""}
              onChange={(e) => onChange({ ...block, logosText: e.target.value })}
              rows={6}
              className="font-mono text-sm"
            />
          </>
        )}

        {block.type === "team" && (
          <>
            <Input placeholder="Section title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => onOpenMedia("team")}>
              <ImagePlus className="h-4 w-4" />
              Add avatar URL from Media
            </Button>
            <Textarea
              placeholder={"Use one line per member:\nName|Role|Bio|Image URL"}
              value={block.teamText ?? ""}
              onChange={(e) => onChange({ ...block, teamText: e.target.value })}
              rows={8}
              className="font-mono text-sm"
            />
          </>
        )}

        {block.type === "comparison" && (
          <>
            <Input placeholder="Section title" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
            <Textarea
              placeholder={"First line is header:\nFeature|Starter|Pro\nCustom domain|No|Yes"}
              value={block.comparisonText ?? ""}
              onChange={(e) => onChange({ ...block, comparisonText: e.target.value })}
              rows={7}
              className="font-mono text-sm"
            />
          </>
        )}
      </CardContent>}
    </Card>
  );
}

export function SiteBlockBuilder({
  value,
  onChange,
}: {
  value: string;
  onChange: (nextMarkdown: string) => void;
}) {
  const { toast } = useToast();
  const parsed = useMemo(() => parseBuilderMeta(value), [value]);
  const [theme, setTheme] = useState<SiteTheme>(parsed.theme);
  const [brand, setBrand] = useState<BrandConfig>(parsed.brand);
  const [blocks, setBlocks] = useState<SiteBlock[]>([
    parsed.body.trim() ? { id: makeId(), type: "text", markdown: parsed.body } : createBlock("hero"),
  ]);
  const [devicePreview, setDevicePreview] = useState<"desktop" | "mobile">("desktop");
  const [showMedia, setShowMedia] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<{
    blockId: string;
    field: "gallery" | "video" | "text" | "columns" | "logoCloud" | "team" | "professionalHero";
  } | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [savedComponents, setSavedComponents] = useState<ReusableComponent[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sectionSearch, setSectionSearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const lastGeneratedRef = useRef<string>(value);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (value !== lastGeneratedRef.current) {
      const nextParsed = parseBuilderMeta(value);
      setTheme(nextParsed.theme);
      setBrand(nextParsed.brand);
      setBlocks(nextParsed.body.trim() ? [{ id: makeId(), type: "text", markdown: nextParsed.body }] : [createBlock("hero")]);
    }
  }, [value]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await fetch("/api/builder/templates");
        if (res.ok) {
          const data = (await res.json()) as Array<{
            id: string;
            name: string;
            theme: SiteTheme;
            brand: Record<string, unknown>;
            blocks: SiteBlock[];
            createdAt: string;
          }>;
          setSavedTemplates(
            data.map((t) => ({
              id: t.id,
              name: t.name,
              theme: t.theme,
              blocks: Array.isArray(t.blocks) ? t.blocks : [],
              createdAt: t.createdAt,
            }))
          );
          return;
        }
      } catch {
        // fallback below
      }
      try {
        const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
        if (!raw) return;
        const parsedSaved = JSON.parse(raw) as SavedTemplate[];
        if (Array.isArray(parsedSaved)) setSavedTemplates(parsedSaved);
      } catch {
        // ignore malformed storage
      }
    };
    loadTemplates();
  }, []);

  useEffect(() => {
    const loadComponents = async () => {
      try {
        const res = await fetch("/api/builder/components");
        if (res.ok) {
          const data = (await res.json()) as Array<{
            id: string;
            name: string;
            block: SiteBlock;
            createdAt: string;
          }>;
          setSavedComponents(
            data.map((c) => ({
              id: c.id,
              name: c.name,
              block: c.block,
              createdAt: c.createdAt,
            }))
          );
          return;
        }
      } catch {
        // fallback below
      }
      try {
        const raw = localStorage.getItem(COMPONENT_STORAGE_KEY);
        if (!raw) return;
        const parsedSaved = JSON.parse(raw) as ReusableComponent[];
        if (Array.isArray(parsedSaved)) setSavedComponents(parsedSaved);
      } catch {
        // ignore malformed storage
      }
    };
    loadComponents();
  }, []);

  const generatedMarkdown = useMemo(() => blocksToMarkdown(blocks, theme, brand), [blocks, theme, brand]);

  useEffect(() => {
    lastGeneratedRef.current = generatedMarkdown;
    onChange(generatedMarkdown);
  }, [generatedMarkdown, onChange]);

  const addBlock = (type: BlockType) => setBlocks((prev) => [...prev, createBlock(type)]);
  const updateBlock = (id: string, next: SiteBlock) => setBlocks((prev) => prev.map((b) => (b.id === id ? next : b)));
  const deleteBlock = (id: string) =>
    setBlocks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      return next.length > 0 ? next : [createBlock("text")];
    });
  const duplicateBlock = (id: string) =>
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const copy = { ...prev[idx], id: makeId() };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const openMediaFor = (
    blockId: string,
    field: "gallery" | "video" | "text" | "columns" | "logoCloud" | "team" | "professionalHero"
  ) => {
    setMediaTarget({ blockId, field });
    setShowMedia(true);
  };

  const handleMediaSelect = (url: string) => {
    if (!mediaTarget) return;
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== mediaTarget.blockId) return b;
        if (mediaTarget.field === "gallery") {
          const next = [b.linksText?.trim(), url].filter(Boolean).join("\n");
          return { ...b, linksText: next };
        }
        if (mediaTarget.field === "video") return { ...b, videoUrl: url };
        if (mediaTarget.field === "logoCloud") {
          const next = [b.logosText?.trim(), url].filter(Boolean).join("\n");
          return { ...b, logosText: next };
        }
        if (mediaTarget.field === "team") {
          const line = `Member|Role|Bio|${url}`;
          const next = [b.teamText?.trim(), line].filter(Boolean).join("\n");
          return { ...b, teamText: next };
        }
        if (mediaTarget.field === "professionalHero") {
          return { ...b, profileImageUrl: url };
        }
        if (mediaTarget.field === "columns") {
          const c = (b.columnsText || "").trim();
          const add = `\n![Image](${url})`;
          return { ...b, columnsText: (c ? `${c}${add}` : `![Image](${url})`) };
        }
        const m = (b.markdown || "").trim();
        const add = `![Image](${url})`;
        return { ...b, markdown: m ? `${m}\n\n${add}` : add };
      })
    );
  };

  const quickFlowTips = [
    "1) Pick a theme",
    "2) Add sections with + buttons",
    "3) Drag blocks to reorder",
    "4) Open preview and review mobile layout",
    "5) Save page",
  ];

  const sectionLibrary: Array<{
    type: BlockType;
    label: string;
    category: "structure" | "marketing" | "personal" | "developer";
  }> = [
    { type: "professionalHero", label: "Professional hero", category: "personal" },
    { type: "resumeTimeline", label: "Resume timeline", category: "personal" },
    { type: "projectShowcase", label: "Project showcase", category: "personal" },
    { type: "skillGrid", label: "Skill grid", category: "personal" },
    { type: "contactFormModular", label: "Contact form", category: "personal" },
    { type: "codeSnippet", label: "Code snippet", category: "developer" },
    { type: "githubStats", label: "GitHub stats", category: "developer" },
    { type: "leetcodeStats", label: "LeetCode stats", category: "developer" },
    { type: "hero", label: "Hero", category: "structure" },
    { type: "text", label: "Text", category: "structure" },
    { type: "columns", label: "Columns", category: "structure" },
    { type: "gallery", label: "Gallery", category: "marketing" },
    { type: "video", label: "Video", category: "marketing" },
    { type: "cta", label: "Call to action", category: "marketing" },
    { type: "faq", label: "FAQ", category: "marketing" },
    { type: "stats", label: "Stats", category: "marketing" },
    { type: "testimonials", label: "Testimonials", category: "marketing" },
    { type: "logoCloud", label: "Logo cloud", category: "marketing" },
    { type: "team", label: "Team", category: "marketing" },
  ];
  const filteredLibrary = sectionLibrary.filter((item) =>
    sectionSearch.trim()
      ? `${item.label} ${item.category}`.toLowerCase().includes(sectionSearch.trim().toLowerCase())
      : true
  );

  const applyStarterTemplate = () => {
    setTheme("clean");
    setBlocks([
      createBlock("professionalHero"),
      createBlock("resumeTimeline"),
      createBlock("projectShowcase"),
      createBlock("contactFormModular"),
    ]);
  };

  const applyAgencyTemplate = () => {
    setTheme("soft");
    const hero = createBlock("professionalHero");
    hero.title = "Creative technologist";
    hero.tagline = "Design systems · Product engineering";
    const team = createBlock("team");
    const testimonials = createBlock("testimonials");
    const projects = createBlock("projectShowcase");
    const cta = createBlock("cta");
    setBlocks([hero, team, testimonials, projects, cta]);
  };

  const applyPortfolioTemplate = () => {
    setTheme("bold");
    const hero = createBlock("professionalHero");
    hero.title = "Your personal brand";
    const stats = createBlock("stats");
    const timeline = createBlock("resumeTimeline");
    const faq = createBlock("faq");
    const cta = createBlock("cta");
    setBlocks([hero, stats, timeline, faq, cta]);
  };

  const saveCurrentAsTemplate = async () => {
    const name = window.prompt("Template name");
    if (!name || !name.trim()) return;
    try {
      const res = await fetch("/api/builder/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          theme,
          brand,
          blocks,
          isShared: false,
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as {
          id: string;
          name: string;
          theme: SiteTheme;
          blocks: SiteBlock[];
          createdAt: string;
        };
        setSavedTemplates((prev) => [
          { id: created.id, name: created.name, theme: created.theme, blocks: created.blocks, createdAt: created.createdAt },
          ...prev,
        ]);
        return;
      }
    } catch {
      // fallback below
    }
    const fallback: SavedTemplate = {
      id: makeId(),
      name: name.trim(),
      theme,
      blocks,
      createdAt: new Date().toISOString(),
    };
    const merged = [fallback, ...savedTemplates].slice(0, 20);
    setSavedTemplates(merged);
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(merged));
  };

  const applySavedTemplate = (id: string) => {
    const t = savedTemplates.find((x) => x.id === id);
    if (!t) return;
    setTheme(t.theme);
    setBrand({
      brandName: "",
      brandLogoUrl: "",
      primaryColor: "#0f172a",
      accentColor: "#334155",
    });
    setBlocks(t.blocks.map((b) => ({ ...b, id: makeId() })));
  };

  const removeSavedTemplate = async (id: string) => {
    try {
      await fetch(`/api/builder/templates/${id}`, { method: "DELETE" });
    } catch {
      // ignore and still update local state
    }
    setSavedTemplates((prev) => {
      const next = prev.filter((x) => x.id !== id);
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const saveBlockAsComponent = async (block: SiteBlock) => {
    const name = window.prompt("Component name");
    if (!name || !name.trim()) return;
    try {
      const res = await fetch("/api/builder/components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          block,
          isShared: false,
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as { id: string; name: string; block: SiteBlock; createdAt: string };
        setSavedComponents((prev) => [{ id: created.id, name: created.name, block: created.block, createdAt: created.createdAt }, ...prev]);
        return;
      }
    } catch {
      // fallback below
    }
    const fallback: ReusableComponent = {
      id: makeId(),
      name: name.trim(),
      block,
      createdAt: new Date().toISOString(),
    };
    const merged = [fallback, ...savedComponents].slice(0, 50);
    setSavedComponents(merged);
    localStorage.setItem(COMPONENT_STORAGE_KEY, JSON.stringify(merged));
  };

  const insertSavedComponent = (id: string) => {
    const c = savedComponents.find((x) => x.id === id);
    if (!c) return;
    setBlocks((prev) => [...prev, { ...c.block, id: makeId() }]);
  };

  const removeSavedComponent = async (id: string) => {
    try {
      await fetch(`/api/builder/components/${id}`, { method: "DELETE" });
    } catch {
      // ignore and still update local state
    }
    setSavedComponents((prev) => {
      const next = prev.filter((x) => x.id !== id);
      localStorage.setItem(COMPONENT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportTemplateLibrary = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      templates: savedTemplates,
      components: savedComponents,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `site-builder-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTemplateLibrary = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsedImport = JSON.parse(text) as {
        templates?: SavedTemplate[];
        components?: ReusableComponent[];
      };
      const importedTemplates = Array.isArray(parsedImport.templates) ? parsedImport.templates : [];
      const importedComponents = Array.isArray(parsedImport.components) ? parsedImport.components : [];

      for (const tpl of importedTemplates) {
        try {
          await fetch("/api/builder/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: tpl.name,
              theme: tpl.theme,
              brand,
              blocks: tpl.blocks,
              isShared: false,
            }),
          });
        } catch {
          // Continue importing remaining items
        }
      }
      for (const comp of importedComponents) {
        try {
          await fetch("/api/builder/components", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: comp.name,
              block: comp.block,
              isShared: false,
            }),
          });
        } catch {
          // Continue importing remaining items
        }
      }

      const templatesRes = await fetch("/api/builder/templates");
      if (templatesRes.ok) {
        const serverTemplates = (await templatesRes.json()) as SavedTemplate[];
        setSavedTemplates(serverTemplates);
      }
      const componentsRes = await fetch("/api/builder/components");
      if (componentsRes.ok) {
        const serverComponents = (await componentsRes.json()) as ReusableComponent[];
        setSavedComponents(serverComponents);
      }
    } catch {
      toast("Invalid template library file.", "error");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const handleUploadMedia = async (files: FileList | null) => {
    if (!files || !mediaTarget) return;
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setIsUploading(true);
    try {
      const urls: string[] = [];
      for (const file of fileArray) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) continue;
        const data = (await res.json()) as { url?: string };
        if (data.url) urls.push(data.url);
      }
      if (urls.length === 0) return;
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== mediaTarget.blockId) return b;
          if (mediaTarget.field === "gallery") {
            return { ...b, linksText: [b.linksText?.trim(), ...urls].filter(Boolean).join("\n") };
          }
          if (mediaTarget.field === "logoCloud") {
            return { ...b, logosText: [b.logosText?.trim(), ...urls].filter(Boolean).join("\n") };
          }
          if (mediaTarget.field === "video") {
            return { ...b, videoUrl: urls[0] };
          }
          if (mediaTarget.field === "team") {
            const lines = urls.map((u) => `Member|Role|Bio|${u}`).join("\n");
            return { ...b, teamText: [b.teamText?.trim(), lines].filter(Boolean).join("\n") };
          }
          if (mediaTarget.field === "columns") {
            const appended = urls.map((u) => `![Image](${u})`).join("\n");
            return { ...b, columnsText: [b.columnsText?.trim(), appended].filter(Boolean).join("\n") };
          }
          const appended = urls.map((u) => `![Image](${u})`).join("\n\n");
          return { ...b, markdown: [b.markdown?.trim(), appended].filter(Boolean).join("\n\n") };
        })
      );
    } finally {
      setIsUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
          <Sparkles className="h-3.5 w-3.5" />
          Visual builder
        </div>
        <div className="inline-flex items-center rounded border border-slate-300 bg-white p-1 text-xs">
          <button
            type="button"
            onClick={() => setTheme("clean")}
            className={`rounded px-2 py-1 ${theme === "clean" ? "bg-slate-900 text-white" : "text-slate-700"}`}
          >
            Clean
          </button>
          <button
            type="button"
            onClick={() => setTheme("soft")}
            className={`rounded px-2 py-1 ${theme === "soft" ? "bg-slate-900 text-white" : "text-slate-700"}`}
          >
            Soft
          </button>
          <button
            type="button"
            onClick={() => setTheme("bold")}
            className={`rounded px-2 py-1 ${theme === "bold" ? "bg-slate-900 text-white" : "text-slate-700"}`}
          >
            Bold
          </button>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={saveCurrentAsTemplate}>
          <Save className="h-3.5 w-3.5" />
          Save template
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={exportTemplateLibrary}>
          <Download className="h-3.5 w-3.5" />
          Export library
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => importInputRef.current?.click()}
        >
          <FileUp className="h-3.5 w-3.5" />
          Import library
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => importTemplateLibrary(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">One-click starter templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={applyStarterTemplate}>
                  Personal starter
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={applyAgencyTemplate}>
                  Creative portfolio
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={applyPortfolioTemplate}>
                  Resume &amp; FAQ
                </Button>
              </div>
              {savedTemplates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">Saved templates</p>
                  {savedTemplates.map((tpl) => (
                    <div key={tpl.id} className="flex items-center justify-between rounded border border-slate-200 bg-white px-2 py-1.5">
                      <button
                        type="button"
                        className="text-sm text-slate-700 hover:underline"
                        onClick={() => applySavedTemplate(tpl.id)}
                      >
                        {tpl.name}
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => removeSavedTemplate(tpl.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Brand (white-label prep)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Brand name"
                value={brand.brandName}
                onChange={(e) => setBrand((b) => ({ ...b, brandName: e.target.value }))}
              />
              <Input
                placeholder="Brand logo URL"
                value={brand.brandLogoUrl}
                onChange={(e) => setBrand((b) => ({ ...b, brandLogoUrl: e.target.value }))}
              />
              <label className="text-xs text-slate-600">
                Primary color
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={brand.primaryColor}
                    onChange={(e) => setBrand((b) => ({ ...b, primaryColor: e.target.value }))}
                  />
                  <Input
                    value={brand.primaryColor}
                    onChange={(e) => setBrand((b) => ({ ...b, primaryColor: e.target.value }))}
                  />
                </div>
              </label>
              <label className="text-xs text-slate-600">
                Accent color
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={brand.accentColor}
                    onChange={(e) => setBrand((b) => ({ ...b, accentColor: e.target.value }))}
                  />
                  <Input
                    value={brand.accentColor}
                    onChange={(e) => setBrand((b) => ({ ...b, accentColor: e.target.value }))}
                  />
                </div>
              </label>
            </CardContent>
          </Card>

          {savedComponents.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Reusable components</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {savedComponents.map((component) => (
                  <div
                    key={component.id}
                    className="flex items-center justify-between rounded border border-slate-200 bg-white px-2 py-1.5"
                  >
                    <button
                      type="button"
                      className="text-sm text-slate-700 hover:underline"
                      onClick={() => insertSavedComponent(component.id)}
                    >
                      {component.name}
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => removeSavedComponent(component.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={sectionSearch}
              onChange={(e) => setSectionSearch(e.target.value)}
              placeholder="Search sections..."
              className="max-w-xs bg-white"
            />
            {filteredLibrary.map((item) => (
              <Button
                key={`${item.type}-${item.label}`}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addBlock(item.type)}
                className="gap-1"
                title={item.category}
              >
                <Plus className="h-3.5 w-3.5" />
                {item.label}
              </Button>
            ))}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {blocks.map((block) => (
                  <SortableBlockCard
                    key={block.id}
                    block={block}
                    onChange={(next) => updateBlock(block.id, next)}
                    onDelete={() => deleteBlock(block.id)}
                    onDuplicate={() => duplicateBlock(block.id)}
                    onOpenMedia={(field) => openMediaFor(block.id, field)}
                    onSaveComponent={() => saveBlockAsComponent(block)}
                    onToggleCollapse={() => toggleCollapse(block.id)}
                    collapsed={collapsed.has(block.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="rounded border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={!mediaTarget || isUploading}
                onClick={() => uploadInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {isUploading ? "Uploading..." : "Upload media directly"}
              </Button>
              <span className="text-xs text-slate-500">
                Select a block &quot;Insert/Add from Media&quot; first, then upload files directly into that block.
              </span>
            </div>
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => handleUploadMedia(e.target.files)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="inline-flex items-center gap-2"><Eye className="h-4 w-4" />Live preview</span>
                <span className="inline-flex gap-1 rounded border border-slate-300 p-1">
                  <button
                    type="button"
                    onClick={() => setDevicePreview("desktop")}
                    className={`rounded px-2 py-1 text-xs ${devicePreview === "desktop" ? "bg-slate-900 text-white" : "text-slate-700"}`}
                  >
                    <Monitor className="mr-1 inline h-3 w-3" />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevicePreview("mobile")}
                    className={`rounded px-2 py-1 text-xs ${devicePreview === "mobile" ? "bg-slate-900 text-white" : "text-slate-700"}`}
                  >
                    <Smartphone className="mr-1 inline h-3 w-3" />
                    Mobile
                  </button>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`mx-auto space-y-3 ${devicePreview === "mobile" ? "max-w-sm" : "max-w-full"}`}
                style={{ borderTop: `3px solid ${brand.primaryColor}` }}
              >
                {(brand.brandName || brand.brandLogoUrl) && (
                  <div
                    className="rounded border p-3"
                    style={{ borderColor: brand.accentColor, color: brand.primaryColor }}
                  >
                    <p className="text-sm font-semibold">{brand.brandName || "Brand"}</p>
                    {brand.brandLogoUrl && (
                      <p className="text-xs opacity-80">Logo: {brand.brandLogoUrl}</p>
                    )}
                  </div>
                )}
                {blocks.map((b) => (
                  <BlockPreview key={`preview-${b.id}`} block={b} device={devicePreview} theme={theme} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <LayoutPanelTop className="h-4 w-4" />
                Quick flow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-slate-600">
                {quickFlowTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Drag blocks to reorder. Theme and layout are stored in Markdown-friendly format and can still be edited manually.
      </p>

      <InsertMediaModal
        open={showMedia}
        onClose={() => setShowMedia(false)}
        onSelect={(url) => {
          handleMediaSelect(url);
          setShowMedia(false);
          setMediaTarget(null);
        }}
      />
    </div>
  );
}

