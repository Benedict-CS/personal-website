"use client";

import { useEffect, useState, Fragment } from "react";
import { evaluate } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkSmartypants from "remark-smartypants";
import { jsx, jsxs } from "react/jsx-runtime";
import { CodePlayground } from "@/components/mdx/embeds/code-playground";
import { AbTestStats } from "@/components/mdx/embeds/ab-test-stats";
import { TechStackGrid } from "@/components/mdx/embeds/tech-stack-grid";

const useMDXComponents = () => ({
  CodePlayground,
  AbTestStats,
  TechStackGrid,
});

const DEBOUNCE_MS = 380;

/**
 * Client-side MDX preview for the dashboard (trusted author content only).
 */
export function MdxDashboardPreview({ source }: { source: string }) {
  const [node, setNode] = useState<React.ReactNode>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const mod = await evaluate(source, {
            Fragment,
            jsx,
            jsxs,
            development: process.env.NODE_ENV === "development",
            remarkPlugins: [remarkGfm, remarkMath, remarkSmartypants],
            useMDXComponents,
          });
          const Content = mod.default;
          if (!cancelled) {
            setError(null);
            setNode(<Content />);
          }
        } catch (e) {
          if (!cancelled) {
            setNode(null);
            setError(e instanceof Error ? e.message : "Could not compile MDX");
          }
        }
      })();
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [source]);

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        MDX preview: {error}
      </div>
    );
  }
  if (!node) {
    return <p className="text-sm text-muted-foreground">Preparing MDX preview…</p>;
  }

  return (
    <div className="markdown-renderer prose prose-slate max-w-none prose-headings:tracking-tight">{node}</div>
  );
}
