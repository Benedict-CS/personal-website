"use client";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { MdxDashboardPreview } from "@/components/mdx/mdx-dashboard-preview";
import { shouldRenderAsMdx } from "@/lib/mdx-content-detect";

type Props = {
  content: string;
};

/**
 * Live preview pane for the post editor: MDX evaluate path or Markdown renderer.
 */
export function PostBodyPreview({ content }: Props) {
  if (shouldRenderAsMdx(content)) {
    return <MdxDashboardPreview source={content} />;
  }
  return <MarkdownRenderer content={content} />;
}
