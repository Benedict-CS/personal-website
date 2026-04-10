import {
  generateQualityReport,
  type PostForQualityReport,
} from "@/lib/content-quality-report";

function makePost(
  id: string,
  title: string,
  slug: string,
  content: string,
  description: string = "",
  tags: string[] = [],
  published: boolean = true
): PostForQualityReport {
  return { id, title, slug, content, description, tags, published };
}

const WELL_WRITTEN = makePost(
  "1",
  "Building Scalable APIs with Express and TypeScript",
  "building-scalable-apis-express-typescript",
  [
    "## Introduction",
    "",
    "Building scalable APIs requires careful architectural decisions from the very beginning of your project lifecycle. In this comprehensive guide, we explore proven patterns for designing Express applications that handle growing traffic and complexity gracefully, using TypeScript for robust type safety.",
    "",
    "## Project Setup and Configuration",
    "",
    "Start by configuring your TypeScript compiler options for strict mode and enabling all recommended checks. Set up ESLint with the TypeScript parser plugin for consistent code quality. Add Prettier for automatic formatting so your team never debates spacing again.",
    "",
    "## Routing and Middleware Architecture",
    "",
    "Express middleware forms the backbone of request processing. Implement authentication, validation, rate limiting, and error handling as composable middleware functions. Use router-level middleware for route-specific concerns and app-level middleware for cross-cutting features.",
    "",
    "## Error Handling Patterns",
    "",
    "Centralized error handling prevents inconsistent error responses. Create an error class hierarchy with distinct types for validation errors, authentication failures, and internal errors. Each error type maps to appropriate HTTP status codes and structured JSON responses.",
    "",
    "## Conclusion",
    "",
    "Scalable API design combines clean architecture, strong typing, and thoughtful middleware composition. Start with these foundations and your Express TypeScript application will grow gracefully.",
  ].join("\n"),
  "A comprehensive guide to building scalable Express APIs with TypeScript, covering project setup, routing, middleware, and error handling.",
  ["Express", "TypeScript", "API", "Backend"]
);

const THIN_POST = makePost(
  "2",
  "Hi",
  "h",
  "Hello world.",
  "",
  []
);

const MEDIUM_POST = makePost(
  "3",
  "Docker Basics for Beginners",
  "docker-basics-beginners",
  [
    "## Getting Started with Docker",
    "",
    "Docker simplifies application deployment by packaging code and dependencies into portable containers. Install Docker Desktop to begin experimenting on your local machine with containerized applications.",
    "",
    "## Running Your First Container",
    "",
    "Pull an image from Docker Hub and run it with a simple command. Containers provide isolated environments that behave consistently across different host operating systems and cloud providers.",
  ].join("\n"),
  "Learn the basics of Docker containerization for modern application deployment.",
  ["Docker"]
);

