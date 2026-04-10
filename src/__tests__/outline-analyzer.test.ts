import {
  extractOutline,
  findOutlineIssues,
  analyzeOutline,
} from "@/lib/outline-analyzer";

describe("extractOutline", () => {
  it("returns empty array for content with no headings", () => {
    expect(extractOutline("Just plain text here.")).toEqual([]);
  });

  it("extracts a single heading", () => {
    const headings = extractOutline("## Getting Started\n\nSome content follows.");
    expect(headings).toHaveLength(1);
    expect(headings[0].level).toBe(2);
    expect(headings[0].text).toBe("Getting Started");
    expect(headings[0].line).toBe(0);
  });

  it("extracts multiple heading levels", () => {
    const md = "# Title\n\nIntro.\n\n## Section A\n\nContent A.\n\n### Subsection A1\n\nDetail.";
    const headings = extractOutline(md);
    expect(headings).toHaveLength(3);
    expect(headings.map((h) => h.level)).toEqual([1, 2, 3]);
  });

  it("computes per-section word counts", () => {
    const md = "## Short\n\nTwo words.\n\n## Long\n\nThis section has many more words than the previous one to test counting.";
    const headings = extractOutline(md);
    expect(headings[0].wordCount).toBeLessThan(headings[1].wordCount);
  });

  it("ignores headings inside code blocks", () => {
    const md = "## Real Heading\n\nContent.\n\n```\n## Not A Heading\n```\n\nMore content.";
    const headings = extractOutline(md);
    expect(headings).toHaveLength(1);
    expect(headings[0].text).toBe("Real Heading");
  });

  it("handles empty content", () => {
    expect(extractOutline("")).toEqual([]);
  });

  it("strips markdown from section word counts", () => {
    const md = "## Test\n\n**Bold** text with [link](url) and `code` here.";
    const headings = extractOutline(md);
    expect(headings[0].wordCount).toBeGreaterThan(0);
  });
});

describe("findOutlineIssues", () => {
  it("returns no issues for well-structured content", () => {
    const headings = [
      { level: 2, text: "Section A", line: 0, wordCount: 150 },
      { level: 3, text: "Subsection A1", line: 5, wordCount: 100 },
      { level: 2, text: "Section B", line: 10, wordCount: 200 },
    ];
    const issues = findOutlineIssues(headings, 450);
    expect(issues).toHaveLength(0);
  });

  it("flags skipped heading levels", () => {
    const headings = [
      { level: 2, text: "Section", line: 0, wordCount: 100 },
      { level: 4, text: "Deep", line: 5, wordCount: 50 },
    ];
    const issues = findOutlineIssues(headings, 150);
    expect(issues.some((i) => i.type === "skipped_level")).toBe(true);
  });

  it("flags multiple H1 headings", () => {
    const headings = [
      { level: 1, text: "Title One", line: 0, wordCount: 100 },
      { level: 1, text: "Title Two", line: 5, wordCount: 100 },
    ];
    const issues = findOutlineIssues(headings, 200);
    expect(issues.some((i) => i.type === "multiple_h1")).toBe(true);
  });

  it("flags no headings in long posts", () => {
    const issues = findOutlineIssues([], 500);
    expect(issues.some((i) => i.type === "no_headings")).toBe(true);
  });

  it("does not flag no headings in short posts", () => {
    const issues = findOutlineIssues([], 50);
    expect(issues).toHaveLength(0);
  });

  it("flags long sections over 800 words", () => {
    const headings = [
      { level: 2, text: "Big Section", line: 0, wordCount: 900 },
    ];
    const issues = findOutlineIssues(headings, 900);
    expect(issues.some((i) => i.type === "long_section")).toBe(true);
  });

  it("flags short sections under 30 words", () => {
    const headings = [
      { level: 2, text: "Tiny", line: 0, wordCount: 10 },
    ];
    const issues = findOutlineIssues(headings, 10);
    expect(issues.some((i) => i.type === "short_section")).toBe(true);
  });

  it("flags deep nesting at H5+", () => {
    const headings = [
      { level: 2, text: "A", line: 0, wordCount: 50 },
      { level: 3, text: "B", line: 2, wordCount: 50 },
      { level: 4, text: "C", line: 4, wordCount: 50 },
      { level: 5, text: "D", line: 6, wordCount: 50 },
    ];
    const issues = findOutlineIssues(headings, 200);
    expect(issues.some((i) => i.type === "deep_nesting")).toBe(true);
  });

  it("does not flag normal depth (H1-H3)", () => {
    const headings = [
      { level: 1, text: "Title", line: 0, wordCount: 100 },
      { level: 2, text: "Section", line: 3, wordCount: 100 },
      { level: 3, text: "Sub", line: 6, wordCount: 100 },
    ];
    const issues = findOutlineIssues(headings, 300);
    expect(issues.some((i) => i.type === "deep_nesting")).toBe(false);
  });
});

describe("analyzeOutline", () => {
  it("returns full analysis for a structured post", () => {
    const md = [
      "## Introduction",
      "",
      "This post covers building APIs with Express and Node.js for modern web applications. We explore the full lifecycle from project setup through deployment, including routing, middleware, error handling, authentication patterns, and testing strategies that professional teams use in production environments every day.",
      "",
      "## Setting Up",
      "",
      "Install Node.js and create a new project with npm init for the API server. Configure your package.json with the right scripts for development and production. Set up ESLint and Prettier for code quality, and add TypeScript for type safety across all your route handlers and middleware functions.",
      "",
      "### Dependencies",
      "",
      "Add Express, cors, and dotenv as project dependencies using npm install. You will also want helmet for security headers, morgan for request logging, and compression for response optimization. These form the standard middleware stack for any serious Express API.",
      "",
      "## Conclusion",
      "",
      "Express makes it straightforward to build robust and scalable REST APIs. Combined with TypeScript and proper middleware patterns, you can create production-grade services that handle authentication, validation, error recovery, and graceful shutdown. Start with these foundations and expand from there.",
    ].join("\n");
    const analysis = analyzeOutline(md);
    expect(analysis.headings).toHaveLength(4);
    expect(analysis.totalSections).toBe(4);
    expect(analysis.maxDepth).toBe(3);
    expect(analysis.documentWordCount).toBeGreaterThan(0);
    expect(analysis.issues).toHaveLength(0);
  });

  it("returns issues for poorly structured content", () => {
    const md = "# Title\n\n# Second Title\n\n#### Deep without H2/H3\n\nShort.";
    const analysis = analyzeOutline(md);
    expect(analysis.issues.length).toBeGreaterThan(0);
    expect(analysis.issues.some((i) => i.type === "multiple_h1")).toBe(true);
    expect(analysis.issues.some((i) => i.type === "skipped_level")).toBe(true);
  });

  it("handles empty content gracefully", () => {
    const analysis = analyzeOutline("");
    expect(analysis.headings).toEqual([]);
    expect(analysis.issues).toEqual([]);
    expect(analysis.totalSections).toBe(0);
    expect(analysis.maxDepth).toBe(0);
    expect(analysis.documentWordCount).toBe(0);
  });

  it("tracks maxDepth correctly", () => {
    const md = "## L2\n\nText.\n\n### L3\n\nText.\n\n#### L4\n\nText.";
    const analysis = analyzeOutline(md);
    expect(analysis.maxDepth).toBe(4);
  });
});
