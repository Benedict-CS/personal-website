"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { PluggableList } from "unified";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import {
  markdownArticleClassName,
  markdownRemarkPlugins,
  markdownRehypePlugins,
} from "@/lib/markdown-pipeline";
import { expandDevEmbeds } from "@/lib/markdown-dev-embeds";
import { GitHubStatsBlock } from "@/components/dev-blocks/github-stats-block";
import { LeetCodeStatsBlock } from "@/components/dev-blocks/leetcode-stats-block";
import { BlogMarkdownPre } from "@/components/markdown/blog-markdown-pre";
import { BlogMarkdownImage } from "@/components/markdown/blog-markdown-image";
import "highlight.js/styles/github.css";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
  postId?: string; // Used to persist checkbox state
  editable?: boolean; // Whether checkbox can be toggled (saved to DB)
}

export function MarkdownRenderer({ content, postId, editable = false }: MarkdownRendererProps) {
  const [checkboxStates, setCheckboxStates] = useState<Record<number, boolean>>({});
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Reset when content changes
  useEffect(() => {
    setCheckboxStates({});
  }, [content]);

  // Handle checkbox toggle (persist to DB when editable)
  const handleCheckboxToggle = async (checkboxIndex: number, checked: boolean) => {
    // Update local state first (immediate feedback)
    setCheckboxStates((prev) => ({
      ...prev,
      [checkboxIndex]: checked,
    }));

    if (postId && editable) {
      try {
        const response = await fetch(`/api/posts/${postId}/checkbox`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checkboxIndex,
            checked,
          }),
        });

        if (response.ok) {
          await response.json();
        }
      } catch (error) {
        console.error("Failed to save checkbox:", error);
        // Revert on failure
        setCheckboxStates((prev) => ({
          ...prev,
          [checkboxIndex]: !checked,
        }));
      }
    }
  };


  // Lightbox: close on Esc
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxSrc(null);
    };
    if (lightboxSrc) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxSrc]);

  // Orphan li (e.g. inside span) get bullet so published view matches edit preview
  useEffect(() => {
    const styleId = "markdown-renderer-orphan-li";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      .markdown-renderer li:not(ul > li):not(ol > li) {
        list-style-type: disc;
        display: list-item;
        margin-left: 1.5em;
      }
    `;
  }, []);

  let checkboxCounter = 0;

  const markdownBody = useMemo(() => expandDevEmbeds(content), [content]);

  const components: Components = {
    div: ({ className, children, ...props }) => {
      const cls = String(className ?? "");
      const data = props as Record<string, unknown>;
      const du = String(data["data-user"] ?? "");
      if (cls.includes("dev-embed-github") && du) {
        const variant = data["data-variant"] === "repos" ? "repos" : "overview";
        return (
          <div className="not-prose my-6 max-w-3xl">
            <GitHubStatsBlock username={du} variant={variant} />
          </div>
        );
      }
      if (cls.includes("dev-embed-leetcode") && du) {
        return (
          <div className="not-prose my-6 max-w-md">
            <LeetCodeStatsBlock username={du} />
          </div>
        );
      }
      return <div className={className}>{children}</div>;
    },
    pre: ({ children, ...props }) => <BlogMarkdownPre {...props}>{children}</BlogMarkdownPre>,
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      const isInline = !match;

      if (isInline) {
        return (
          <code
            className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono"
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    img: ({ src, alt, title }) => {
      const srcStr = typeof src === "string" ? src : null;
      if (!srcStr) return null;
      const fullSrc = srcStr.startsWith("http") || srcStr.startsWith("/") ? srcStr : `/${srcStr}`;
      return (
        <span className="image-block my-6 block w-full">
          <BlogMarkdownImage
            src={fullSrc}
            alt={alt ?? ""}
            title={title}
            onOpenLightbox={setLightboxSrc}
          />
        </span>
      );
    },
    // YouTube / Vimeo links: render as responsive embed; other links stay normal
    a: ({ href, children, ...props }) => {
      const url = typeof href === "string" ? href : "";
      let embedUrl: string | null = null;
      let title = "Video";
      if (url.includes("youtube.com/watch?v=") || url.includes("youtu.be/")) {
        const m = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/);
        if (m) {
          embedUrl = `https://www.youtube.com/embed/${m[1]}`;
          title = "YouTube video";
        }
      } else if (url.includes("vimeo.com/") && !url.includes("/video/")) {
        const m = url.match(/vimeo\.com\/(\d+)(?:\/|$)/);
        if (m) {
          embedUrl = `https://player.vimeo.com/video/${m[1]}`;
          title = "Vimeo video";
        }
      }
      if (embedUrl) {
        return (
          <div className="my-4 rounded-lg overflow-hidden bg-slate-900" style={{ aspectRatio: "16/9", maxWidth: "100%" }}>
            <iframe
              src={embedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    },
    table: ({ children, ...props }) => {
      return (
        <div className="markdown-table-shell my-6 w-full overflow-x-auto rounded-lg border border-slate-200/90 bg-white shadow-sm">
          <table {...props} className="min-w-full border-collapse border-0 text-sm">
            {children}
          </table>
        </div>
      );
    },
    thead: ({ children, ...props }) => {
      return (
        <thead {...props} className="bg-slate-100">
          {children}
        </thead>
      );
    },
    tbody: ({ children, ...props }) => {
      return <tbody {...props}>{children}</tbody>;
    },
    tr: ({ children, ...props }) => {
      return (
        <tr {...props} className="border-b border-slate-200 last:border-b-0">
          {children}
        </tr>
      );
    },
    th: ({ children, ...props }) => {
      return (
        <th
          {...props}
          className="border border-slate-200 bg-slate-50/90 px-4 py-2 text-left text-sm font-semibold text-slate-900"
        >
          {children}
        </th>
      );
    },
    ul: ({ children, ...props }) => {
      return (
        <ul
          {...props}
          className="list-disc list-outside ml-6 mt-0.5 mb-2 space-y-1"
        >
          {children}
        </ul>
      );
    },
    ol: ({ children, ...props }) => {
      return (
        <ol
          {...props}
          className="list-decimal list-outside ml-6 mt-0.5 mb-2 space-y-1"
        >
          {children}
        </ol>
      );
    },
    li: ({ children, ...props }) => {
      return (
        <li
          {...props}
          className="text-slate-700"
        >
          {children}
        </li>
      );
    },
    td: ({ children, ...props }) => {
      let firstText = "";
      if (typeof children === 'string') {
        firstText = children;
      } else if (Array.isArray(children) && children.length > 0) {
        const first = children[0];
        if (typeof first === 'string') {
          firstText = first;
        }
      }

      const checkboxMatch = firstText.match(/^\s*\[([xX ])\]\s*/);
      
      if (checkboxMatch) {
        const isChecked = checkboxMatch[1].toLowerCase() === 'x';
        const checkboxIndex = checkboxCounter++;
        const currentState = checkboxStates[checkboxIndex] ?? isChecked;
        let remainingContent: React.ReactNode = children;
        let isAloneCheckbox = false;

        if (typeof children === 'string') {
          const cleaned = children.replace(/^\s*\[([xX ])\]\s*/, '');
          remainingContent = cleaned;
          if (!cleaned.trim()) {
            isAloneCheckbox = true;
          }
        } else if (Array.isArray(children)) {
          const firstChild = children[0];
          if (typeof firstChild === 'string') {
            const updated = firstChild.replace(/^\s*\[([xX ])\]\s*/, '');
            remainingContent = [updated, ...children.slice(1)];
          }
        }

        if (isAloneCheckbox) {
          return (
            <td
              {...props}
              className="border border-slate-200 px-4 py-2 text-center"
            >
              <input
                type="checkbox"
                checked={currentState}
                onChange={(e) => {
                  handleCheckboxToggle(checkboxIndex, e.target.checked);
                }}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </td>
          );
        }

        return (
          <td
            {...props}
            className="border border-slate-200 px-4 py-2 text-slate-700"
          >
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={currentState}
                onChange={(e) => {
                  handleCheckboxToggle(checkboxIndex, e.target.checked);
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
              />
              <div>{remainingContent}</div>
            </div>
          </td>
        );
      }

      return (
        <td
          {...props}
          className="border border-slate-200 px-4 py-2 text-slate-700"
        >
          {children}
        </td>
      );
    },
  };

  return (
    <>
      <article data-markdown-article className={markdownArticleClassName}>
        <ReactMarkdown
          remarkPlugins={markdownRemarkPlugins}
          rehypePlugins={markdownRehypePlugins as PluggableList}
          components={components}
        >
          {markdownBody}
        </ReactMarkdown>
      </article>
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/90 p-2 text-slate-800 hover:bg-white focus:outline-none focus:ring-2 focus:ring-white"
            onClick={() => setLightboxSrc(null)}
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <span className="bg-white rounded shadow-2xl p-1 max-w-full max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxSrc}
              alt="Enlarged preview"
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
            />
          </span>
        </div>
      )}
    </>
  );
}
