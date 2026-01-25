"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TocItem {
  id: string;
  text: string;
  level: number;
  parentId?: string; // 用於追蹤 h3 屬於哪個 h2
}

interface TableOfContentsProps {
  content: string;
}

// 生成 slug，與 rehype-slug 的邏輯一致
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // 移除特殊字元
    .replace(/[\s_-]+/g, "-") // 將空格和底線轉換為連字號
    .replace(/^-+|-+$/g, ""); // 移除開頭和結尾的連字號
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [expandedH2, setExpandedH2] = useState<string>(""); // 當前展開的 h2

  // 從 DOM 直接讀取渲染後的標題（等待 markdown 渲染完成）
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

        // 追蹤 h3 屬於哪個 h2
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

  // 監聽滾動，高亮當前標題
  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const headingElements = headings.map((h) => {
        const element = document.getElementById(h.id);
        return element ? { id: h.id, offsetTop: element.offsetTop } : null;
      }).filter(Boolean) as { id: string; offsetTop: number }[];

      const scrollPosition = window.scrollY + 100; // 加上一些偏移

      // 找到當前應該高亮的標題
      let currentId = "";
      for (let i = headingElements.length - 1; i >= 0; i--) {
        if (scrollPosition >= headingElements[i].offsetTop) {
          currentId = headingElements[i].id;
          break;
        }
      }

      setActiveId(currentId || headings[0]?.id || "");

      // 根據 activeId 決定展開哪個 h2
      const activeHeading = headings.find(h => h.id === currentId);
      if (activeHeading) {
        if (activeHeading.level === 2) {
          // 如果 active 是 h2，展開它
          setExpandedH2(activeHeading.id);
        } else if (activeHeading.level === 3 && activeHeading.parentId) {
          // 如果 active 是 h3，展開它的父 h2
          setExpandedH2(activeHeading.parentId);
        } else if (activeHeading.level === 1) {
          // 如果 active 是 h1，收起所有
          setExpandedH2("");
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // 初始執行一次

    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <div className="hidden lg:block w-full">
      <div className="max-h-[calc(100vh-5rem)] overflow-y-auto">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            On This Page
          </h2>
          <nav className="space-y-1">
            {headings.map((heading) => {
              // h3 只在其父 h2 展開時才顯示
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
                      ? "text-blue-600 font-semibold border-blue-600 bg-blue-50"
                      : "text-slate-600 hover:text-slate-900 border-transparent hover:border-slate-300"
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(heading.id);
                    if (element) {
                      const offsetTop = element.offsetTop - 80; // 考慮 navbar 高度
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
