import Link from "next/link";
import { Mail, Linkedin, Github, Rss } from "lucide-react";
import { siteConfig } from "@/config/site";
import type { SiteConfigForRender } from "@/lib/site-config";

export function Footer({ siteConfig: siteConfigProp }: { siteConfig?: SiteConfigForRender | null }) {
  const year = new Date().getFullYear();
  const links = siteConfigProp?.links ?? siteConfig.links;
  const name = siteConfigProp?.authorName ?? siteConfigProp?.siteName ?? siteConfig.name;
  const footerLine = siteConfigProp?.footerText?.trim() || "All rights reserved.";
  const email = links?.email ?? siteConfig.links.email;
  const linkedin = links?.linkedin ?? siteConfig.links.linkedin;
  const github = links?.github ?? siteConfig.links.github;

  return (
    <footer className="relative z-20 mt-auto border-t border-slate-200 bg-slate-50/80">
      <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex items-center gap-2 sm:gap-6 text-slate-600 shrink-0">
            {email ? (
              <Link
                href="/contact"
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md hover:text-slate-900 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                title="Contact"
              >
                <Mail className="h-5 w-5" />
              </Link>
            ) : null}
            {linkedin ? (
              <Link
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md hover:text-slate-900 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                title="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </Link>
            ) : null}
            {github ? (
              <Link
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md hover:text-slate-900 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                title="GitHub"
              >
                <Github className="h-5 w-5" />
              </Link>
            ) : null}
            <Link
              href="/feed.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 min-h-[44px] px-2 rounded-md hover:text-slate-900 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              title="Subscribe via RSS"
            >
              <Rss className="h-5 w-5" />
              <span className="text-sm">RSS</span>
            </Link>
          </div>
          <p className="text-sm text-slate-500 text-center sm:text-right min-w-0">
            © {year} {name}. {footerLine}
          </p>
        </div>
      </div>
    </footer>
  );
}
