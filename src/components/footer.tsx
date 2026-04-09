"use client";

import Link from "next/link";
import {
  Mail,
  Linkedin,
  Github,
  Rss,
  Youtube,
  Instagram,
  Twitter,
} from "lucide-react";
import type { SiteConfigForRender } from "@/types/site";

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  twitter: Twitter,
  x: Twitter,
  linkedin: Linkedin,
  github: Github,
  instagram: Instagram,
  youtube: Youtube,
};

function getSocialOrder(): string[] {
  return ["twitter", "x", "instagram", "linkedin", "github", "youtube"];
}

/** RSS routes return XML, not RSC — Next.js <Link> would request ?_rsc= and break (504 / preload warnings). */
function rssHrefNeedsPlainAnchor(href: string): boolean {
  const raw = href.trim().split("?")[0];
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const p = new URL(raw).pathname;
      return p === "/feed.xml" || p.startsWith("/feed/");
    } catch {
      return false;
    }
  }
  return raw === "/feed.xml" || raw.startsWith("/feed/");
}

export function Footer({
  siteConfig: config,
}: {
  siteConfig?: SiteConfigForRender | null;
}) {
  const year = new Date().getFullYear();
  const links = config?.links ?? {};
  const socialLinks = config?.socialLinks ?? {};
  const name = config?.authorName ?? config?.siteName ?? "My Site";
  const footerText = config?.footerText?.trim() || "All rights reserved.";
  const copyrightText = config?.copyrightText?.trim();

  const email = links?.email;
  const emailHref = email
    ? email.startsWith("mailto:")
      ? email
      : email.includes("@")
        ? `mailto:${email}`
        : email
    : null;
  const rss = links?.rss?.trim() || "/feed.xml";

  const socialEntries: Array<{ key: string; url: string; title: string }> = [];
  const order = getSocialOrder();
  const seen = new Set<string>();
  for (const key of order) {
    const url = socialLinks[key];
    if (url && typeof url === "string" && url.trim() && !seen.has(key)) {
      seen.add(key);
      socialEntries.push({
        key,
        url: url.trim(),
        title: key.charAt(0).toUpperCase() + key.slice(1),
      });
    }
  }
  /** Merge legacy `links.linkedin` / `links.github` even when other socialLinks exist (e.g. Twitter only in socialLinks). */
  const pushIfNew = (key: "linkedin" | "github", url: string | null | undefined) => {
    const t = typeof url === "string" ? url.trim() : "";
    if (!t || seen.has(key)) return;
    seen.add(key);
    socialEntries.push({
      key,
      url: t,
      title: key === "linkedin" ? "LinkedIn" : "GitHub",
    });
  };
  pushIfNew("linkedin", socialLinks.linkedin || links?.linkedin);
  pushIfNew("github", socialLinks.github || links?.github);

  const copyrightLine = copyrightText
    ? copyrightText.replace(/\{year\}/g, String(year))
    : `© ${year} ${name}. ${footerText}`;

  return (
    <footer className="relative z-20 mt-auto border-t border-border bg-muted/50">
      <div className="container mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-4 text-muted-foreground shrink-0">
            {email ? (
              <Link
                href={emailHref || "/contact"}
                data-editor-button="footer.email"
                className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-lg hover:text-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                title="Contact"
              >
                <Mail className="h-5 w-5" />
              </Link>
            ) : null}
            {socialEntries.map(({ key, url, title }) => {
              const Icon = SOCIAL_ICONS[key] ?? Github;
              return (
                <Link
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-editor-button={`footer.${key}`}
                  className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-lg hover:text-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  title={title}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            })}
            {rssHrefNeedsPlainAnchor(rss) ? (
              <a
                href={rss}
                target="_blank"
                rel="noopener noreferrer"
                data-editor-button="footer.rss"
                className="flex items-center gap-1 min-h-[40px] px-1.5 rounded-lg hover:text-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                title="Subscribe via RSS"
              >
                <Rss className="h-5 w-5" />
                <span className="text-xs sm:text-sm" data-editor-button-label>
                  RSS
                </span>
              </a>
            ) : (
              <Link
                href={rss}
                target="_blank"
                rel="noopener noreferrer"
                data-editor-button="footer.rss"
                className="flex items-center gap-1 min-h-[40px] px-1.5 rounded-lg hover:text-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                title="Subscribe via RSS"
              >
                <Rss className="h-5 w-5" />
                <span className="text-xs sm:text-sm" data-editor-button-label>
                  RSS
                </span>
              </Link>
            )}
          </div>
          <p
            className="text-xs sm:text-sm leading-tight text-muted-foreground text-center sm:text-right min-w-0"
            data-editor-site="footer.author"
          >
            {copyrightLine}
          </p>
        </div>
      </div>
    </footer>
  );
}
