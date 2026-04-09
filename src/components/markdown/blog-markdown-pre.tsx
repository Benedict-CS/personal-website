"use client";

import React, { useId, useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { extractCodeTextFromPreChildren } from "@/components/markdown/extract-pre-code-text";

const LANG_LABELS: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TSX",
  js: "JavaScript",
  jsx: "JSX",
  mjs: "JavaScript",
  cjs: "JavaScript",
  py: "Python",
  rb: "Ruby",
  rs: "Rust",
  go: "Go",
  sh: "Shell",
  bash: "Bash",
  zsh: "Zsh",
  yml: "YAML",
  yaml: "YAML",
  md: "Markdown",
  json: "JSON",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
};

function formatLanguageLabel(lang: string): string {
  const lower = lang.toLowerCase();
  return LANG_LABELS[lower] ?? lang.charAt(0).toUpperCase() + lower.slice(1);
}

function parseLanguageFromPreChildren(children: React.ReactNode): string {
  if (!React.isValidElement(children)) return "";
  const code = children as React.ReactElement<{ className?: string }>;
  const cls = code.props?.className;
  if (typeof cls !== "string") return "";
  const m = /language-([\w-]+)/.exec(cls);
  return m?.[1] ?? "";
}

function parseFileNameFromPreChildren(children: React.ReactNode): string {
  if (!React.isValidElement(children)) return "";
  const code = children as React.ReactElement<{ ["data-filename"]?: string }>;
  return typeof code.props?.["data-filename"] === "string" ? code.props["data-filename"] : "";
}

type Props = React.HTMLAttributes<HTMLPreElement> & {
  children?: React.ReactNode;
};

const LINE_HEIGHT = 1.65;
const CODE_SIZE_REM = 0.8125;

export function BlogMarkdownPre({ children, className, ...props }: Props) {
  const codeString = useMemo(() => extractCodeTextFromPreChildren(children), [children]);
  const langId = useMemo(() => parseLanguageFromPreChildren(children), [children]);
  const lines = useMemo(() => {
    const raw = codeString.replace(/\n$/, "");
    return raw.length === 0 ? [""] : raw.split("\n");
  }, [codeString]);

  const [copied, setCopied] = useState(false);
  const instanceId = useId();
  const fileName = useMemo(() => parseFileNameFromPreChildren(children), [children]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = codeString;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* ignore */
      }
    }
  };

  const showLineNumbers = lines.length <= 400;
  const langLabel = langId ? formatLanguageLabel(langId) : "Code";

  return (
    <div
      className={cn(
        "not-prose my-5 w-full max-w-full overflow-hidden rounded-xl border border-border/90 bg-muted/95 shadow-[var(--elevation-1)]",
        "markdown-code-frame"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/90 bg-card/90 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {langLabel}
          </span>
          {fileName ? (
            <span className="rounded border border-border bg-muted/60 px-1.5 py-px font-mono text-[10px] text-muted-foreground">
              {fileName}
            </span>
          ) : null}
        </div>
        {codeString ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1 px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground",
              copied && "text-emerald-700"
            )}
            onClick={handleCopy}
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <Check
                  key="copied"
                  className="markdown-copy-icon-pop h-3.5 w-3.5 shrink-0 text-emerald-600"
                  aria-hidden
                />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 shrink-0" />
                Copy
              </>
            )}
          </Button>
        ) : null}
      </div>
      <div className="flex min-h-0 min-w-0">
        {showLineNumbers ? (
          <div
            className="markdown-code-gutter shrink-0 select-none border-r border-border/90 bg-muted/90 py-3 pl-2 pr-2 text-right font-mono text-[11px] tabular-nums text-muted-foreground/70"
            style={{ lineHeight: LINE_HEIGHT }}
            aria-hidden
          >
            {lines.map((_, i) => (
              <div key={`${instanceId}-ln-${i}`}>{i + 1}</div>
            ))}
          </div>
        ) : null}
        <pre
          {...props}
          className={cn(
            "markdown-code-pre min-w-0 flex-1 overflow-x-auto py-3 pr-3 pl-2",
            "bg-transparent text-foreground [&_code]:!bg-transparent [&_code]:!text-inherit [&_.hljs]:!bg-transparent [&_code_span]:!bg-transparent",
            "markdown-code-scrollbar",
            className
          )}
          style={{
            overflowX: "auto",
            overflowY: "hidden",
            whiteSpace: "pre",
            fontSize: `${CODE_SIZE_REM}rem`,
            lineHeight: LINE_HEIGHT,
            margin: 0,
          }}
        >
          {children}
        </pre>
      </div>
    </div>
  );
}
