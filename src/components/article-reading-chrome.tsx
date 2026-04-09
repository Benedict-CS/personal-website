"use client";

import { useEffect, useState } from "react";

type Props = {
  /** Article title shown in the sticky bar (truncated). */
  title?: string;
};

/**
 * Sticky reading chrome below the main navbar: thin progress bar and optional title + percentage.
 */
export function ArticleReadingChrome({ title }: Props) {
  const [progress, setProgress] = useState(0);
  const [showTitleRow, setShowTitleRow] = useState(false);

  useEffect(() => {
    const updateProgress = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollableHeight = documentHeight - windowHeight;
      if (scrollableHeight > 0) {
        setProgress(Math.min(100, (scrollTop / scrollableHeight) * 100));
      } else {
        setProgress(100);
      }
      setShowTitleRow(scrollTop > 56);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div className="sticky top-14 z-40 w-full border-b border-slate-200/80 bg-[var(--background)]/90 shadow-sm backdrop-blur-md print:hidden sm:top-16">
      <div className="h-0.5 w-full bg-slate-200" aria-hidden>
        <div
          className="h-full bg-slate-600 transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {title && showTitleRow ? (
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <span className="min-w-0 truncate text-sm font-medium tracking-tight text-slate-800">{title}</span>
          <span className="shrink-0 tabular-nums text-xs font-medium text-slate-500">
            {Math.round(progress)}%
          </span>
        </div>
      ) : null}
    </div>
  );
}
