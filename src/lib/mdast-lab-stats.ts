import type { Root as MdastRoot, Content } from "mdast";

export type MdastLabStats = {
  nodes: number;
  heading: number;
  code: number;
  link: number;
  image: number;
  table: number;
  list: number;
  math: number;
};

/** Walk mdast children to count structural nodes (GFM + math). */
export function computeMdastStats(root: MdastRoot | null): MdastLabStats | null {
  if (!root) return null;
  const acc: MdastLabStats = {
    nodes: 0,
    heading: 0,
    code: 0,
    link: 0,
    image: 0,
    table: 0,
    list: 0,
    math: 0,
  };

  function visit(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    const t = n.type;
    if (typeof t === "string") {
      acc.nodes++;
      if (t === "heading") acc.heading++;
      else if (t === "code") acc.code++;
      else if (t === "link") acc.link++;
      else if (t === "image") acc.image++;
      else if (t === "table") acc.table++;
      else if (t === "list") acc.list++;
      else if (t === "math" || t === "inlineMath") acc.math++;
    }
    const children = n.children;
    if (Array.isArray(children)) {
      for (const c of children) visit(c);
    }
  }

  visit(root);
  return acc;
}

export function isMdastContentArray(v: unknown): v is Content[] {
  return Array.isArray(v);
}
