"use client";

import { memo } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import type { VisualBlock } from "@/types/saas";
import {
  parseFormFieldsText,
  parseProjectsText,
  parseSkillsText,
  parseTimelineText,
} from "@/lib/personal-brand-blocks";
import { SkillBlockIcon } from "@/components/personal-brand/skill-block-icon";
import { CodeSnippetBlock } from "@/components/dev-blocks/code-snippet-block";
import { GitHubStatsBlock } from "@/components/dev-blocks/github-stats-block";
import { LeetCodeStatsBlock } from "@/components/dev-blocks/leetcode-stats-block";

function styleFromMap(map: Record<string, unknown>): CSSProperties {
  return {
    paddingTop: Number(map.paddingTop ?? 24),
    paddingBottom: Number(map.paddingBottom ?? 24),
    paddingLeft: Number(map.paddingLeft ?? 24),
    paddingRight: Number(map.paddingRight ?? 24),
    marginTop: Number(map.marginTop ?? 0),
    marginBottom: Number(map.marginBottom ?? 16),
    borderRadius: Number(map.borderRadius ?? 12),
    background: String(map.backgroundGradient || map.backgroundColor || "#ffffff"),
    color: String(map.color || "#0f172a"),
    fontFamily: String(map.fontFamily || "Inter"),
    fontSize: Number(map.fontSize ?? 16),
    fontWeight: Number(map.fontWeight ?? 400),
    boxShadow: String(map.boxShadow || "0 1px 2px rgba(15,23,42,0.08)"),
    border: `1px solid ${String(map.borderColor || "#e2e8f0")}`,
  };
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map((x) => String(x)) : [];
}

