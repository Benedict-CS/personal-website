import Link from "next/link";
import { Mail, Linkedin, Github, Rss } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-20 mt-auto border-t border-slate-200 bg-slate-50/80">
      <div className="container mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-6 text-slate-600">
            <Link
              href={`mailto:${siteConfig.links.email}`}
              className="hover:text-slate-900 transition-colors"
              title="Email"
            >
              <Mail className="h-5 w-5" />
            </Link>
            <Link
              href={siteConfig.links.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 transition-colors"
              title="LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </Link>
            <Link
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 transition-colors"
              title="GitHub"
            >
              <Github className="h-5 w-5" />
            </Link>
            <Link
              href="/feed.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
              title="Subscribe via RSS"
            >
              <Rss className="h-5 w-5" />
              <span className="text-sm">RSS</span>
            </Link>
          </div>
          <p className="text-sm text-slate-500">
            © {year} {siteConfig.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
