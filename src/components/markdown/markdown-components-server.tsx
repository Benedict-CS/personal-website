import type { ReactNode } from "react";
import type { Components } from "react-markdown";
import { GitHubStatsBlock } from "@/components/dev-blocks/github-stats-block";
import { LeetCodeStatsBlock } from "@/components/dev-blocks/leetcode-stats-block";
import { BlogMarkdownPre } from "@/components/markdown/blog-markdown-pre";
import { BlogMarkdownImage } from "@/components/markdown/blog-markdown-image";

/**
 * React-markdown `components` for server-rendered markdown (no lightbox, no interactive checkboxes).
 * Call once per render so the table checkbox counter resets.
 */
export function createServerMarkdownComponents(): Components {
  return {
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
            className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm font-mono"
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
          <BlogMarkdownImage src={fullSrc} alt={alt ?? ""} title={title} />
        </span>
      );
    },
    a: ({ href, children, ...props }) => {
      const url = typeof href === "string" ? href : "";
      let embedUrl: string | null = null;
      let embedTitle = "Video";
      if (url.includes("youtube.com/watch?v=") || url.includes("youtu.be/")) {
        const m = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/);
        if (m) {
          embedUrl = `https://www.youtube.com/embed/${m[1]}`;
          embedTitle = "YouTube video";
        }
      } else if (url.includes("vimeo.com/") && !url.includes("/video/")) {
        const m = url.match(/vimeo\.com\/(\d+)(?:\/|$)/);
        if (m) {
          embedUrl = `https://player.vimeo.com/video/${m[1]}`;
          embedTitle = "Vimeo video";
        }
      }
      if (embedUrl) {
        return (
          <div className="my-4 rounded-lg overflow-hidden bg-foreground" style={{ aspectRatio: "16/9", maxWidth: "100%" }}>
            <iframe
              src={embedUrl}
              title={embedTitle}
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
    table: ({ children, ...props }) => (
      <div className="markdown-table-shell my-6 w-full overflow-x-auto rounded-lg border border-border/90 bg-card shadow-sm">
        <table {...props} className="min-w-full border-collapse border-0 text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead {...props} className="bg-muted">
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
    tr: ({ children, ...props }) => (
      <tr {...props} className="border-b border-border last:border-b-0">
        {children}
      </tr>
    ),
    th: ({ children, ...props }) => (
      <th
        {...props}
        className="border border-border bg-muted/90 px-4 py-2 text-left text-sm font-semibold text-foreground"
      >
        {children}
      </th>
    ),
    ul: ({ children, ...props }) => (
      <ul {...props} className="list-disc list-outside ml-6 mt-0.5 mb-2 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol {...props} className="list-decimal list-outside ml-6 mt-0.5 mb-2 space-y-1">
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li {...props} className="text-foreground/90">
        {children}
      </li>
    ),
    td: ({ children, ...props }) => {
      let firstText = "";
      if (typeof children === "string") {
        firstText = children;
      } else if (Array.isArray(children) && children.length > 0) {
        const first = children[0];
        if (typeof first === "string") firstText = first;
      }
      const checkboxMatch = firstText.match(/^\s*\[([xX ])\]\s*/);
      if (checkboxMatch) {
        const isChecked = checkboxMatch[1].toLowerCase() === "x";
        let remainingContent: ReactNode = children;
        let isAloneCheckbox = false;
        if (typeof children === "string") {
          const cleaned = children.replace(/^\s*\[([xX ])\]\s*/, "");
          remainingContent = cleaned;
          if (!cleaned.trim()) isAloneCheckbox = true;
        } else if (Array.isArray(children)) {
          const firstChild = children[0];
          if (typeof firstChild === "string") {
            const updated = firstChild.replace(/^\s*\[([xX ])\]\s*/, "");
            remainingContent = [updated, ...children.slice(1)];
          }
        }
        if (isAloneCheckbox) {
          return (
            <td {...props} className="border border-border px-4 py-2 text-center">
              <input
                type="checkbox"
                readOnly
                checked={isChecked}
                tabIndex={-1}
                className="h-4 w-4 rounded border-border text-blue-600 pointer-events-none"
                aria-label="Task"
              />
            </td>
          );
        }
        return (
          <td {...props} className="border border-border px-4 py-2 text-foreground/90">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                readOnly
                checked={isChecked}
                tabIndex={-1}
                className="mt-0.5 h-4 w-4 rounded border-border text-blue-600 pointer-events-none flex-shrink-0"
                aria-label="Task"
              />
              <div>{remainingContent}</div>
            </div>
          </td>
        );
      }
      return (
        <td {...props} className="border border-border px-4 py-2 text-foreground/90">
          {children}
        </td>
      );
    },
  };
}
