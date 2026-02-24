"use client";

import { useEffect, useRef } from "react";

/**
 * Giscus comments (GitHub Discussions). Renders only when env vars are set.
 * Set in .env: NEXT_PUBLIC_GISCUS_REPO, NEXT_PUBLIC_GISCUS_REPO_ID,
 * NEXT_PUBLIC_GISCUS_CATEGORY, NEXT_PUBLIC_GISCUS_CATEGORY_ID.
 * See https://giscus.app/
 */
export function GiscusComments({ mapping = "pathname" }: { mapping?: "pathname" | "url" | "title" | "og:title" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;

  useEffect(() => {
    if (!repo || !repoId || !category || !categoryId || !containerRef.current) return;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.setAttribute("data-repo", repo);
    script.setAttribute("data-repo-id", repoId);
    script.setAttribute("data-category", category);
    script.setAttribute("data-category-id", categoryId);
    script.setAttribute("data-mapping", mapping);
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-theme", "preferred_color_scheme");
    script.setAttribute("data-lang", "en");
    script.async = true;
    script.crossOrigin = "anonymous";

    containerRef.current.appendChild(script);
    return () => {
      containerRef.current?.querySelector("script[src*='giscus']")?.remove();
    };
  }, [repo, repoId, category, categoryId, mapping]);

  if (!repo || !repoId || !category || !categoryId) return null;

  return <div ref={containerRef} className="mt-10 border-t border-slate-200 pt-8" aria-label="Comments" />;
}
