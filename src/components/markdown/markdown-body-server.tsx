import type { PluggableList } from "unified";
import { MarkdownAsync } from "react-markdown";
import { expandDevEmbeds } from "@/lib/markdown-dev-embeds";
import {
  markdownArticleClassName,
  markdownRemarkPlugins,
  markdownRehypePlugins,
} from "@/lib/markdown-pipeline";
import { createServerMarkdownComponents } from "@/components/markdown/markdown-components-server";
import "highlight.js/styles/github.css";
import "katex/dist/katex.min.css";

type Props = {
  content: string;
  /** Optional extra classes on the outer <article> (default: full markdown article styles). */
  className?: string;
};

/**
 * Server-only markdown render using {@link MarkdownAsync} so parsing never runs in the browser.
 * Use for public About, blog (logged-out), custom pages, and MDX fallbacks — avoids client hydration errors.
 */
export async function MarkdownBodyServer({ content, className }: Props) {
  const components = createServerMarkdownComponents();
  const body = expandDevEmbeds(content);
  const articleClass = className ?? markdownArticleClassName;

  return (
    <article data-markdown-article className={articleClass}>
      <MarkdownAsync
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={markdownRehypePlugins as PluggableList}
        components={components}
      >
        {body}
      </MarkdownAsync>
    </article>
  );
}
