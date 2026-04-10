import type { ReactNode } from "react";
import type { Components } from "react-markdown";
import { GitHubStatsBlock } from "@/components/dev-blocks/github-stats-block";
import { LeetCodeStatsBlock } from "@/components/dev-blocks/leetcode-stats-block";
import { BlogMarkdownPre } from "@/components/markdown/blog-markdown-pre";
import { BlogMarkdownImage } from "@/components/markdown/blog-markdown-image";
import { resolveMarkdownVideoEmbed } from "@/components/markdown/markdown-video-embed";
import {
  INLINE_CODE_CLASS,
  MARKDOWN_LI_CLASS,
  MARKDOWN_OL_CLASS,
  MARKDOWN_TABLE_CLASS,
  MARKDOWN_TABLE_SHELL_CLASS,
  MARKDOWN_TD_CHECKBOX_CLASS,
  MARKDOWN_TD_CHECKBOX_INLINE_CLASS,
  MARKDOWN_TD_CHECKBOX_ONLY_CLASS,
  MARKDOWN_TD_CLASS,
  MARKDOWN_TH_CLASS,
  MARKDOWN_THEAD_CLASS,
  MARKDOWN_TR_CLASS,
  MARKDOWN_UL_CLASS,
} from "@/components/markdown/markdown-component-classes";

/**
 * React-markdown `components` for server-rendered markdown (no lightbox, no interactive checkboxes).
 * Call once per render so the table checkbox counter resets.
 */
function extractCodeFilenameFromMeta(node: unknown): string | undefined {
  const n = node as { data?: { meta?: unknown } } | undefined;
  const meta = typeof n?.data?.meta === "string" ? n.data.meta : "";
  if (!meta) return undefined;
  const quoted = /(?:file|filename|title)=["']([^"']+)["']/i.exec(meta);
  if (quoted?.[1]) return quoted[1];
  const unquoted = /(?:file|filename|title)=([^\s]+)/i.exec(meta);
  if (unquoted?.[1]) return unquoted[1];
  return undefined;
}

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
    code: ({ className, children, node, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      const isInline = !match;
      if (isInline) {
        return (
          <code className={INLINE_CODE_CLASS} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code
          className={className}
          data-filename={extractCodeFilenameFromMeta(node)}
          {...props}
        >
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
      const embed = resolveMarkdownVideoEmbed(url);
      if (embed) {
        return (
          <div className="my-4 rounded-lg overflow-hidden bg-foreground" style={{ aspectRatio: "16/9", maxWidth: "100%" }}>
            <iframe
              src={embed.embedUrl}
              title={embed.title}
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
      <div className={MARKDOWN_TABLE_SHELL_CLASS}>
        <table {...props} className={MARKDOWN_TABLE_CLASS}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead {...props} className={MARKDOWN_THEAD_CLASS}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
    tr: ({ children, ...props }) => (
      <tr {...props} className={MARKDOWN_TR_CLASS}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }) => (
      <th {...props} className={MARKDOWN_TH_CLASS}>
        {children}
      </th>
    ),
    ul: ({ children, ...props }) => (
      <ul {...props} className={MARKDOWN_UL_CLASS}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol {...props} className={MARKDOWN_OL_CLASS}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li {...props} className={MARKDOWN_LI_CLASS}>
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
            <td {...props} className={MARKDOWN_TD_CHECKBOX_ONLY_CLASS}>
              <input
                type="checkbox"
                readOnly
                checked={isChecked}
                tabIndex={-1}
                className={MARKDOWN_TD_CHECKBOX_CLASS}
                aria-label="Task"
              />
            </td>
          );
        }
        return (
          <td {...props} className={MARKDOWN_TD_CLASS}>
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                readOnly
                checked={isChecked}
                tabIndex={-1}
                className={MARKDOWN_TD_CHECKBOX_INLINE_CLASS}
                aria-label="Task"
              />
              <div>{remainingContent}</div>
            </div>
          </td>
        );
      }
      return (
        <td {...props} className={MARKDOWN_TD_CLASS}>
          {children}
        </td>
      );
    },
  };
}
