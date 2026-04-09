"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  /** Default code shown in the playground */
  defaultCode?: string;
  language?: string;
  title?: string;
};

/**
 * Lightweight in-post code sample with copy — interactive shell for MDX embeds.
 */
export function CodePlayground({
  defaultCode = '// Try editing\nconsole.log("Hello");',
  language = "javascript",
  title = "Code",
}: Props) {
  const [code, setCode] = useState(defaultCode);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="not-prose my-8 rounded-xl border border-border bg-card shadow-[var(--elevation-1)]">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title} · {language}
        </span>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        className="w-full resize-y rounded-b-xl border-0 bg-muted/80 px-4 py-3 font-mono text-sm leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-inset focus:ring-border min-h-[140px]"
        aria-label="Editable code sample"
      />
    </div>
  );
}
