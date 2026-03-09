"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";
import "highlight.js/styles/atom-one-light.css";

/** Renders image with next/image, unoptimized to preserve original format (no WebP). */
function MarkdownImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className={cn("relative block w-full", className)} style={{ paddingBottom: "56.25%" }}>
      {!loaded && (
        <span
          className="absolute inset-0 block animate-pulse rounded bg-slate-200"
          aria-hidden
        />
      )}
      <Image
        src={src}
        alt={alt ?? ""}
        fill
        unoptimized
        className={cn("object-contain transition-opacity duration-200", !loaded && "opacity-0")}
        onLoad={() => setLoaded(true)}
        sizes="(max-width: 768px) 100vw, 800px"
      />
    </span>
  );
}
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
  postId?: string; // Used to persist checkbox state
  editable?: boolean; // Whether checkbox can be toggled (saved to DB)
}

export function MarkdownRenderer({ content, postId, editable = false }: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
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


  // Inject styles to override highlight.js background (keep pre background only)
  useEffect(() => {
    const styleId = "hljs-override";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      pre code.hljs,
      pre .hljs {
        background-color: transparent !important;
        background: transparent !important;
        color: inherit !important;
      }
      pre code.hljs *,
      pre .hljs * {
        background-color: transparent !important;
        background: transparent !important;
      }
    `;
  }, []);

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

  const handleCopyCode = async (code: string, codeId: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand("copy");
        } catch (err) {
          console.error("Fallback copy failed:", err);
        }
        document.body.removeChild(textArea);
      }
      setCopiedCode(codeId);
      setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
      try {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopiedCode(codeId);
        setTimeout(() => {
          setCopiedCode(null);
        }, 2000);
      } catch (fallbackError) {
        console.error("Fallback copy also failed:", fallbackError);
      }
    }
  };

  let checkboxCounter = 0;

  const components: Components = {
    pre: ({ children, ...props }) => {
      let codeString = "";
      if (children) {
        if (React.isValidElement(children)) {
          const codeBlock = children as React.ReactElement<{ children?: React.ReactNode }>;
          const blockChildren = codeBlock.props?.children;
          
          if (typeof blockChildren === "string") {
            codeString = blockChildren;
          } else if (Array.isArray(blockChildren)) {
            codeString = blockChildren
              .map((child: React.ReactNode) => {
                if (typeof child === "string") return child;
                if (React.isValidElement(child)) {
                  const childElement = child as React.ReactElement<{ children?: React.ReactNode }>;
                  const childContent = childElement.props?.children;
                  if (typeof childContent === "string") {
                    return childContent;
                  }
                  if (Array.isArray(childContent)) {
                    return childContent
                      .map((c: React.ReactNode) => (typeof c === "string" ? c : ""))
                      .join("");
                  }
                }
                return "";
              })
              .join("");
          } else if (React.isValidElement(blockChildren)) {
            const nestedElement = blockChildren as React.ReactElement<{ children?: React.ReactNode }>;
            const nestedContent = nestedElement.props?.children;
            if (typeof nestedContent === "string") {
              codeString = nestedContent;
            }
          }
        } else if (Array.isArray(children)) {
          codeString = children
            .map((child: React.ReactNode) => {
              if (typeof child === "string") return child;
              if (React.isValidElement(child)) {
                const childElement = child as React.ReactElement<{ children?: React.ReactNode }>;
                const childContent = childElement.props?.children;
                if (typeof childContent === "string") return childContent;
              }
              return "";
            })
            .join("");
        } else if (typeof children === "string") {
          codeString = children;
        }
      }

      const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
      const isCopied = copiedCode === codeId;

      return (
        <div className="relative group">
          <pre
            {...props}
            className="bg-slate-50 text-slate-800 p-4 rounded-lg mb-4 border border-slate-200 [&_code]:!bg-transparent [&_code]:!text-inherit [&_.hljs]:!bg-transparent [&_.hljs]:!text-inherit"
            style={{
              overflowX: "auto",
              overflowY: "hidden",
              whiteSpace: "pre",
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            {children}
          </pre>
          {codeString && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-700/80 hover:bg-slate-600/80 text-white z-10"
              onClick={() => handleCopyCode(codeString, codeId)}
              style={{
                position: "absolute",
                top: "0.5rem",
                right: "0.5rem",
              }}
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          )}
        </div>
      );
    },
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
    img: ({ src, alt }) => {
      const srcStr = typeof src === "string" ? src : null;
      if (!srcStr) return null;
      const fullSrc = srcStr.startsWith("http") || srcStr.startsWith("/") ? srcStr : `/${srcStr}`;
      return (
        <span className="image-block block mt-2 mb-0 relative w-full min-h-[120px]">
          <button
            type="button"
            onClick={() => setLightboxSrc(fullSrc)}
            className="inline-block w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 rounded overflow-hidden relative min-h-[120px]"
            title="Click to enlarge"
          >
            <MarkdownImage src={fullSrc} alt={alt ?? ""} className="block" />
          </button>
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
        <div className="overflow-x-auto my-4">
          <table
            {...props}
            className="min-w-full border-collapse border border-slate-300"
          >
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
        <tr {...props} className="border-b border-slate-300">
          {children}
        </tr>
      );
    },
    th: ({ children, ...props }) => {
      return (
        <th
          {...props}
          className="border border-slate-300 px-4 py-2 text-left font-semibold text-slate-900"
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
              className="border border-slate-300 px-4 py-2 text-center"
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
            className="border border-slate-300 px-4 py-2 text-slate-700"
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
          className="border border-slate-300 px-4 py-2 text-slate-700"
        >
          {children}
        </td>
      );
    },
  };

  return (
    <>
      <div className="prose prose-lg max-w-none overflow-hidden markdown-renderer">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeSlug, rehypeKatex, rehypeHighlight]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt="Enlarged preview"
            className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
