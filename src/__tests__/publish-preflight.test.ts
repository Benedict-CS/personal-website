import {
  runPreflightChecks,
  verdictLabel,
  type PreflightInput,
} from "@/lib/publish-preflight";

const PERFECT_POST: PreflightInput = {
  title: "How to Build a High-Performance Blog with Next.js",
  slug: "build-high-performance-blog-nextjs",
  description: "A comprehensive guide to building a blazing-fast blog using Next.js App Router, Tailwind CSS, and Prisma for content management.",
  content: [
    "## Introduction",
    "",
    "Building a modern blog requires careful attention to performance, SEO, and developer experience. In this comprehensive guide, we explore the key architectural decisions that separate good blogs from great ones. We cover everything from project setup to deployment, with practical examples and real-world patterns.",
    "",
    "## Setting Up the Project",
    "",
    "Start by creating a new Next.js application with TypeScript and Tailwind CSS configured from the start. This foundation ensures type safety and rapid styling. The App Router provides a clean file-based routing system that scales well for content-heavy sites. Configure your project with ESLint and Prettier for consistent code quality across the team.",
    "",
    "![Project setup screenshot](setup.png)",
    "",
    "## Data Layer with Prisma",
    "",
    "Prisma provides an excellent ORM for managing blog content. Define your schema with Post, Tag, and Version models for a complete CMS. The Prisma Client generates type-safe queries that catch errors at compile time rather than runtime. Use migrations to evolve your schema safely as requirements change. Consider adding full-text search capabilities for better content discovery across your entire corpus of articles and notes.",
    "",
    "For more details, see the [Prisma documentation](https://prisma.io/docs) and our [getting started guide](/blog/getting-started).",
    "",
    "## Deployment and Performance",
    "",
    "Deploy to Vercel for zero-config hosting with edge caching. Use ISR (Incremental Static Regeneration) for optimal performance on content pages. Configure proper cache headers and content delivery strategies to minimize time to first byte. Implement image optimization with next/image for responsive, compressed images that load quickly on all devices and network conditions.",
    "",
    "## Conclusion",
    "",
    "A well-architected blog combines great developer experience with excellent user experience. Follow these patterns and best practices to ship a production-quality blog that performs well in search engines and delights your readers with fast load times and beautiful typography.",
  ].join("\n"),
  tags: "Next.js, Performance, Prisma, Tailwind CSS",
};

describe("runPreflightChecks", () => {
  it("returns 'ready' verdict for a perfect post", () => {
    const result = runPreflightChecks(PERFECT_POST);
    expect(result.verdict).toBe("ready");
    expect(result.failCount).toBe(0);
    expect(result.warnCount).toBe(0);
    expect(result.passCount).toBe(8);
  });

  it("returns 'blocked' when title is empty", () => {
    const result = runPreflightChecks({ ...PERFECT_POST, title: "" });
    expect(result.verdict).toBe("blocked");
    const titleCheck = result.checks.find((c) => c.id === "title");
    expect(titleCheck?.status).toBe("fail");
  });

  it("returns 'blocked' when slug is empty", () => {
    const result = runPreflightChecks({ ...PERFECT_POST, slug: "" });
    expect(result.verdict).toBe("blocked");
    const slugCheck = result.checks.find((c) => c.id === "slug");
    expect(slugCheck?.status).toBe("fail");
  });

  it("returns 'blocked' when content is empty", () => {
    const result = runPreflightChecks({ ...PERFECT_POST, content: "" });
    expect(result.verdict).toBe("blocked");
    const contentCheck = result.checks.find((c) => c.id === "content_length");
    expect(contentCheck?.status).toBe("fail");
  });

  it("warns on missing description", () => {
    const result = runPreflightChecks({ ...PERFECT_POST, description: "" });
    const descCheck = result.checks.find((c) => c.id === "description");
    expect(descCheck?.status).toBe("warn");
    expect(result.verdict).toBe("review");
  });

  it("warns on no tags", () => {
    const result = runPreflightChecks({ ...PERFECT_POST, tags: "" });
    const tagCheck = result.checks.find((c) => c.id === "tags");
    expect(tagCheck?.status).toBe("warn");
  });

  it("warns on very short title", () => {
    const result = runPreflightChecks({ ...PERFECT_POST, title: "Hi" });
    const titleCheck = result.checks.find((c) => c.id === "title");
    expect(titleCheck?.status).toBe("warn");
  });

  it("warns on uppercase slug", () => {
    const result = runPreflightChecks({ ...PERFECT_POST, slug: "My-Post-Slug" });
    const slugCheck = result.checks.find((c) => c.id === "slug");
    expect(slugCheck?.status).toBe("warn");
  });

  it("warns on thin content (50-199 words)", () => {
    const thinContent = Array.from({ length: 20 }, (_, i) => `This is sentence number ${i} providing some content.`).join(" ");
    const result = runPreflightChecks({
      ...PERFECT_POST,
      content: thinContent,
    });
    const contentCheck = result.checks.find((c) => c.id === "content_length");
    expect(contentCheck?.status).toBe("warn");
  });

  it("warns on missing headings in long posts", () => {
    const longParagraph = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} about testing content quality.`).join(" ");
    const result = runPreflightChecks({
      ...PERFECT_POST,
      content: longParagraph,
    });
    const headingCheck = result.checks.find((c) => c.id === "headings");
    expect(headingCheck?.status).toBe("warn");
  });

  it("passes headings check for short posts without headings", () => {
    const result = runPreflightChecks({
      ...PERFECT_POST,
      content: "A short note with a few sentences. This is fine without headings.",
    });
    const headingCheck = result.checks.find((c) => c.id === "headings");
    expect(headingCheck?.status).toBe("pass");
  });

  it("warns on no images in long posts", () => {
    const longContent = Array.from({ length: 80 }, (_, i) => `## Section ${i}\n\nContent paragraph ${i} about various topics.`).join("\n\n");
    const result = runPreflightChecks({ ...PERFECT_POST, content: longContent });
    const imageCheck = result.checks.find((c) => c.id === "images");
    expect(imageCheck?.status).toBe("warn");
  });

  it("always produces exactly 8 checks", () => {
    const result = runPreflightChecks(PERFECT_POST);
    expect(result.checks).toHaveLength(8);
    const empty = runPreflightChecks({ title: "", slug: "", description: "", content: "", tags: "" });
    expect(empty.checks).toHaveLength(8);
  });

  it("pass + warn + fail counts sum to total checks", () => {
    const result = runPreflightChecks({ ...PERFECT_POST, description: "", tags: "" });
    expect(result.passCount + result.warnCount + result.failCount).toBe(8);
  });

  it("handles excessive tags", () => {
    const result = runPreflightChecks({
      ...PERFECT_POST,
      tags: Array.from({ length: 12 }, (_, i) => `Tag${i}`).join(", "),
    });
    const tagCheck = result.checks.find((c) => c.id === "tags");
    expect(tagCheck?.status).toBe("warn");
  });
});

describe("verdictLabel", () => {
  it("returns correct labels", () => {
    expect(verdictLabel("ready")).toBe("Ready to publish");
    expect(verdictLabel("review")).toBe("Review recommended");
    expect(verdictLabel("blocked")).toBe("Issues must be fixed");
  });
});
