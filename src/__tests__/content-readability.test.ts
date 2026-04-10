import {
  analyzeContentReadability,
  extractReadabilitySignals,
} from "@/lib/content-readability";

describe("extractReadabilitySignals", () => {
  it("returns zero signals for empty content", () => {
    const s = extractReadabilitySignals("");
    expect(s.wordCount).toBe(0);
    expect(s.sentenceCount).toBe(0);
    expect(s.paragraphCount).toBe(0);
    expect(s.headingCount).toBe(0);
    expect(s.imageCount).toBe(0);
    expect(s.linkCount).toBe(0);
    expect(s.codeBlockCount).toBe(0);
    expect(s.listCount).toBe(0);
  });

  it("counts words excluding markdown syntax", () => {
    const s = extractReadabilitySignals("Hello **bold** world. [link](http://x.com)");
    expect(s.wordCount).toBeGreaterThanOrEqual(3);
  });

  it("counts headings at different levels", () => {
    const md = "## Heading 2\n\nSome text.\n\n### Heading 3\n\nMore text.";
    const s = extractReadabilitySignals(md);
    expect(s.headingCount).toBe(2);
    expect(s.h2Count).toBe(1);
    expect(s.h3Count).toBe(1);
  });

  it("counts images and links separately", () => {
    const md = "![alt](img.png) and [label](url.com) and ![second](b.jpg)";
    const s = extractReadabilitySignals(md);
    expect(s.imageCount).toBe(2);
    expect(s.linkCount).toBe(1);
  });

  it("counts fenced code blocks", () => {
    const md = "Text before\n\n```js\nconst x = 1;\n```\n\nMiddle\n\n```python\nprint(1)\n```\n";
    const s = extractReadabilitySignals(md);
    expect(s.codeBlockCount).toBe(2);
  });

  it("counts list items", () => {
    const md = "- first\n- second\n- third\n\n1. one\n2. two";
    const s = extractReadabilitySignals(md);
    expect(s.listCount).toBe(5);
  });
});

describe("analyzeContentReadability", () => {
  it("returns low score for empty content", () => {
    const result = analyzeContentReadability("");
    expect(result.score).toBeLessThan(40);
    expect(result.grade).toBe("Needs work");
  });

  it("returns moderate score for minimal content", () => {
    const md = "## Introduction\n\nThis is a short blog post about testing.\n\nIt has a few sentences but not much depth.";
    const result = analyzeContentReadability(md);
    expect(result.score).toBeGreaterThan(20);
    expect(result.breakdown.structure).toBeGreaterThan(0);
    expect(result.breakdown.readability).toBeGreaterThan(0);
  });

  it("returns high score for well-structured content", () => {
    const md = [
      "## Getting Started",
      "",
      "This guide walks through the fundamentals of building a blog with Next.js. We cover routing, data fetching, and deployment strategies that scale.",
      "",
      "### Prerequisites",
      "",
      "Before you begin, make sure you have Node.js installed. You will also need a basic understanding of React concepts and component composition patterns.",
      "",
      "- Node.js 18 or later",
      "- npm or yarn package manager",
      "- A code editor like VS Code",
      "",
      "## Setting Up the Project",
      "",
      "Start by creating a new Next.js application. The create-next-app tool provides an excellent starting point with sensible defaults for TypeScript and Tailwind CSS.",
      "",
      "```bash",
      "npx create-next-app@latest my-blog",
      "```",
      "",
      "### Project Structure",
      "",
      "The generated project includes several important directories. The app directory contains your routes, and the public directory stores static assets like images and fonts.",
      "",
      "![Project structure](structure.png)",
      "",
      "## Data Fetching",
      "",
      "Next.js supports multiple data fetching strategies. Server components can fetch data directly, while client components use hooks. See the [official docs](https://nextjs.org/docs) for details.",
      "",
      "### Static Generation",
      "",
      "For blog posts that don't change often, static generation provides the best performance. Pages are built at compile time and served from the CDN edge.",
      "",
      "### Server-Side Rendering",
      "",
      "Dynamic content that changes per request benefits from server-side rendering. This ensures freshness at the cost of slightly longer response times per request.",
      "",
      "## Deployment",
      "",
      "Deploying to production is straightforward with platforms like Vercel. Push your code to a Git repository and connect it to the platform for automatic builds.",
      "",
      "![Deployment flow](deploy.png)",
      "",
      "For more advanced setups, consult the [deployment guide](https://nextjs.org/docs/deployment) and the [Vercel documentation](https://vercel.com/docs).",
    ].join("\n");

    const result = analyzeContentReadability(md);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.grade === "Good" || result.grade === "Excellent").toBe(true);
    expect(result.signals.h2Count).toBeGreaterThanOrEqual(3);
    expect(result.signals.imageCount).toBeGreaterThanOrEqual(2);
    expect(result.signals.codeBlockCount).toBeGreaterThanOrEqual(1);
    expect(result.signals.linkCount).toBeGreaterThanOrEqual(2);
  });

  it("suggests adding headings for long unstructured content", () => {
    const words = Array.from({ length: 200 }, (_, i) => `word${i}`).join(" ");
    const md = `${words}. ${words}.`;
    const result = analyzeContentReadability(md);
    expect(result.suggestions.some((s) => s.signal === "headings")).toBe(true);
  });

  it("suggests adding images for text-only content", () => {
    const paragraph = Array.from({ length: 80 }, (_, i) => `Word number ${i} extends the overall document length.`).join(" ");
    const md = `## Section One\n\n${paragraph}`;
    const result = analyzeContentReadability(md);
    expect(result.signals.wordCount).toBeGreaterThan(200);
    expect(result.suggestions.some((s) => s.signal === "images")).toBe(true);
  });

  it("score is always between 0 and 100", () => {
    const cases = [
      "",
      "Hello.",
      "## Title\n\nParagraph one.\n\n## Title 2\n\nParagraph two with more words.",
      Array.from({ length: 1000 }, () => "word").join(" "),
    ];
    for (const md of cases) {
      const result = analyzeContentReadability(md);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });

  it("breakdown components are each between 0 and 100", () => {
    const md = "## Test\n\nSome content here. Another sentence follows.";
    const { breakdown } = analyzeContentReadability(md);
    for (const key of ["structure", "readability", "richness"] as const) {
      expect(breakdown[key]).toBeGreaterThanOrEqual(0);
      expect(breakdown[key]).toBeLessThanOrEqual(100);
    }
  });
});
