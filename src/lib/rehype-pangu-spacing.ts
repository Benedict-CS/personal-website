import type { Element, Root } from "hast";
import { visitParents } from "unist-util-visit-parents";
import pangu from "pangu";

const SKIP_ANCESTOR_TAGS = new Set(["code", "pre", "script", "style", "kbd", "samp", "svg", "math"]);

function hasKatexAncestor(ancestors: unknown[]): boolean {
  for (const a of ancestors) {
    if (!a || typeof a !== "object" || !("type" in a) || (a as { type: string }).type !== "element") {
      continue;
    }
    const el = a as Element;
    const cls = el.properties?.className;
    const s = Array.isArray(cls) ? cls.join(" ") : cls != null ? String(cls) : "";
    if (s.includes("katex")) return true;
  }
  return false;
}

/**
 * Inserts spacing between CJK and Latin characters in text nodes (rehype, post-sanitize).
 * Skips code, pre, math (KaTeX), and SVG.
 */
export function rehypePanguSpacing() {
  return (tree: Root) => {
    visitParents(tree, "text", (node, ancestors) => {
      if (!ancestors.length) return;
      if (ancestors.some((a) => a.type === "element" && SKIP_ANCESTOR_TAGS.has((a as Element).tagName))) {
        return;
      }
      if (hasKatexAncestor(ancestors)) return;
      node.value = pangu.spacingText(node.value);
    });
  };
}
