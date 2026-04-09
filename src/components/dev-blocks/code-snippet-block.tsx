"use client";

import { useEffect, useRef, useState } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-light.css";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

export function CodeSnippetBlock({
  code,
  language,
  filename,
  className,
}: {
  code: string;
  language: string;
  filename?: string;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const lang = (language || "plaintext").toLowerCase().replace(/^language-/, "");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      const result = hljs.getLanguage(lang)
        ? hljs.highlight(code, { language: lang, ignoreIllegals: true })
        : hljs.highlightAuto(code);
      el.innerHTML = result.value;
      el.className = `hljs block whitespace-pre font-mono text-foreground language-${result.language ?? lang}`;
    } catch {
      el.textContent = code;
    }
  }, [code, lang]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-lg border border-border bg-muted shadow-sm ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
        <span className="truncate font-mono text-xs font-medium text-muted-foreground">
          {filename?.trim() ? filename.trim() : `snippet.${lang || "txt"}`}
        </span>
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => void copy()}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="m-0 max-h-[min(480px,70vh)] overflow-auto p-4 text-sm leading-relaxed">
        <code ref={ref} />
      </pre>
    </div>
  );
}
