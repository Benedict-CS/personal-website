/**
 * Markdown callout / admonition (blockquote with a bold label line).
 */
export function buildCmsCalloutMarkdown(label = "Note", body = "Your message here."): string {
  const L = label.trim() || "Note";
  const B = body.trim() || "Your message here.";
  return `> **${L}**\n>\n> ${B}\n\n`;
}
