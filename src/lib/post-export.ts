/**
 * Post Markdown export engine.
 *
 * Converts post editor state into a clean `.md` file with YAML
 * frontmatter — suitable for backup, migration, or publishing
 * to static site generators (Hugo, Jekyll, Astro, etc.).
 */

export interface PostExportInput {
  title: string;
  slug: string;
  description?: string;
  tags?: string;
  published?: boolean;
  pinned?: boolean;
  category?: string;
  publishedDate?: string;
  content: string;
}

function escapeYamlString(value: string): string {
  if (!value) return '""';
  if (/[:#{}[\],&*?|>!%@`]/.test(value) || value.includes("\n") || value.startsWith('"') || value.startsWith("'")) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return `"${value}"`;
}

function formatTagsList(tagsStr: string): string[] {
  return tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Generate the YAML frontmatter block for a post.
 * Returns the full `---` delimited frontmatter string (without trailing newline).
 */
export function buildFrontmatter(input: PostExportInput): string {
  const lines: string[] = ["---"];

  lines.push(`title: ${escapeYamlString(input.title)}`);
  lines.push(`slug: ${escapeYamlString(input.slug)}`);

  if (input.description) {
    lines.push(`description: ${escapeYamlString(input.description)}`);
  }

  if (input.tags) {
    const tags = formatTagsList(input.tags);
    if (tags.length > 0) {
      lines.push(`tags:`);
      for (const tag of tags) {
        lines.push(`  - ${escapeYamlString(tag)}`);
      }
    }
  }

  if (input.publishedDate) {
    lines.push(`date: ${escapeYamlString(input.publishedDate)}`);
  }

  lines.push(`published: ${input.published ? "true" : "false"}`);

  if (input.pinned) {
    lines.push(`pinned: true`);
  }

  if (input.category) {
    lines.push(`category: ${escapeYamlString(input.category)}`);
  }

  lines.push("---");
  return lines.join("\n");
}

/**
 * Convert a post into a complete Markdown document with YAML frontmatter.
 */
export function exportPostAsMarkdown(input: PostExportInput): string {
  const frontmatter = buildFrontmatter(input);
  const content = (input.content || "").trimEnd();
  return `${frontmatter}\n\n${content}\n`;
}

/**
 * Generate a safe filename for the exported Markdown file.
 */
export function exportFilename(slug: string): string {
  const safe = (slug || "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${safe || "untitled"}.md`;
}

/**
 * Trigger a browser file download with the given content and filename.
 */
export function downloadMarkdownFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