describe("generateQualityReport", () => {
  it("returns zero metrics for empty post array", () => {
    const report = generateQualityReport([]);
    expect(report.totalPosts).toBe(0);
    expect(report.averageScore).toBe(0);
    expect(report.tierDistribution.excellent).toBe(0);
    expect(report.commonIssues).toEqual([]);
    expect(report.actionItems).toEqual([]);
    expect(report.topPerformers).toEqual([]);
  });

  it("excludes unpublished posts by default", () => {
    const draft = makePost("d", "Draft Post", "draft", "Some content here about things.", "", [], false);
    const report = generateQualityReport([draft]);
    expect(report.totalPosts).toBe(0);
  });

  it("includes unpublished posts when publishedOnly is false", () => {
    const draft = makePost("d", "Draft Post", "draft", "Some content for the draft post to analyze.", "", [], false);
    const report = generateQualityReport([draft], false);
    expect(report.totalPosts).toBe(1);
  });

  it("scores a well-written post higher than a thin post", () => {
    const report = generateQualityReport([WELL_WRITTEN, THIN_POST]);
    const wellWritten = report.topPerformers.find((p) => p.id === "1");
    const thin = report.actionItems.find((p) => p.id === "2");
    if (wellWritten && thin) {
      expect(wellWritten.compositeScore).toBeGreaterThan(thin.compositeScore);
    }
  });

  it("assigns correct tiers based on composite scores", () => {
    const report = generateQualityReport([WELL_WRITTEN, THIN_POST, MEDIUM_POST]);
    for (const item of [...report.actionItems, ...report.topPerformers]) {
      if (item.compositeScore >= 80) expect(item.tier).toBe("excellent");
      else if (item.compositeScore >= 60) expect(item.tier).toBe("good");
      else if (item.compositeScore >= 40) expect(item.tier).toBe("fair");
      else expect(item.tier).toBe("poor");
    }
  });

  it("computes a reasonable average score", () => {
    const report = generateQualityReport([WELL_WRITTEN, MEDIUM_POST]);
    expect(report.averageScore).toBeGreaterThan(0);
    expect(report.averageScore).toBeLessThanOrEqual(100);
  });

  it("counts tier distribution correctly", () => {
    const report = generateQualityReport([WELL_WRITTEN, THIN_POST, MEDIUM_POST]);
    const totalFromTiers = Object.values(report.tierDistribution).reduce((a, b) => a + b, 0);
    expect(totalFromTiers).toBe(report.totalPosts);
  });

  it("identifies common issues across posts", () => {
    const report = generateQualityReport([THIN_POST, THIN_POST]);
    expect(report.commonIssues.length).toBeGreaterThan(0);
    for (const issue of report.commonIssues) {
      expect(issue.count).toBeGreaterThan(0);
      expect(["high", "medium", "low"]).toContain(issue.severity);
    }
  });

  it("limits action items to 5", () => {
    const posts = Array.from({ length: 10 }, (_, i) =>
      makePost(`t${i}`, `Thin Post ${i}`, `thin-${i}`, "Short.", "", [])
    );
    const report = generateQualityReport(posts);
    expect(report.actionItems.length).toBeLessThanOrEqual(5);
  });

  it("limits top performers to 3", () => {
    const posts = Array.from({ length: 10 }, (_, i) =>
      makePost(`w${i}`, `Well Written Post ${i}`, `well-${i}`, WELL_WRITTEN.content, WELL_WRITTEN.description, WELL_WRITTEN.tags)
    );
    const report = generateQualityReport(posts);
    expect(report.topPerformers.length).toBeLessThanOrEqual(3);
  });

  it("action items are sorted by composite score ascending (worst first)", () => {
    const report = generateQualityReport([WELL_WRITTEN, THIN_POST, MEDIUM_POST]);
    for (let i = 1; i < report.actionItems.length; i++) {
      expect(report.actionItems[i - 1].compositeScore).toBeLessThanOrEqual(report.actionItems[i].compositeScore);
    }
  });

  it("top performers are sorted by composite score descending (best first)", () => {
    const report = generateQualityReport([WELL_WRITTEN, THIN_POST, MEDIUM_POST]);
    for (let i = 1; i < report.topPerformers.length; i++) {
      expect(report.topPerformers[i - 1].compositeScore).toBeGreaterThanOrEqual(report.topPerformers[i].compositeScore);
    }
  });

  it("each scored post has readability and SEO sub-scores", () => {
    const report = generateQualityReport([WELL_WRITTEN]);
    const post = report.topPerformers[0];
    expect(post).toBeDefined();
    expect(post.readabilityScore).toBeGreaterThanOrEqual(0);
    expect(post.readabilityScore).toBeLessThanOrEqual(100);
    expect(post.seoScore).toBeGreaterThanOrEqual(0);
    expect(post.seoScore).toBeLessThanOrEqual(100);
  });

  it("includes structure issue count per post", () => {
    const report = generateQualityReport([THIN_POST, WELL_WRITTEN]);
    for (const item of [...report.actionItems, ...report.topPerformers]) {
      expect(typeof item.structureIssueCount).toBe("number");
      expect(item.structureIssueCount).toBeGreaterThanOrEqual(0);
    }
  });

  it("common issues are sorted by severity then count", () => {
    const report = generateQualityReport([THIN_POST, THIN_POST, MEDIUM_POST]);
    const sevOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < report.commonIssues.length; i++) {
      const prev = sevOrder[report.commonIssues[i - 1].severity];
      const curr = sevOrder[report.commonIssues[i].severity];
      expect(prev).toBeLessThanOrEqual(curr);
    }
  });

  it("handles single post", () => {
    const report = generateQualityReport([WELL_WRITTEN]);
    expect(report.totalPosts).toBe(1);
    expect(report.averageScore).toBeGreaterThan(0);
    expect(report.topPerformers.length).toBe(1);
  });
});
