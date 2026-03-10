"use client";

import { MarkdownRenderer } from "@/components/markdown-renderer";

export function HomeCustomMarkdownSection({
  id,
  title,
  content,
}: {
  id: string;
  title?: string;
  content: string;
}) {
  if (!content?.trim()) return null;
  return (
    <section
      key={id}
      data-home-section={id}
      className="container mx-auto max-w-6xl px-6 py-16"
    >
      <div className="mx-auto max-w-3xl prose prose-slate max-w-none">
        {title?.trim() ? (
          <h2 className="text-3xl font-bold text-[var(--foreground)] mb-6">
            {title}
          </h2>
        ) : null}
        <MarkdownRenderer content={content} />
      </div>
    </section>
  );
}
