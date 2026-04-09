import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkSmartypants from "remark-smartypants";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { MarkdownBodyServer } from "@/components/markdown/markdown-body-server";
import { CodePlayground } from "@/components/mdx/embeds/code-playground";
import { AbTestStats } from "@/components/mdx/embeds/ab-test-stats";
import { TechStackGrid } from "@/components/mdx/embeds/tech-stack-grid";

const mdxComponents = {
  CodePlayground,
  AbTestStats,
  TechStackGrid,
};

type Props = {
  content: string;
  postId?: string;
  editable?: boolean;
};

/**
 * Server-rendered MDX for public blog posts. Falls back to Markdown on compile errors.
 */
export async function MdxPostBody({ content, postId, editable = false }: Props) {
  let compiled: Awaited<ReturnType<typeof compileMDX>> | null = null;
  try {
    compiled = await compileMDX({
      source: content,
      components: mdxComponents,
      options: {
        mdxOptions: {
          remarkPlugins: [remarkGfm, remarkMath, remarkSmartypants],
        },
      },
    });
  } catch {
    if (editable) {
      return <MarkdownRenderer content={content} postId={postId} editable />;
    }
    return <MarkdownBodyServer content={content} />;
  }

  return (
    <article data-mdx-article className="prose prose-lg max-w-none markdown-renderer">
      {compiled.content}
    </article>
  );
}
