import { countSourceLines, countSourceWords } from "@/lib/markdown-source-metrics";

export type PostDraftMarkdownStatsModel = {
  words: number;
  lines: number;
  characters: number;
};

/** Word / line / character counts for CMS draft bodies (same rules as AST Lab metrics). */
export function computePostDraftMarkdownStats(markdown: string): PostDraftMarkdownStatsModel {
  return {
    words: countSourceWords(markdown),
    lines: countSourceLines(markdown),
    characters: markdown.length,
  };
}
