import React from "react";

/**
 * Extracts plain text from react-markdown's `pre > code` children for copy / line numbers.
 */
export function extractCodeTextFromPreChildren(children: React.ReactNode): string {
  if (children == null) return "";
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    return children.map((child) => extractFromNode(child)).join("");
  }
  return extractFromNode(children);
}

function extractFromNode(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractFromNode).join("");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode; className?: string };
    const inner = extractFromNode(props.children);
    const cls = typeof props.className === "string" ? props.className : "";
    /** Shiki wraps each line in <span class="line">; join with newlines for copy / line counts. */
    if (cls.split(/\s+/).includes("line")) {
      return `${inner}\n`;
    }
    return inner;
  }
  return "";
}
