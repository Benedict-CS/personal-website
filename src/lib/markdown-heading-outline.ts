export type MarkdownHeadingOutlineItem = {
  depth: number;
  text: string;
  line: number;
};

/**
 * Extract markdown heading outline from raw source for editor navigation.
 */
export function extractMarkdownHeadingOutline(markdown: string): MarkdownHeadingOutlineItem[] {
  if (!markdown.trim()) return [];
  const lines = markdown.split("\n");
  const items: MarkdownHeadingOutlineItem[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const text = match[2].trim();
    if (!text) continue;
    items.push({
      depth: match[1].length,
      text,
      line: i + 1,
    });
  }
  return items;
}
