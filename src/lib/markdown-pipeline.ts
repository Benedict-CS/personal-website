import rehypePrettyCode from "rehype-pretty-code";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkSmartypants from "remark-smartypants";
import { rehypePanguSpacing } from "@/lib/rehype-pangu-spacing";

/** Schema that allows <style>, class, and inline style so blog posts match editor preview. */
export const markdownBlogPostSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "style"],
  attributes: {
    ...defaultSchema.attributes,
    div: [...(defaultSchema.attributes?.div ?? []), "className", "data-user", "data-variant", "role"],
    span: [...(defaultSchema.attributes?.span ?? []), "className"],
    img: [...(defaultSchema.attributes?.img ?? []), "title", "loading", "decoding", "sizes", "srcSet"],
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "style"],
  },
};

export const markdownRemarkPlugins = [remarkGfm, remarkMath, remarkSmartypants];

export const markdownRehypePlugins = [
  rehypeRaw,
  [rehypeSanitize, markdownBlogPostSchema],
  rehypeSlug,
  rehypeKatex,
  [
    rehypePrettyCode,
    {
      theme: "github-light",
      keepBackground: false,
      defaultLang: "txt",
    },
  ],
  rehypePanguSpacing,
];

export const markdownArticleClassName =
  "prose prose-lg max-w-none markdown-renderer font-[family-name:var(--font-geist-sans)] leading-7 [overflow-wrap:anywhere] [&_code]:font-[family-name:var(--font-geist-mono)] [&_pre]:font-[family-name:var(--font-geist-mono)]";

/** Smaller type for About block cards (matches previous `prose prose-slate prose-sm` wrapper). */
export const markdownArticleClassNameProseSm =
  "prose prose-slate prose-sm max-w-none markdown-renderer font-[family-name:var(--font-geist-sans)] [&_code]:font-[family-name:var(--font-geist-mono)] [&_pre]:font-[family-name:var(--font-geist-mono)]";

/** About legacy main markdown card (`prose prose-slate` without `prose-lg`). */
export const markdownArticleClassNameProseSlate =
  "prose prose-slate max-w-none markdown-renderer font-[family-name:var(--font-geist-sans)] [&_code]:font-[family-name:var(--font-geist-mono)] [&_pre]:font-[family-name:var(--font-geist-mono)]";
