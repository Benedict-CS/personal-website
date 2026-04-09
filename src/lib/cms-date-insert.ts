/**
 * Markdown snippet for “published / updated today” lines in the post editor.
 */
export function buildCmsDateInsertMarkdown(date = new Date()): string {
  const long = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const iso = date.toISOString().slice(0, 10);
  return `**${long}** (\`${iso}\`)\n\n`;
}