function BlockNode({ block }: { block: VisualBlock }) {
  const style = styleFromMap(block.styles || {});
  const content = block.content || {};
  const title = text(content.title, block.type);
  const subtitle = text(content.subtitle, "Describe this section");

  switch (block.type) {
    case "MarketingHeroSplit":
    case "MarketingHeroSimple":
      return (
        <section style={style} className="space-y-3">
          <h2 className="text-3xl font-semibold">{title}</h2>
          <p className="text-slate-600">{subtitle}</p>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-white">
            {text(content.ctaText, "Get Started")}
          </button>
        </section>
      );
    case "MarketingFeatureGrid":
      return (
        <section style={style}>
          <h3 className="mb-3 text-2xl font-semibold">{title}</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {list(content.features).map((f) => (
              <div key={f} className="rounded border border-slate-200 bg-white p-3">{f}</div>
            ))}
          </div>
        </section>
      );
    case "MediaImage":
      return (
        <figure style={style} className="space-y-2">
          <Image
            src={text(content.src, "https://placehold.co/1200x600")}
            alt={text(content.alt, "block image")}
            width={1200}
            height={600}
            className="h-auto w-full rounded-md"
          />
        </figure>
      );
    case "InteractiveFormContact":
    case "InteractiveFormCustom":
      return (
        <section style={style} className="space-y-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <div className="grid gap-2">
            {list(content.fields).map((field) => (
              <input key={field} placeholder={field} className="rounded border border-slate-300 px-3 py-2" />
            ))}
            <button className="rounded-md bg-blue-600 px-4 py-2 text-white">Submit</button>
          </div>
        </section>
      );
    case "CommerceProductGrid":
      return (
        <section style={style} className="space-y-3">
          <h3 className="text-xl font-semibold">{text(content.title, "Featured products")}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: Number(content.limit ?? 4) }).map((_, idx) => (
              <div key={`p-${idx}`} className="rounded border border-slate-200 bg-white p-3">
                <div className="mb-2 h-24 rounded bg-slate-100" />
                <p className="font-medium">Product {idx + 1}</p>
                <p className="text-sm text-slate-500">$99.00</p>
              </div>
            ))}
          </div>
        </section>
      );
    case "CommerceSingleProduct":
      return (
        <section style={style} className="grid gap-3 md:grid-cols-2">
          <div className="h-48 rounded bg-slate-100" />
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold">{text(content.productSlug, "product-slug")}</h3>
            <p className="text-slate-600">Variant-aware product detail block for storefront pages.</p>
            <button className="rounded-md bg-blue-600 px-4 py-2 text-white">Add to cart</button>
          </div>
        </section>
      );
    case "CommerceCartDrawer":
      return (
        <section style={style}>
          <h3 className="text-xl font-semibold">Cart Drawer</h3>
          <p className="text-slate-600">Slide-out cart preview with quantity controls and subtotal.</p>
          <div className="mt-2 rounded border border-slate-200 p-2 text-sm">
            Position: {text(content.position, "right")} | Subtotal visibility: {String(content.showSubtotal ?? true)}
          </div>
        </section>
      );
    case "CommerceCheckoutFlow":
      return (
        <section style={style} className="space-y-2">
          <h3 className="text-xl font-semibold">Checkout Flow</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {list(content.steps).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      );
    case "CommerceCategorySidebar":
      return (
        <section style={style} className="space-y-2">
          <h3 className="text-xl font-semibold">Category Filters</h3>
          <ul className="space-y-1 text-sm">
            <li>All products</li>
            <li>Featured</li>
            <li>On sale</li>
          </ul>
        </section>
      );
    case "ProfessionalHero":
    case "professionalHero": {
      const img = text(content.profileImageUrl, "");
      return (
        <section style={style} className="overflow-hidden">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              {img ? (
                <Image src={img} alt={title} width={112} height={112} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">Photo</div>
              )}
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
              {content.tagline ? (
                <p className="mt-1 text-sm font-medium text-slate-700">{String(content.tagline)}</p>
              ) : null}
              <p className="mt-2 text-slate-600">{subtitle}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                {(content.ctaText ?? content.buttonText) ? (
                  <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                    {String(content.ctaText ?? content.buttonText)}
                  </span>
                ) : null}
                {(content.secondaryCtaText ?? content.secondaryButtonText) ? (
                  <span className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800">
                    {String(content.secondaryCtaText ?? content.secondaryButtonText)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      );
    }
    case "ResumeTimeline":
    case "resumeTimeline": {
      const entries = parseTimelineText(text(content.timelineText, ""));
      return (
        <section style={style}>
          <h3 className="mb-4 text-2xl font-semibold text-slate-900">{title}</h3>
          <ul className="space-y-4 border-l-2 border-slate-200 pl-5">
            {entries.map((e, i) => (
              <li key={`${e.period}-${i}`} className="relative">
                <span className="absolute -left-[1.35rem] top-2 h-2 w-2 rounded-full bg-slate-400" />
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{e.period}</p>
                <p className="font-semibold text-slate-900">{e.title}</p>
                <p className="text-sm text-slate-600">{e.organization}</p>
                {e.description ? <p className="mt-1 text-sm text-slate-600">{e.description}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      );
    }
    case "ProjectShowcase":
    case "projectShowcase": {
      const projects = parseProjectsText(text(content.projectsText, ""));
      return (
        <section style={style}>
          <h3 className="mb-4 text-2xl font-semibold text-slate-900">{title}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((p, i) => (
              <article
                key={`${p.title}-${i}`}
                className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="relative h-40 w-full bg-slate-100">
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt={p.title}
                      width={800}
                      height={320}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-slate-900">{p.title}</h4>
                  <p className="mt-1 text-sm text-slate-600">{p.summary}</p>
                  {p.link ? (
                    <a href={p.link} className="mt-2 inline-block text-sm font-medium text-blue-700 underline">
                      View project
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    }
    case "SkillGrid":
    case "skillGrid": {
      const skills = parseSkillsText(text(content.skillsText, ""));
      return (
        <section style={style}>
          <h3 className="mb-4 text-2xl font-semibold text-slate-900">{title}</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((s, i) => (
              <span
                key={`${s.name}-${i}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm"
              >
                <SkillBlockIcon iconKey={s.iconKey} />
                {s.name}
                {s.level ? <span className="text-slate-500">· {s.level}</span> : null}
              </span>
            ))}
          </div>
        </section>
      );
    }
    case "ContactFormModular":
    case "contactFormModular": {
      const fields = parseFormFieldsText(text(content.formFieldsText, ""));
      return (
        <section style={style} className="space-y-3">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          {content.intro || content.subtitle ? (
            <p className="text-sm text-slate-600">{String(content.intro ?? content.subtitle)}</p>
          ) : null}
          <div className="grid gap-2">
            {fields.map((f, i) => (
              <label key={`${f.label}-${i}`} className="block text-sm text-slate-700">
                {f.label}
                {f.required ? <span className="text-red-500"> *</span> : null}
                <span className="mt-1 block rounded border border-slate-200 bg-white px-3 py-2 text-slate-400">
                  {f.fieldType} field
                </span>
              </label>
            ))}
          </div>
        </section>
      );
    }
    case "CodeSnippet":
    case "codeSnippet": {
      const code = text(content.codeText, '// Hello\nconsole.log("world");');
      const lang = text(content.codeLanguage, "typescript");
      const fn = content.codeFilename != null ? String(content.codeFilename) : "";
      return (
        <section style={style} className="space-y-2">
          {title && title !== "CodeSnippet" && title !== "codeSnippet" ? (
            <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          ) : null}
          <CodeSnippetBlock code={code} language={lang} filename={fn || undefined} />
        </section>
      );
    }
    case "GitHubStats":
    case "githubStats": {
      const user = text(content.githubUsername, "");
      const variant = content.githubStatsVariant === "repos" ? "repos" : "overview";
      return (
        <section style={style} className="space-y-2">
          <h3 className="text-xl font-semibold text-slate-900">{title || "GitHub"}</h3>
          <GitHubStatsBlock username={user} variant={variant} />
        </section>
      );
    }
    case "LeetCodeStats":
    case "leetcodeStats": {
      const user = text(content.leetcodeUsername, "");
      return (
        <section style={style} className="space-y-2">
          <h3 className="text-xl font-semibold text-slate-900">{title || "LeetCode"}</h3>
          <LeetCodeStatsBlock username={user} />
        </section>
      );
    }
    default:
      return (
        <section style={style}>
          <h3 className="mb-1 text-xl font-semibold">{title}</h3>
          <p className="text-slate-600">{subtitle}</p>
        </section>
      );
  }
}

export const BlockRenderer = memo(function BlockRenderer({ blocks }: { blocks: VisualBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <BlockNode key={block.id} block={block} />
      ))}
    </div>
  );
});

