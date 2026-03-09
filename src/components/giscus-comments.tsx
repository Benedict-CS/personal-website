"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Giscus comments (GitHub Discussions). Loads config from /api/giscus-config so
 * Docker runtime env works; falls back to NEXT_PUBLIC_* when available at build time.
 * Set in .env: NEXT_PUBLIC_GISCUS_* or GISCUS_* (for Docker runtime).
 * See https://giscus.app/
 */
export function GiscusComments({ mapping = "pathname" }: { mapping?: "pathname" | "url" | "title" | "og:title" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const envConfig =
    process.env.NEXT_PUBLIC_GISCUS_REPO &&
    process.env.NEXT_PUBLIC_GISCUS_REPO_ID &&
    process.env.NEXT_PUBLIC_GISCUS_CATEGORY &&
    process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID
      ? {
          repo: process.env.NEXT_PUBLIC_GISCUS_REPO,
          repoId: process.env.NEXT_PUBLIC_GISCUS_REPO_ID,
          category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY,
          categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
        }
      : null;
  const [config, setConfig] = useState<{
    repo: string;
    repoId: string;
    category: string;
    categoryId: string;
  } | null>(envConfig);

  // Prefer build-time env; otherwise fetch from API (for Docker runtime)
  useEffect(() => {
    if (config) return;
    fetch("/api/giscus-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.enabled && data.repo && data.repoId && data.category && data.categoryId) {
          setConfig({
            repo: data.repo,
            repoId: data.repoId,
            category: data.category,
            categoryId: data.categoryId,
          });
        }
      })
      .catch(() => {});
  }, [config]);

  useEffect(() => {
    if (!config || !containerRef.current) return;
    const container = containerRef.current;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.setAttribute("data-repo", config.repo);
    script.setAttribute("data-repo-id", config.repoId);
    script.setAttribute("data-category", config.category);
    script.setAttribute("data-category-id", config.categoryId);
    script.setAttribute("data-mapping", mapping);
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "bottom");
    script.setAttribute("data-theme", "light");
    script.setAttribute("data-lang", "en");
    script.async = true;
    script.crossOrigin = "anonymous";

    container.appendChild(script);
    return () => {
      container.querySelector("script[src*='giscus']")?.remove();
    };
  }, [config, mapping]);

  return (
    <div className="mt-10 border-t border-slate-200 pt-8" aria-label="Comments">
      <div ref={containerRef} />
      {config && (
        <p className="mt-2 text-xs text-slate-500">
          Leave a comment via GitHub (Giscus). Sign in with GitHub to post.
        </p>
      )}
    </div>
  );
}
