import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Root as MdastRoot } from "mdast";

/**
 * Parse Markdown (GFM + math) into an mdast tree for inspection and tooling.
 * Powers the dashboard Markdown AST Lab: inspect tables, math, and GFM nodes
 * when debugging MDX pipelines, migrations, and render parity—higher leverage
 * for a technical author than a generic canvas or toy terminal.
 */
export function parseMarkdownToMdast(source: string): MdastRoot {
  return unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(source) as MdastRoot;
}
