"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TocItem {
  id: string;
  text: string;
  level: number;
  parentId?: string; // Which h2 this h3 belongs to
}

interface TableOfContentsProps {
  content: string;
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [expandedH2, setExpandedH2] = useState<string>("");
  const [sectionProgress, setSectionProgress] = useState(0);

  // Read headings from DOM after markdown has rendered
  useEffect(() => {
    const timer = setTimeout(() => {
      const articleElement = document.querySelector("article") || document.body;
      const headingElements = articleElement.querySelectorAll("h1[id], h2[id], h3[id]");
      
      const matches: TocItem[] = [];
      let lastH2Id = "";

      Array.from(headingElements).forEach((element) => {
        const tagName = element.tagName.toLowerCase();
        const level = parseInt(tagName.substring(1));
        const text = element.textContent || "";
        const id = element.id;

        // Track which h2 each h3 belongs to
        if (level === 2) {
          lastH2Id = id;
        }

        matches.push({ 
          id, 
          text, 
          level,
          parentId: level === 3 ? lastH2Id : undefined
        });
      });

      setHeadings(matches);
    }, 100);

    return () => clearTimeout(timer);
  }, [content]);

  // Scroll listener to highlight current heading and section progress
  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const headingElements = headings.map((h) => {
        const element = document.getElementById(h.id);
        return element ? { id: h.id, offsetTop: element.offsetTop } : null;
      }).filter(Boolean) as { id: string; offsetTop: number }[];

      const scrollPosition = window.scrollY + 100;

      // Find heading to highlight
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

      // Section progress: 0–100% through the list
      const progress = headingElements.length > 1
        ? Math.round((currentIndex / (headingElements.length - 1)) * 100)
        : 100;
      setSectionProgress(progress);

      // Expand h2 based on activeId
      const activeHeading = headings.find(h => h.id === currentId);
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

  return (
    <div className="hidden lg:block w-full">
      <div className="max-h-[calc(100vh-5rem)] overflow-y-auto">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              On This Page
            </h2>
            {headings.length > 1 && (
              <span className="text-xs text-slate-400 tabular-nums" aria-hidden>
                {sectionProgress}%
              </span>
            )}
          </div>
          {headings.length > 1 && (
            <div className="mb-4 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-slate-300 transition-all duration-200 ease-out"
                style={{ width: `${sectionProgress}%` }}
              />
            </div>
          )}
          <nav className="space-y-1">
            {headings.map((heading) => {
              // Show h3 only when parent h2 is expanded
              if (heading.level === 3) {
                if (heading.parentId !== expandedH2) {
                  return null;
                }
              }

              return (
                <Link
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={`block text-sm transition-all duration-200 py-1 border-l-2 ${
                    heading.level === 1
                      ? "pl-3 font-medium"
                      : heading.level === 2
                      ? "pl-5"
                      : "pl-7"
                  } ${
                    activeId === heading.id
                      ? "text-slate-900 font-semibold border-slate-700 bg-slate-100"
                      : "text-slate-600 hover:text-slate-900 border-transparent hover:border-slate-300"
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
      </div>
    </div>
  );
}
