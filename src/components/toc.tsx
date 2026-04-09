"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MarkdownTocHeading } from "@/lib/markdown-toc";
import { markdownTocToNavItems } from "@/lib/markdown-toc";

interface TocItem {
  id: string;
  text: string;
  level: number;
  parentId?: string;
}

interface TableOfContentsProps {
  content: string;
  /** Server-parsed headings (matches rehype-slug); enables mobile TOC and faster first paint */
  initialHeadings?: MarkdownTocHeading[];
}

export function TableOfContents({ content, initialHeadings }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TocItem[]>(() =>
    initialHeadings?.length ? markdownTocToNavItems(initialHeadings) : []
  );
  const [activeId, setActiveId] = useState<string>("");
  const [expandedH2, setExpandedH2] = useState<string>("");
  const [sectionProgress, setSectionProgress] = useState(0);

  // Refine from DOM after markdown renders (math, HTML, etc.)
  useEffect(() => {
    const timer = setTimeout(() => {
      const root =
        document.querySelector("[data-markdown-article]") ||
        document.querySelector("article") ||
        document.body;
      const headingElements = root.querySelectorAll("h1[id], h2[id], h3[id]");

      const matches: TocItem[] = [];
      let lastH2Id = "";

      Array.from(headingElements).forEach((element) => {
        const tagName = element.tagName.toLowerCase();
        const level = parseInt(tagName.substring(1), 10);
        const text = element.textContent || "";
        const id = element.id;

        if (level === 2) {
          lastH2Id = id;
        }

        matches.push({
          id,
          text,
          level,
          parentId: level === 3 ? lastH2Id : undefined,
        });
      });

      if (matches.length > 0) {
        setHeadings(matches);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [content]);

  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const headingElements = headings
        .map((h) => {
          const element = document.getElementById(h.id);
          return element ? { id: h.id, offsetTop: element.offsetTop } : null;
        })
        .filter(Boolean) as { id: string; offsetTop: number }[];

      const scrollPosition = window.scrollY + 100;

      let currentId = "";
      let currentIndex = 0;
      for (let i = headingElements.length - 1; i >= 0; i--) {
        if (scrollPosition >= headingElements[i].offsetTop) {
          currentId = headingElements[i].id;
          currentIndex = i;
          break;
        }
      }

      setActiveId(currentId || headings[0]?.id || "");

      const progress =
        headingElements.length > 1
          ? Math.round((currentIndex / (headingElements.length - 1)) * 100)
          : 100;
      setSectionProgress(progress);

      const activeHeading = headings.find((h) => h.id === currentId);
      if (activeHeading) {
        if (activeHeading.level === 2) {
          setExpandedH2(activeHeading.id);
        } else if (activeHeading.level === 3 && activeHeading.parentId) {
          setExpandedH2(activeHeading.parentId);
        } else if (activeHeading.level === 1) {
          setExpandedH2("");
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  const tocPanel = (variant: "sidebar" | "drawer") => (
    <div className={variant === "sidebar" ? "rounded-lg border border-border bg-card p-4" : "px-4 pb-1"}>
      {variant === "sidebar" && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">On this page</h2>
          {headings.length > 1 && (
            <span className="text-xs text-muted-foreground/70 tabular-nums" aria-hidden>
              {sectionProgress}%
            </span>
          )}
        </div>
      )}
      {variant === "drawer" && headings.length > 1 && (
        <div className="mb-3 flex justify-end">
          <span className="text-xs text-muted-foreground/70 tabular-nums" aria-hidden>
            {sectionProgress}%
          </span>
        </div>
      )}
      {headings.length > 1 && (
        <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-muted-foreground/35 transition-all duration-200 ease-out"
            style={{ width: `${sectionProgress}%` }}
          />
        </div>
      )}
      <nav className="space-y-1">
        {headings.map((heading) => {
          if (heading.level === 3) {
            if (heading.parentId !== expandedH2) {
              return null;
            }
          }

          return (
            <Link
              key={heading.id}
              href={`#${heading.id}`}
              className={`block border-l-2 py-1 text-sm transition-all duration-200 ${
                heading.level === 1
                  ? "pl-3 font-medium"
                  : heading.level === 2
                    ? "pl-5"
                    : "pl-7"
              } ${
                activeId === heading.id
                  ? "border-foreground/50 bg-muted font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById(heading.id);
                if (element) {
                  const offsetTop = element.offsetTop - 80;
                  window.scrollTo({
                    top: offsetTop,
                    behavior: "smooth",
                  });
                }
              }}
            >
              {heading.text}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <div className="mb-6 w-full lg:hidden">
        <details className="group rounded-lg border border-border bg-card open:shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              On this page
              <span className="text-muted-foreground/70 transition-transform group-open:rotate-180" aria-hidden>
                ▾
              </span>
            </span>
          </summary>
          <div className="border-t border-border/60 pt-2">{tocPanel("drawer")}</div>
        </details>
      </div>

      <div className="hidden w-full lg:block">
        <div className="max-h-[calc(100vh-5rem)] w-full overflow-y-auto">{tocPanel("sidebar")}</div>
      </div>
    </>
  );
}
