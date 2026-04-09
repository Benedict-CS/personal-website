"use client";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { PublicSection } from "@/components/public/public-layout";

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
    <PublicSection data-home-section={id} density="section">
      <div className="mx-auto max-w-3xl prose prose-slate max-w-none">
        {title?.trim() ? (
          <h2 className="text-3xl font-bold text-[var(--foreground)] mb-6">
            {title}
          </h2>
        ) : null}
        <MarkdownRenderer content={content} />
      </div>
    </PublicSection>
  );
}
