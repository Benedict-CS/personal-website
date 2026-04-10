import {
  buildFrontmatter,
  exportPostAsMarkdown,
  exportFilename,
  type PostExportInput,
} from "@/lib/post-export";

const FULL_POST: PostExportInput = {
  title: "Building a Blog with Next.js",
  slug: "building-blog-nextjs",
  description: "A step-by-step guide to creating a modern blog.",
  tags: "Next.js, React, TypeScript",
  published: true,
  pinned: false,
  category: "Tutorials",
  publishedDate: "2026-04-10",
  content: "# Hello World\n\nThis is my blog post.\n\n## Section Two\n\nMore content here.",
};

describe("buildFrontmatter", () => {
  it("includes all fields for a complete post", () => {
    const fm = buildFrontmatter(FULL_POST);
    expect(fm).toMatch(/^---\n/);
    expect(fm).toMatch(/\n---$/);
    expect(fm).toContain('title: "Building a Blog with Next.js"');
    expect(fm).toContain('slug: "building-blog-nextjs"');
    expect(fm).toContain('description: "A step-by-step guide');
    expect(fm).toContain("published: true");
    expect(fm).toContain('date: "2026-04-10"');
    expect(fm).toContain('category: "Tutorials"');
  });

  it("formats tags as a YAML list", () => {
    const fm = buildFrontmatter(FULL_POST);
    expect(fm).toContain("tags:");
    expect(fm).toContain('  - "Next.js"');
    expect(fm).toContain('  - "React"');
    expect(fm).toContain('  - "TypeScript"');
  });

  it("omits optional fields when absent", () => {
    const fm = buildFrontmatter({ title: "Minimal", slug: "minimal", content: "x" });
    expect(fm).not.toContain("description:");
    expect(fm).not.toContain("tags:");
    expect(fm).not.toContain("date:");
    expect(fm).not.toContain("category:");
    expect(fm).not.toContain("pinned:");
    expect(fm).toContain("published: false");
  });

  it("includes pinned only when true", () => {
    const fm = buildFrontmatter({ ...FULL_POST, pinned: true });
    expect(fm).toContain("pinned: true");

    const fm2 = buildFrontmatter({ ...FULL_POST, pinned: false });
    expect(fm2).not.toContain("pinned:");
  });

  it("escapes special YAML characters in title", () => {
    const fm = buildFrontmatter({ title: 'Title with "quotes" & colons:', slug: "s", content: "" });
    expect(fm).toContain('title: "Title with \\"quotes\\" & colons:"');
  });

  it("handles empty tags string", () => {
    const fm = buildFrontmatter({ title: "T", slug: "s", tags: "", content: "" });
    expect(fm).not.toContain("tags:");
  });

  it("handles whitespace-only tags", () => {
    const fm = buildFrontmatter({ title: "T", slug: "s", tags: " , , ", content: "" });
    expect(fm).not.toContain("tags:");
  });
});

describe("exportPostAsMarkdown", () => {
  it("produces frontmatter followed by content", () => {
    const md = exportPostAsMarkdown(FULL_POST);
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("---\n\n# Hello World");
    expect(md.endsWith("More content here.\n")).toBe(true);
  });

  it("handles empty content gracefully", () => {
    const md = exportPostAsMarkdown({ title: "Empty", slug: "empty", content: "" });
    expect(md).toContain("---\n\n\n");
  });

  it("trims trailing whitespace from content", () => {
    const md = exportPostAsMarkdown({ title: "T", slug: "s", content: "Hello   \n\n  " });
    expect(md.endsWith("Hello\n")).toBe(true);
  });

  it("produces valid structure: frontmatter + double newline + content + trailing newline", () => {
    const md = exportPostAsMarkdown(FULL_POST);
    const parts = md.split("---");
    expect(parts.length).toBe(3);
    expect(parts[2].startsWith("\n\n")).toBe(true);
    expect(md.endsWith("\n")).toBe(true);
  });
});

describe("exportFilename", () => {
  it("generates .md filename from slug", () => {
    expect(exportFilename("my-blog-post")).toBe("my-blog-post.md");
  });

  it("sanitizes special characters", () => {
    expect(exportFilename("My Post!@#$")).toBe("my-post.md");
  });

  it("handles empty slug", () => {
    expect(exportFilename("")).toBe("untitled.md");
  });

  it("collapses multiple hyphens", () => {
    expect(exportFilename("a---b---c")).toBe("a-b-c.md");
  });

  it("strips leading/trailing hyphens after sanitization", () => {
    expect(exportFilename("-hello-world-")).toBe("hello-world.md");
  });
});
